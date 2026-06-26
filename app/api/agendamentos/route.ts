import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { proximaHora, getSlotsDisponiveis } from "@/lib/utils/slots";

export async function GET() {
  const agendamentos = await prisma.appointment.findMany({
    include: { cliente: true, servicos: { include: { servico: true } } },
    orderBy: [{ data: "asc" }, { horarioInicio: "asc" }],
  });
  return NextResponse.json(agendamentos);
}

type Body = {
  nome: string;
  telefone: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM (início)
  horarioFim?: string | null; // HH:MM (2º slot, coloração)
  formaPagamento: "pix" | "cartao" | "local" | "mensalista";
  servicoIds: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const { nome, telefone, data, horario, horarioFim, formaPagamento, servicoIds } =
    body;

  // Validação mínima
  if (!nome?.trim() || !telefone || !data || !horario || !formaPagamento) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (!servicoIds?.length) {
    return NextResponse.json(
      { error: "Selecione ao menos um serviço." },
      { status: 400 }
    );
  }

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

  // Cria ou reaproveita o cliente pelo telefone
  const cliente = await prisma.client.upsert({
    where: { telefone },
    update: { nome },
    create: { nome, telefone },
    include: { mensalidade: true },
  });

  if (cliente.bloqueado) {
    return NextResponse.json(
      { error: "Não foi possível concluir o agendamento. Fale com a barbearia." },
      { status: 403 }
    );
  }

  // Mensalista: só aceita se o cliente tiver assinatura ativa
  const ehMensalista = formaPagamento === "mensalista";
  if (ehMensalista) {
    if (!cliente.mensalidade || cliente.mensalidade.status !== "ativo") {
      return NextResponse.json(
        {
          error:
            "Você não está cadastrado como mensalista. Escolha outra forma de pagamento.",
        },
        { status: 403 }
      );
    }
  }

  // Mensalista paga depois (no fechamento do ciclo) → registra como "local"/pendente
  const formaFinal = ehMensalista ? "local" : formaPagamento;
  const valorTotal = servicos.reduce(
    (acc: number, s) => acc + Number(s.preco),
    0
  );

  const agendamento = await prisma.appointment.create({
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

  // Código curto para o ticket
  const codigo = agendamento.id.slice(0, 8).toUpperCase();

  return NextResponse.json({ id: agendamento.id, codigo }, { status: 201 });
}
