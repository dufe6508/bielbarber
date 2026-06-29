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
  Check,
  CheckCheck,
  Pin,
  Trash2,
  X,
  BellOff,
  Megaphone,
  ArrowLeft,
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
  const { patch, remover, marcarTodas } = useNotificacaoMutations(audiencia, telefone);
  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState<"lista" | "prefs" | "broadcast">("lista");
  const [filtro, setFiltro] = useState<NotificacaoCategoria | "todas">("todas");

  function abrir() {
    setVista("lista");
    setAberto(true);
  }
  const subtitulo = vista === "prefs" ? "Preferências" : "Enviar aviso";

  const itens = data?.itens ?? [];
  const naoLidas = data?.naoLidas ?? 0;
  const filtrados = filtro === "todas" ? itens : itens.filter((n) => n.categoria === filtro);
  // Categorias presentes (chips só do que existe).
  const categoriasPresentes = Array.from(new Set(itens.map((n) => n.categoria)));

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
              <div className="flex shrink-0 items-center justify-between gap-2 px-5 pb-3 pt-3.5">
                {vista === "lista" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                        Notificações
                      </span>
                      {naoLidas > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {naoLidas}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {naoLidas > 0 && (
                        <button
                          onClick={() => marcarTodas.mutate()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <CheckCheck className="size-3.5" />
                          Marcar todas
                        </button>
                      )}
                      <button
                        onClick={() => setVista(audiencia === "admin" ? "broadcast" : "prefs")}
                        aria-label={audiencia === "admin" ? "Enviar aviso" : "Preferências"}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {audiencia === "admin" ? (
                          <Megaphone className="size-4.5" />
                        ) : (
                          <Settings className="size-4.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setAberto(false)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Fechar"
                      >
                        <X className="size-4.5" />
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
                <div className="flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <ul className="divide-y divide-border/60">
                    {filtrados.map((n) => (
                      <Item
                        key={n.id}
                        n={n}
                        onAbrir={() => abrirItem(n)}
                        onFixar={() => patch.mutate({ id: n.id, fixada: !n.fixada })}
                        onRemover={() => remover.mutate(n.id)}
                        onLer={() => patch.mutate({ id: n.id, lida: true })}
                      />
                    ))}
                  </ul>
                )}
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
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
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
  onLer,
}: {
  n: Notificacao;
  onAbrir: () => void;
  onFixar: () => void;
  onRemover: () => void;
  onLer: () => void;
}) {
  const { Icone } = CATEGORIAS[n.categoria];
  const urgente = n.prioridade === "urgente" || n.prioridade === "alta";
  return (
    <li
      className={cn(
        "group relative flex gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40",
        !n.lida && "bg-accent/25"
      )}
    >
      {/* Ícone da categoria */}
      <span
        className={cn(
          "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
          urgente ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
        )}
      >
        <Icone className="size-4.5" strokeWidth={2} />
      </span>

      {/* Conteúdo (clicável) */}
      <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          {n.fixada && <Pin className="size-3 shrink-0 fill-current text-muted-foreground" />}
          <span className="truncate font-medium text-foreground">{n.titulo}</span>
          {!n.lida && <span className="size-2 shrink-0 rounded-full bg-red-500" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.mensagem}</p>
        <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
          {tempoRelativo(n.criadoEm)}
        </span>
      </button>

      {/* Ações (hover desktop / sempre mobile) */}
      <div className="flex shrink-0 flex-col items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        {!n.lida && (
          <button
            onClick={onLer}
            aria-label="Marcar como lida"
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Check className="size-3.5" />
          </button>
        )}
        <button
          onClick={onFixar}
          aria-label={n.fixada ? "Desafixar" : "Fixar"}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-background",
            n.fixada ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pin className={cn("size-3.5", n.fixada && "fill-current")} />
        </button>
        <button
          onClick={onRemover}
          aria-label="Excluir"
          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
