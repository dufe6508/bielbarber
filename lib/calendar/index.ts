import { prisma } from "@/lib/prisma";
import type { CalendarEvent, CalendarTarget, SyncResult } from "./types";
import { providersHabilitados } from "./providers";
import { formatarPreco, formatarTelefone } from "@/lib/utils/format";

export type { CalendarEvent, CalendarTarget, SyncResult } from "./types";
export { gerarICS } from "./ics";
export { linkGoogleAgenda, linkOutlookAgenda } from "./links";

// "HH:MM" + n horas → "HH:MM" (mesmo dia; a barbearia opera dentro do dia).
function somarHoras(hora: string, horas: number): string {
  const [h, m] = hora.split(":").map(Number);
  return `${String(h + horas).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Monta o CalendarEvent neutro a partir de um agendamento do banco. Fonte única
// consumida pelo ICS, pelos links e pelos providers de API.
export async function eventoDoAgendamento(
  appointmentId: string
): Promise<CalendarEvent | null> {
  const ag = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      servicos: { include: { servico: { select: { nome: true } } } },
    },
  });
  if (!ag) return null;

  const dataISO = ag.data.toISOString().slice(0, 10); // YYYY-MM-DD (campo @db.Date)
  const horaFim = somarHoras(ag.horarioInicio, Math.max(1, ag.slots));
  const servicos = ag.servicos.map((s) => s.servico.nome);

  // Título com informação além do nome (cliente · serviço) — é o que aparece na
  // grade da agenda. Sem localização/endereço: o `local` fica vazio de propósito
  // (o barbeiro pediu para não mostrar o endereço no evento).
  const titulo = servicos.length
    ? `${ag.cliente.nome} · ${servicos.join(" + ")}`
    : ag.cliente.nome;

  return {
    uid: `${ag.id}@bielbarber`,
    titulo,
    descricao: [
      `Cliente: ${ag.cliente.nome}`,
      servicos.length ? `Serviço: ${servicos.join(", ")}` : null,
      `Horário: ${ag.horarioInicio}`,
      ag.cliente.telefone ? `Telefone: ${formatarTelefone(ag.cliente.telefone)}` : null,
      `Valor: ${formatarPreco(Number(ag.valorTotal))}`,
    ]
      .filter(Boolean)
      .join("\n"),
    local: "",
    inicio: { data: dataISO, hora: ag.horarioInicio },
    fim: { data: dataISO, hora: horaFim },
    cliente: { nome: ag.cliente.nome, telefone: ag.cliente.telefone },
  };
}

// Chave onde o último erro de sync do Google é guardado — lido pelo painel
// admin (GoogleCalendarConexao) já que logs de runtime não ficam disponíveis
// via `vercel logs` no plano atual.
const CHAVE_GOOGLE_ULTIMO_ERRO = "google_calendar_ultimo_erro";

// Dispatcher de sincronização — chamado quando um agendamento é criado.
// Hoje é no-op (nenhum provider de API habilitado): a criação real de evento
// acontece pelo caminho local (botão "Adicionar à agenda" / rota ICS). Quando um
// provider for habilitado, a sincronização automática passa a rodar sem mudar
// quem chama. Best-effort: nunca lança, nunca bloqueia o agendamento.
export async function sincronizarAgenda(
  appointmentId: string,
  alvos: CalendarTarget[] = ["admin", "cliente"]
): Promise<SyncResult[]> {
  const providers = providersHabilitados();
  if (providers.length === 0) return [];

  try {
    const evento = await eventoDoAgendamento(appointmentId);
    if (!evento) return [];

    const resultados = await Promise.all(
      providers.flatMap((p) =>
        alvos.map((alvo) =>
          p.sincronizar(evento, alvo).catch((e) => ({
            provider: p.id,
            ok: false,
            motivo: e instanceof Error ? e.message : "erro",
          }))
        )
      )
    );

    // Registra o último erro do Google (ou limpa se deu tudo certo) — visível
    // no painel em vez de só no console do servidor. "alvo_nao_suportado" é
    // esperado pro target "cliente" (Google só sincroniza a agenda do admin) —
    // não é falha, ignora pra não mascarar o resultado real do target "admin".
    const erroGoogle = resultados.find(
      (r) => r.provider === "google" && !r.ok && r.motivo !== "alvo_nao_suportado"
    );
    const okGoogle = resultados.some((r) => r.provider === "google" && r.ok);
    if (erroGoogle) {
      await prisma.setting.upsert({
        where: { chave: CHAVE_GOOGLE_ULTIMO_ERRO },
        update: { valor: `${new Date().toISOString()} — ${erroGoogle.motivo}` },
        create: { chave: CHAVE_GOOGLE_ULTIMO_ERRO, valor: `${new Date().toISOString()} — ${erroGoogle.motivo}` },
      }).catch(() => {});
    } else if (okGoogle) {
      await prisma.setting.deleteMany({ where: { chave: CHAVE_GOOGLE_ULTIMO_ERRO } }).catch(() => {});
    }

    return resultados;
  } catch (e) {
    console.error("[calendar] falha ao sincronizar agenda", appointmentId, e);
    return [];
  }
}
