import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { proximaHora, getSlotsDisponiveis } from "@/lib/utils/slots";
import { notify } from "@/lib/notifications/notify";
import { sincronizarAgenda } from "@/lib/calendar";
import { criarCobrancaAgendamento } from "@/lib/billing/charges";

import { z } from "zod";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  const desdeStr = searchParams.get("desde");
  const desde = desdeStr ? new Date(desdeStr) : new Date();

  const agendamentos = await prisma.appointment.findMany({
    where: { data: { gte: desde } },
    select: {
      id: true,
      data: true,
      horarioInicio: true,
      slots: true,
      status: true,
      servicos: { select: { servicoId: true } },
    },
    orderBy: [{ data: "asc" }, { horarioInicio: "asc" }],
    skip,
    take: limit,
  });
  return NextResponse.json(agendamentos);
}

const AgendamentoSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório"),
  telefone: z.string().min(10, "Telefone inválido"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  horario: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  formaPagamento: z.enum(["pix", "cartao", "local", "mensalista"]),
  servicoIds: z.array(z.string()).min(1, "Selecione ao menos um serviço"),
});

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parseResult = AgendamentoSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Dados inválidos." },
      { status: 400 }
    );
  }

  const { nome, telefone, data, horario, horarioFim, formaPagamento, servicoIds } =
    parseResult.data;

  // Busca os serviços para travar o preço no momento do agendamento
  const servicos = await prisma.service.findMany({
    where: { id: { in: servicoIds }, ativo: true },
  });
  if (servicos.length !== servicoIds.length) {
    return NextResponse.json(
      { error: "Algum serviço selecionado é inválido." },
      { status: 400 }
    );
  }

  // Quantos slots o agendamento ocupa (coloração = 2)
  const slotsNecessarios = Math.max(
    1,
    ...servicos.map((s) => s.slotsNecessarios)
  );
  const horariosNecessarios =
    slotsNecessarios >= 2 ? [horario, proximaHora(horario)] : [horario];

  // Se o cliente mandou o 2º horário, ele tem que ser o seguinte ao início
  if (slotsNecessarios >= 2 && horarioFim && horarioFim !== proximaHora(horario)) {
    return NextResponse.json(
      { error: "Os 2 horários precisam ser seguidos." },
      { status: 400 }
    );
  }

  // Todos os horários necessários ainda livres? (respeita expediente e ocupação)
  const livres = await getSlotsDisponiveis(data);
  const conflito = horariosNecessarios.some((h) => !livres.includes(h));
  if (conflito) {
    return NextResponse.json(
      {
        error:
          slotsNecessarios >= 2
            ? "Esse serviço precisa de 2 horários seguidos livres. Escolha outro."
            : "Esse horário acabou de ser preenchido. Escolha outro.",
      },
      { status: 409 }
    );
  }

  const ehMensalista = formaPagamento === "mensalista";
  const formaFinal = ehMensalista ? "local" : formaPagamento;
  const valorTotal = servicos.reduce(
    (acc: number, s) => acc + Number(s.preco),
    0
  );

  const online = formaFinal === "pix" || formaFinal === "cartao";

  try {
    // ─── Pagamento online (pix/cartão): NÃO marca o horário agora ───────────
    // Cria o cliente + cobrança guardando a reserva. O agendamento nasce só
    // quando o pagamento confirma (confirmarAgendamentoCharge). Evita segurar
    // horário de quem desiste no checkout.
    if (online) {
      const cliente = await prisma.client.upsert({
        where: { telefone },
        update: { nome },
        create: { nome, telefone },
        select: { id: true, bloqueado: true },
      });
      if (cliente.bloqueado) throw new Error("BLOQUEADO");

      const cobrancaAberta = await prisma.subscriptionCharge.findFirst({
        where: {
          clienteId: cliente.id,
          tipo: "mensalista",
          status: { in: ["pendente", "vencido"] },
        },
        select: { id: true },
      });
      if (cobrancaAberta) throw new Error("COBRANCA_PENDENTE");

      const charge = await criarCobrancaAgendamento(
        cliente.id,
        valorTotal,
        servicos.map((s) => s.nome).join(", "),
        {
          servicos: servicos.map((s) => ({ servicoId: s.id, preco: Number(s.preco) })),
          data,
          horario,
          horarioFim: slotsNecessarios >= 2 ? proximaHora(horario) : null,
          slots: slotsNecessarios,
        }
      );

      return NextResponse.json({ chargeId: charge.id, valor: valorTotal }, { status: 201 });
    }

    // ─── Local / mensalista: marca o horário na hora (sem pagamento online) ──
    const agendamento = await prisma.$transaction(async (tx) => {
      // Re-verifica disponibilidade atomicamente (previne double-booking simultâneo).
      const ocupado = await tx.appointment.findFirst({
        where: {
          data: new Date(data),
          horarioInicio: { in: horariosNecessarios },
          status: { notIn: ["cancelado"] },
        },
        select: { id: true },
      });
      if (ocupado) {
        throw new Error(slotsNecessarios >= 2 ? "CONFLITO_2_SLOTS" : "CONFLITO_SLOT");
      }

      // Cria ou reaproveita o cliente pelo telefone
      const cliente = await tx.client.upsert({
        where: { telefone },
        update: { nome },
        create: { nome, telefone },
        include: { mensalidade: true },
      });

      if (cliente.bloqueado) {
        // Marcador pra distinguir no catch e responder 403 com { bloqueado: true }.
        throw new Error("BLOQUEADO");
      }

      // Cobrança em aberto (pendente/vencido) trava novos agendamentos:
      // o cliente precisa quitar a mensalidade antes de marcar de novo.
      const cobrancaAberta = await tx.subscriptionCharge.findFirst({
        where: {
          clienteId: cliente.id,
          tipo: "mensalista",
          status: { in: ["pendente", "vencido"] },
        },
        select: { id: true },
      });
      if (cobrancaAberta) {
        throw new Error("COBRANCA_PENDENTE");
      }

      // Mensalista: só aceita se o cliente tiver assinatura ativa
      if (ehMensalista) {
        if (!cliente.mensalidade || cliente.mensalidade.status !== "ativo") {
          throw new Error("Você não está cadastrado como mensalista. Escolha outra forma de pagamento.");
        }
      }

      const novo = await tx.appointment.create({
        data: {
          clienteId: cliente.id,
          data: new Date(data),
          horarioInicio: horario,
          slots: slotsNecessarios,
          formaPagamento: formaFinal,
          valorTotal,
          servicos: {
            create: servicos.map((s) => ({
              servicoId: s.id,
              precoNaHora: s.preco,
            })),
          },
        },
      });

      return novo;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Invalida o cache de slots da data agendada
    revalidateTag(`slots-${data}`, {});

    // Notifica cliente (confirmação) + admin (novo agendamento). Best-effort.
    void notify({
      type: "agendamento_confirmado",
      appointmentId: agendamento.id,
    });

    // Sincroniza com agendas nativas (admin + cliente). No-op enquanto não houver
    // provider de API habilitado — a arquitetura já fica pronta para ativar depois.
    void sincronizarAgenda(agendamento.id, ["admin", "cliente"]);

    // Código curto para o ticket
    const codigo = agendamento.id.slice(0, 8).toUpperCase();

    return NextResponse.json({ id: agendamento.id, codigo }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "CONFLITO_SLOT") {
      return NextResponse.json(
        { error: "Esse horário acabou de ser preenchido. Escolha outro." },
        { status: 409 }
      );
    }
    if (msg === "CONFLITO_2_SLOTS") {
      return NextResponse.json(
        { error: "Esse serviço precisa de 2 horários seguidos livres. Escolha outro." },
        { status: 409 }
      );
    }
    if (msg === "BLOQUEADO") {
      return NextResponse.json(
        {
          error: "Não foi possível concluir o agendamento. Fale com a barbearia.",
          bloqueado: true,
        },
        { status: 403 }
      );
    }
    if (msg === "COBRANCA_PENDENTE") {
      return NextResponse.json(
        {
          error:
            "Você tem uma mensalidade pendente. Pague para liberar novos agendamentos.",
          cobrancaPendente: true,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: msg || "Erro ao processar agendamento." },
      { status: 403 }
    );
  }
}
