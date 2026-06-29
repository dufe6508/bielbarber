import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { montarSpecs, type NotificationSpec } from "./catalog";
import type { NotificationEvent } from "./events";
import { enviarPushParaCliente } from "./push";

// ─── Dispatcher central de notificações ─────────────────────────────────────
// ÚNICO ponto de entrada. notify(event) → grava a(s) linha(s) na inbox (o sino
// lê daqui) e entrega push best-effort. Admin não recebe push (usa só o sino).
// Spec de cliente SEM clienteId = broadcast para todos os clientes ativos.

export async function notify(event: NotificationEvent): Promise<void> {
  let specs: NotificationSpec[];
  try {
    specs = await montarSpecs(event);
  } catch (e) {
    console.error("[notify] falha ao montar specs", event.type, e);
    return;
  }

  for (const s of specs) {
    try {
      if (s.audiencia === "cliente" && !s.clienteId) {
        await broadcastClientes(s);
      } else {
        await prisma.notification.create({ data: linha(s, s.clienteId ?? null) });
        if (s.audiencia === "cliente" && s.clienteId) {
          await enviarPushParaCliente(
            s.clienteId,
            { title: s.titulo, body: s.mensagem, url: s.actionUrl ?? "/", ...s.push },
            s.prefFlag
          );
        }
      }
    } catch (e) {
      console.error("[notify] falha ao processar spec", event.type, e);
    }
  }
}

// Monta o objeto de criação a partir de um spec (campos comuns).
function linha(s: NotificationSpec, clienteId: string | null): Prisma.NotificationCreateInput {
  return {
    audiencia: s.audiencia,
    cliente: clienteId ? { connect: { id: clienteId } } : undefined,
    categoria: s.categoria,
    tipo: tipoDoSpec(s),
    titulo: s.titulo,
    mensagem: s.mensagem,
    prioridade: s.prioridade,
    actionUrl: s.actionUrl,
    metadata: (s.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

// Deriva uma chave de tipo estável (categoria como fallback simples).
function tipoDoSpec(s: NotificationSpec): string {
  return (s.metadata?.tipo as string) || s.categoria;
}

// Broadcast genérico do admin (mensagem livre) para todos os clientes ativos.
// Usado pela rota /api/admin/notificacoes/broadcast.
export async function enviarBroadcast(opts: {
  titulo: string;
  mensagem: string;
  categoria: NotificationSpec["categoria"];
  actionUrl?: string;
  prioridade?: NotificationSpec["prioridade"];
}): Promise<number> {
  return broadcastClientes({
    audiencia: "cliente",
    categoria: opts.categoria,
    prioridade: opts.prioridade ?? "normal",
    titulo: opts.titulo,
    mensagem: opts.mensagem,
    actionUrl: opts.actionUrl,
    prefFlag: "sistemaAtivo",
  });
}

// Broadcast: grava uma linha por cliente ativo (não-bloqueado) e dispara push.
// ponytail: linhas por cliente; se a base explodir, vira 1 linha + recibos de leitura.
async function broadcastClientes(s: NotificationSpec): Promise<number> {
  const clientes = await prisma.client.findMany({
    where: { bloqueado: false },
    select: { id: true },
  });
  if (clientes.length === 0) return 0;

  await prisma.notification.createMany({
    data: clientes.map((c) => ({
      audiencia: "cliente" as const,
      clienteId: c.id,
      categoria: s.categoria,
      tipo: tipoDoSpec(s),
      titulo: s.titulo,
      mensagem: s.mensagem,
      prioridade: s.prioridade,
      actionUrl: s.actionUrl,
      metadata: (s.metadata ?? undefined) as Prisma.InputJsonValue,
    })),
  });

  await Promise.all(
    clientes.map((c) =>
      enviarPushParaCliente(
        c.id,
        { title: s.titulo, body: s.mensagem, url: s.actionUrl ?? "/", ...s.push },
        s.prefFlag
      ).catch(() => {})
    )
  );
  return clientes.length;
}
