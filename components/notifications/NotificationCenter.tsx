"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Calendar,
  CreditCard,
  CalendarClock,
  Crown,
  ShoppingBag,
  Settings,
  Tag,
  CheckCheck,
  Pin,
  Trash2,
  X,
  BellOff,
  Megaphone,
  ArrowLeft,
  Eraser,
} from "lucide-react";
import {
  useNotificacoes,
  useNotificacaoMutations,
  type Notificacao,
  type NotificacaoCategoria,
} from "@/lib/notifications/useNotificacoes";
import { PreferenciasCliente } from "./PreferenciasCliente";
import { AdminBroadcast } from "./AdminBroadcast";
import { cn } from "@/lib/utils";

// ─── Central de notificações (sino) ─────────────────────────────────────────
// Desktop: dropdown no canto. Mobile: bottom sheet. Uma fonte de dado por
// audiência (cliente busca por telefone; admin pela sessão).

const CATEGORIAS: Record<
  NotificacaoCategoria,
  { rotulo: string; Icone: typeof Bell }
> = {
  agenda: { rotulo: "Agenda", Icone: Calendar },
  pagamentos: { rotulo: "Pagamentos", Icone: CreditCard },
  mensalistas: { rotulo: "Mensalistas", Icone: CalendarClock },
  assinaturas: { rotulo: "Assinaturas", Icone: Crown },
  loja: { rotulo: "Loja", Icone: ShoppingBag },
  sistema: { rotulo: "Sistema", Icone: Settings },
  promocoes: { rotulo: "Promoções", Icone: Tag },
};

// "agora" | "5 min" | "3 h" | "2 d" | data curta
function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NotificationCenter({
  audiencia,
  className,
}: {
  audiencia: "cliente" | "admin";
  className?: string;
}) {
  const router = useRouter();
  const { data, telefone } = useNotificacoes(audiencia);
  const { patch, remover, marcarTodas, limparTudo } = useNotificacaoMutations(
    audiencia,
    telefone
  );
  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState<"lista" | "prefs" | "broadcast">("lista");
  const [filtro, setFiltro] = useState<NotificacaoCategoria | "todas">("todas");
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);

  function abrir() {
    setVista("lista");
    setConfirmandoLimpar(false);
    setAberto(true);
  }
  const subtitulo = vista === "prefs" ? "Preferências" : "Enviar aviso";

  const itens = data?.itens ?? [];
  const naoLidas = data?.naoLidas ?? 0;
  const filtrados = filtro === "todas" ? itens : itens.filter((n) => n.categoria === filtro);
  // Categorias presentes (chips só do que existe).
  const categoriasPresentes = Array.from(new Set(itens.map((n) => n.categoria)));
  // Apagáveis = não fixadas (o "Limpar notificações" preserva as fixadas).
  const apagaveis = itens.filter((n) => !n.fixada).length;

  function limparNotificacoes() {
    limparTudo.mutate();
    setConfirmandoLimpar(false);
  }

  function abrirItem(n: Notificacao) {
    if (!n.lida) patch.mutate({ id: n.id, lida: true });
    if (n.actionUrl) {
      setAberto(false);
      router.push(n.actionUrl);
    }
  }

  return (
    <>
      <button
        onClick={abrir}
        aria-label="Notificações"
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className
        )}
      >
        <Bell className="size-[19px]" strokeWidth={2} />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-background">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-end p-4 pt-[68px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
            />
            <motion.div
              initial={{ y: "-4%", opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "-3%", opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative flex max-h-[80dvh] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-5 pb-3.5 pt-4">
                {vista === "lista" ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                        Notificações
                      </span>
                      {naoLidas > 0 && (
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-none text-primary-foreground">
                          {naoLidas}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setVista(audiencia === "admin" ? "broadcast" : "prefs")}
                        aria-label={audiencia === "admin" ? "Enviar aviso" : "Preferências"}
                        title={audiencia === "admin" ? "Enviar aviso" : "Preferências"}
                        className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {audiencia === "admin" ? (
                          <Megaphone className="size-[18px]" />
                        ) : (
                          <Settings className="size-[18px]" />
                        )}
                      </button>
                      <button
                        onClick={() => setAberto(false)}
                        className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Fechar"
                      >
                        <X className="size-[18px]" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setVista("lista")}
                      className="inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                        {subtitulo}
                      </span>
                    </button>
                    <button
                      onClick={() => setAberto(false)}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Fechar"
                    >
                      <X className="size-4.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Sub-views: preferências (cliente) / broadcast (admin) */}
              {vista === "prefs" && (
                <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                  <PreferenciasCliente telefone={telefone} />
                </div>
              )}
              {vista === "broadcast" && (
                <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                  <AdminBroadcast />
                </div>
              )}

              {/* Filtros por categoria */}
              {vista === "lista" && categoriasPresentes.length > 1 && (
                <div className="flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Chip ativo={filtro === "todas"} onClick={() => setFiltro("todas")}>
                    Todas
                  </Chip>
                  {categoriasPresentes.map((c) => (
                    <Chip key={c} ativo={filtro === c} onClick={() => setFiltro(c)}>
                      {CATEGORIAS[c].rotulo}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Lista */}
              {vista === "lista" && (
              <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                {filtrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <BellOff className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma notificação por aqui.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    <AnimatePresence initial={false}>
                      {filtrados.map((n) => (
                        <Item
                          key={n.id}
                          n={n}
                          onAbrir={() => abrirItem(n)}
                          onFixar={() => patch.mutate({ id: n.id, fixada: !n.fixada })}
                          onRemover={() => remover.mutate(n.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
              )}

              {/* Footer — ações em massa (marcar lidas / limpar conversa) */}
              {vista === "lista" && itens.length > 0 && (
                <div className="shrink-0 border-t border-border/60 bg-card px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
                  <AnimatePresence mode="wait" initial={false}>
                    {confirmandoLimpar ? (
                      <motion.div
                        key="confirma"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="pl-1.5 text-xs text-muted-foreground">
                          Apagar {apagaveis} {apagaveis === 1 ? "notificação" : "notificações"}?
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setConfirmandoLimpar(false)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={limparNotificacoes}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          >
                            <Trash2 className="size-3.5" />
                            Apagar tudo
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="acoes"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => marcarTodas.mutate()}
                          disabled={naoLidas === 0}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <CheckCheck className="size-3.5" />
                          Marcar todas
                        </button>
                        <button
                          onClick={() => setConfirmandoLimpar(true)}
                          disabled={apagaveis === 0}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Eraser className="size-3.5" />
                          Limpar notificações
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 active:scale-95",
        ativo
          ? "bg-foreground text-background shadow-sm"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Item({
  n,
  onAbrir,
  onFixar,
  onRemover,
}: {
  n: Notificacao;
  onAbrir: () => void;
  onFixar: () => void;
  onRemover: () => void;
}) {
  const { Icone } = CATEGORIAS[n.categoria];
  const urgente = n.prioridade === "urgente" || n.prioridade === "alta";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors duration-200",
        !n.lida ? "bg-primary/[0.035] hover:bg-primary/[0.06]" : "hover:bg-accent/40"
      )}
    >
      {/* Não-lida — barrinha lateral fina e discreta (não a barra cheia antiga) */}
      {!n.lida && (
        <span className="absolute inset-y-2.5 left-0 w-[2.5px] rounded-full bg-primary/50" />
      )}

      {/* Ícone da categoria */}
      <span
        className={cn(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          urgente
            ? "bg-foreground text-background"
            : "bg-muted/70 text-muted-foreground group-hover:bg-muted"
        )}
      >
        <Icone className="size-[17px]" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        {/* Linha superior: título + horário + ponto de não-lida */}
        <button onClick={onAbrir} className="block w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {n.fixada && <Pin className="size-3 shrink-0 fill-current text-muted-foreground/70" />}
              <span
                className={cn(
                  "truncate text-[13.5px] leading-tight text-foreground",
                  !n.lida ? "font-semibold" : "font-medium"
                )}
              >
                {n.titulo}
              </span>
            </span>
            <span className="mt-px flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
                {tempoRelativo(n.criadoEm)}
              </span>
              {!n.lida && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {n.mensagem}
          </p>
        </button>

        {/* Ações — ícone-texto discreto. No desktop aparecem no hover/foco. */}
        <div className="mt-1.5 -ml-1.5 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={onFixar}
            aria-label={n.fixada ? "Desafixar" : "Fixar"}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors hover:bg-muted",
              n.fixada ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground"
            )}
          >
            <Pin className={cn("size-3.5", n.fixada && "fill-current")} />
            {n.fixada ? "Fixada" : "Fixar"}
          </button>
          <button
            onClick={onRemover}
            aria-label="Excluir"
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </motion.li>
  );
}
