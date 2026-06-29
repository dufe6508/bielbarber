"use client";

import {
  Bell,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const TIPOS_EVENTO = [
  { value: "agendamento_confirmado", label: "Agendamento confirmado" },
  { value: "lembrete_horario", label: "Lembrete de horário (15 min)" },
  { value: "promocao", label: "Promoção" },
  { value: "assinatura_vencendo", label: "Mensalidade vencendo (3 dias)" },
  { value: "estoque_novo", label: "Produto novo na loja" },
  { value: "waitlist_horario_livre", label: "Horário da lista de espera" },
  { value: "cobranca_emitida", label: "Cobrança emitida (R$ 120)" },
  { value: "cobranca_lembrete", label: "Lembrete de cobrança" },
  { value: "cobranca_confirmada", label: "Pagamento confirmado" },
] as const;

type TipoEvento = (typeof TIPOS_EVENTO)[number]["value"];
type Cliente = { id: string; nome: string; telefone: string };

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function base64ParaUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function obterSubscription(): Promise<
  { endpoint: string; p256dh: string; auth: string } | null
> {
  try {
    if (
      !VAPID_PUBLIC ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    )
      return null;
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return null;
    const reg = await navigator.serviceWorker.ready;
    const existente = await reg.pushManager.getSubscription();
    const sub =
      existente ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ParaUint8(VAPID_PUBLIC),
      }));
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return null;
    return { endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
  } catch {
    return null;
  }
}

// "sidebar" = painel abre acima e alinha à esquerda (rodapé da sidebar)
// "topbar"  = painel abre abaixo e alinha à direita (top bar mobile)
type Props = {
  className?: string;
  placement?: "sidebar" | "topbar";
};

export function NotificationBell({ className, placement = "sidebar" }: Props) {
  const [painelAberto, setPainelAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // estado do modal de teste
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("agendamento_confirmado");
  const [destino, setDestino] = useState<"admin" | "cliente">("admin");
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const bellRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    if (!painelAberto) return;
    function onDown(e: MouseEvent) {
      if (
        !bellRef.current?.contains(e.target as Node) &&
        !painelRef.current?.contains(e.target as Node)
      ) {
        setPainelAberto(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [painelAberto]);

  // Busca clientes quando o destino muda para "cliente"
  useEffect(() => {
    if (destino !== "cliente" || clientes.length > 0) return;
    setCarregandoClientes(true);
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data: Cliente[]) => setClientes(data))
      .catch(() => {})
      .finally(() => setCarregandoClientes(false));
  }, [destino, clientes.length]);

  const clientesFiltrados =
    busca.length >= 2
      ? clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            c.telefone.includes(busca.replace(/\D/g, ""))
        )
      : [];

  function abrirModal() {
    setPainelAberto(false);
    setTipoEvento("agendamento_confirmado");
    setDestino("admin");
    setBusca("");
    setClienteSelecionado(null);
    setFeedback(null);
    setModalAberto(true);
  }

  async function enviar() {
    setEnviando(true);
    setFeedback(null);
    try {
      let body: Record<string, unknown>;

      if (destino === "admin") {
        const sub = await obterSubscription();
        if (!sub) {
          setFeedback({
            ok: false,
            msg: "Permissão de notificação negada ou Push não suportado neste browser.",
          });
          return;
        }
        body = { destino: "admin", tipoEvento, subscription: sub };
      } else {
        if (!clienteSelecionado) {
          setFeedback({ ok: false, msg: "Selecione um cliente da lista." });
          return;
        }
        body = { destino: "cliente", tipoEvento, clienteId: clienteSelecionado.id };
      }

      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setFeedback({ ok: true, msg: "Notificação enviada com sucesso!" });
      } else {
        setFeedback({ ok: false, msg: data.error ?? "Falha ao enviar." });
      }
    } catch {
      setFeedback({ ok: false, msg: "Erro de conexão." });
    } finally {
      setEnviando(false);
    }
  }

  // Posicionamento do painel relativo ao botão
  const painelClasses =
    placement === "sidebar"
      ? "bottom-full left-0 mb-2"
      : "top-full right-0 mt-2";

  return (
    <>
      {/* ── Sininho + painel ─────────────────────────────────────── */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={() => setPainelAberto((p) => !p)}
          className={cn(
            "inline-flex items-center justify-center rounded-lg transition-colors",
            className
          )}
          aria-label="Notificações"
        >
          <Bell className="size-4" />
        </button>

        <AnimatePresence>
          {painelAberto && (
            <motion.div
              ref={painelRef}
              initial={{ opacity: 0, scale: 0.96, y: placement === "sidebar" ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: placement === "sidebar" ? 4 : -4 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "absolute z-50 w-56 rounded-2xl border border-border bg-card shadow-lg",
                painelClasses
              )}
            >
              <div className="p-3">
                <p className="mb-0.5 font-heading text-sm font-semibold text-foreground">
                  Notificações
                </p>
                <p className="text-xs text-muted-foreground">
                  Sem notificações no momento.
                </p>
              </div>
              <div className="border-t border-border p-2">
                <button
                  onClick={abrirModal}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Send className="size-3.5 shrink-0" />
                  Teste
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal de teste ───────────────────────────────────────── */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setModalAberto(false)}
              aria-label="Fechar"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              {/* Header do modal */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    Notificação de teste
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Dispara um push real para verificar o canal.
                  </p>
                </div>
                <button
                  onClick={() => setModalAberto(false)}
                  className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Tipo de evento */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Tipo de notificação
                </label>
                <select
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value as TipoEvento)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TIPOS_EVENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destinatário */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Destinatário
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDestino("admin")}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                      destino === "admin"
                        ? "border-foreground/30 bg-foreground/8 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Eu (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestino("cliente")}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                      destino === "cliente"
                        ? "border-foreground/30 bg-foreground/8 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Cliente
                  </button>
                </div>

                {/* Busca de cliente */}
                {destino === "cliente" && (
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Nome ou telefone…"
                        value={busca}
                        onChange={(e) => {
                          setBusca(e.target.value);
                          setClienteSelecionado(null);
                        }}
                        className="w-full rounded-xl border border-input bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    {carregandoClientes && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        Carregando clientes…
                      </p>
                    )}

                    {clientesFiltrados.length > 0 && !clienteSelecionado && (
                      <ul className="mt-1.5 max-h-36 overflow-y-auto rounded-xl border border-border bg-background">
                        {clientesFiltrados.slice(0, 8).map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setClienteSelecionado(c);
                                setBusca(c.nome);
                              }}
                              className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <span className="font-medium text-foreground">
                                {c.nome}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {c.telefone}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {clienteSelecionado && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Selecionado:{" "}
                        <span className="font-medium text-foreground">
                          {clienteSelecionado.nome}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={cn(
                    "mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
                    feedback.ok
                      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  )}
                >
                  {feedback.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                  )}
                  {feedback.msg}
                </div>
              )}

              {/* Botão de envio */}
              <button
                onClick={enviar}
                disabled={enviando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {enviando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {enviando ? "Enviando…" : "Enviar teste"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
