"use client";

import { Bell, X, Calendar, Clock, CreditCard, Megaphone, CheckCheck } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { telefoneLembrado } from "@/lib/utils/telefone";

type Notif = {
  id: string;
  tipo: "confirmacao" | "lembrete" | "cobranca" | "geral";
  conteudo: string;
  lida: boolean;
  enviadoEm: string;
};

// Ícone por tipo
function IconeTipo({ tipo, className }: { tipo: Notif["tipo"]; className?: string }) {
  const props = { className: cn("size-4 shrink-0", className) };
  switch (tipo) {
    case "confirmacao": return <Calendar {...props} />;
    case "lembrete":    return <Clock {...props} />;
    case "cobranca":    return <CreditCard {...props} />;
    default:            return <Megaphone {...props} />;
  }
}

// Tempo relativo simples (sem biblioteca)
function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `${d} dias atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Extrai título e corpo do conteudo salvo ("Título — corpo")
function parseConteudo(conteudo: string): { titulo: string; corpo: string } {
  const idx = conteudo.indexOf(" — ");
  if (idx < 0) return { titulo: conteudo, corpo: "" };
  return { titulo: conteudo.slice(0, idx), corpo: conteudo.slice(idx + 3) };
}

// "sidebar" = painel abre acima (rodapé sidebar), alinha esquerda
// "topbar"  = painel abre abaixo (top bar mobile), alinha direita
type Props = { className?: string; placement?: "sidebar" | "topbar" };

export function ClientNotificationBell({ className, placement = "topbar" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [telefone, setTelefone] = useState("");

  const bellRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Lê o telefone do localStorage ao montar
  useEffect(() => {
    setTelefone(telefoneLembrado());
  }, []);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  const buscarNotificacoes = useCallback(async (tel: string) => {
    if (!tel) return;
    setCarregando(true);
    try {
      const res = await fetch(`/api/notificacoes?telefone=${tel}`);
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notificacoes ?? []);
      }
    } catch {
      // silencia erros de rede
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca ao abrir o painel
  useEffect(() => {
    if (aberto && telefone) {
      buscarNotificacoes(telefone);
    }
  }, [aberto, telefone, buscarNotificacoes]);

  // Marca como lidas ao abrir (após pequeno delay pra dar tempo de buscar)
  useEffect(() => {
    if (!aberto || !telefone || naoLidas === 0) return;
    const t = setTimeout(() => {
      fetch(`/api/notificacoes?telefone=${telefone}`, { method: "PATCH" }).then(() => {
        setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
      });
    }, 800);
    return () => clearTimeout(t);
  }, [aberto, telefone, naoLidas]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function onDown(e: MouseEvent) {
      if (
        !bellRef.current?.contains(e.target as Node) &&
        !painelRef.current?.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [aberto]);

  const painelClasses =
    placement === "sidebar"
      ? "bottom-full left-0 mb-2"
      : "top-full right-0 mt-2";

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setAberto((p) => !p)}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg transition-colors",
          className
        )}
        aria-label="Notificações"
      >
        <Bell className="size-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            ref={painelRef}
            initial={{ opacity: 0, scale: 0.96, y: placement === "sidebar" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: placement === "sidebar" ? 4 : -4 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "absolute z-50 w-80 rounded-2xl border border-border bg-card shadow-xl",
              painelClasses
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-foreground" />
                <span className="font-heading text-sm font-semibold text-foreground">
                  Notificações
                </span>
                {naoLidas > 0 && (
                  <span className="flex h-5 items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                    {naoLidas}
                  </span>
                )}
              </div>
              <button
                onClick={() => setAberto(false)}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="max-h-[360px] overflow-y-auto">
              {!telefone ? (
                // Sem telefone salvo
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <Bell className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    Ainda sem notificações
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Faça um agendamento para começar a receber avisos aqui.
                  </p>
                </div>
              ) : carregando ? (
                // Carregando
                <div className="flex flex-col gap-3 p-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="size-8 shrink-0 rounded-full bg-muted" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <div className="h-3 w-3/4 rounded bg-muted" />
                        <div className="h-2.5 w-full rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifs.length === 0 ? (
                // Vazio
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <CheckCheck className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    Tudo em dia
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você não tem notificações no momento.
                  </p>
                </div>
              ) : (
                // Lista
                <ul className="divide-y divide-border/60">
                  {notifs.map((n) => {
                    const { titulo, corpo } = parseConteudo(n.conteudo);
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors",
                          !n.lida && "bg-foreground/[0.03]"
                        )}
                      >
                        {/* Ícone do tipo */}
                        <span
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                            n.tipo === "confirmacao" && "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
                            n.tipo === "lembrete"    && "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
                            n.tipo === "cobranca"    && "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
                            n.tipo === "geral"       && "bg-muted text-muted-foreground"
                          )}
                        >
                          <IconeTipo tipo={n.tipo} />
                        </span>

                        {/* Texto */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug text-foreground">
                              {titulo}
                            </p>
                            {!n.lida && (
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" />
                            )}
                          </div>
                          {corpo && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                              {corpo}
                            </p>
                          )}
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                            {tempoRelativo(n.enviadoEm)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
