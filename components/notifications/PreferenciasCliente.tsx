"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ativarPush, desativarPush } from "@/lib/notifications/subscribe-client";
import { cn } from "@/lib/utils";

type Prefs = {
  pushAtivo: boolean;
  lembrete: boolean;
  confirmacao: boolean;
  promocao: boolean;
  assinaturaVencendo: boolean;
  sistemaAtivo: boolean;
};

const LINHAS: { chave: keyof Prefs; rotulo: string; desc: string }[] = [
  { chave: "confirmacao", rotulo: "Agendamentos", desc: "Confirmação, remarcação e cancelamento" },
  { chave: "lembrete", rotulo: "Lembretes", desc: "Avisos antes do seu horário" },
  { chave: "assinaturaVencendo", rotulo: "Mensalidade", desc: "Cobranças e fechamento de ciclo" },
  { chave: "sistemaAtivo", rotulo: "Avisos da barbearia", desc: "Mensagens e comunicados" },
  { chave: "promocao", rotulo: "Promoções", desc: "Ofertas e novidades da loja" },
];

export function PreferenciasCliente({ telefone }: { telefone: string }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (telefone.length < 10) {
      setCarregando(false);
      return;
    }
    fetch(`/api/push/preferences?telefone=${encodeURIComponent(telefone)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPrefs(d))
      .finally(() => setCarregando(false));
  }, [telefone]);

  async function salvar(patch: Partial<Prefs>) {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    await fetch("/api/push/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone, ...patch }),
    }).catch(() => toast.error("Não foi possível salvar."));
  }

  async function alternarPush(ligar: boolean) {
    if (ligar) {
      await ativarPush(telefone);
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        toast.error("Permissão de notificação negada no navegador.");
        return;
      }
    } else {
      await desativarPush();
    }
    await salvar({ pushAtivo: ligar });
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (telefone.length < 10 || !prefs) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        Faça um agendamento para configurar suas notificações.
      </p>
    );
  }

  return (
    <div className="px-5 py-3">
      {/* Push master */}
      <Linha
        rotulo="Notificações push"
        desc="Receber alertas mesmo com o site fechado"
        ativo={prefs.pushAtivo}
        onChange={alternarPush}
        destaque
      />
      <div className="my-3 h-px bg-border/60" />
      {LINHAS.map((l) => (
        <Linha
          key={l.chave}
          rotulo={l.rotulo}
          desc={l.desc}
          ativo={prefs[l.chave]}
          onChange={(v) => salvar({ [l.chave]: v } as Partial<Prefs>)}
        />
      ))}
    </div>
  );
}

function Linha({
  rotulo,
  desc,
  ativo,
  onChange,
  destaque,
}: {
  rotulo: string;
  desc: string;
  ativo: boolean;
  onChange: (v: boolean) => void;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className={cn("text-sm font-medium text-foreground", destaque && "font-semibold")}>
          {rotulo}
        </p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={ativo}
        onClick={() => onChange(!ativo)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          ativo ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-background shadow transition-transform",
            ativo ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
