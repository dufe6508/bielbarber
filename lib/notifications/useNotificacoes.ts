"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { telefoneLembrado } from "@/lib/utils/telefone";

// Hooks da central de notificações (cliente e admin). Cliente busca por telefone
// guardado no localStorage; admin pela sessão (cookie). Polling a cada 60s.

export type NotificacaoCategoria =
  | "agenda"
  | "pagamentos"
  | "mensalistas"
  | "assinaturas"
  | "loja"
  | "sistema"
  | "promocoes";

export type Notificacao = {
  id: string;
  categoria: NotificacaoCategoria;
  tipo: string;
  titulo: string;
  mensagem: string;
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  lida: boolean;
  fixada: boolean;
  actionUrl: string | null;
  criadoEm: string;
};

type Resposta = { itens: Notificacao[]; naoLidas: number };

const POLL_MS = 60_000;

// Lê o telefone do localStorage de forma reativa (atualiza após hidratar).
export function useTelefoneCliente(): string {
  const [tel, setTel] = useState("");
  useEffect(() => {
    setTel(telefoneLembrado());
    const onStorage = () => setTel(telefoneLembrado());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return tel;
}

export function useNotificacoes(audiencia: "cliente" | "admin") {
  const telefone = useTelefoneCliente();
  const ehCliente = audiencia === "cliente";

  const query = useQuery<Resposta>({
    queryKey: ["notificacoes", audiencia, ehCliente ? telefone : "admin"],
    enabled: ehCliente ? telefone.length >= 10 : true,
    refetchInterval: POLL_MS,
    queryFn: async () => {
      const url = ehCliente
        ? `/api/notificacoes?telefone=${encodeURIComponent(telefone)}`
        : "/api/admin/notificacoes";
      const r = await fetch(url);
      if (!r.ok) throw new Error("Falha ao carregar notificações");
      return r.json();
    },
  });

  return { ...query, telefone };
}

// Mutations (marcar lida, fixar, deletar, marcar todas). Invalida a query no fim.
export function useNotificacaoMutations(
  audiencia: "cliente" | "admin",
  telefone: string
) {
  const qc = useQueryClient();
  const ehCliente = audiencia === "cliente";
  const base = ehCliente ? "/api/notificacoes" : "/api/admin/notificacoes";
  const corpo = (extra: Record<string, unknown>) =>
    ehCliente ? { telefone, ...extra } : extra;
  const invalidar = () =>
    qc.invalidateQueries({ queryKey: ["notificacoes", audiencia] });

  const patch = useMutation({
    mutationFn: async (v: { id: string; lida?: boolean; fixada?: boolean }) => {
      await fetch(`${base}/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo({ lida: v.lida, fixada: v.fixada })),
      });
    },
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${base}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo({})),
      });
    },
    onSuccess: invalidar,
  });

  const marcarTodas = useMutation({
    mutationFn: async () => {
      await fetch(`${base}/marcar-todas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo({})),
      });
    },
    onSuccess: invalidar,
  });

  // Limpa a conversa de uma vez (apaga todas, exceto as fixadas).
  const limparTudo = useMutation({
    mutationFn: async () => {
      await fetch(`${base}/limpar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo({})),
      });
    },
    onSuccess: invalidar,
  });

  return { patch, remover, marcarTodas, limparTudo };
}
