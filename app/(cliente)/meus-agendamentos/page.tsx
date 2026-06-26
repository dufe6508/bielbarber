"use client";

import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Calendar,
  CalendarClock,
  Clock,
  X,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  formatarTelefone,
  telefoneNumeros,
  formatarDataExtenso,
  rotuloRelativo,
  formatarPreco,
} from "@/lib/utils/format";
import { lembrarTelefone, telefoneLembrado } from "@/lib/utils/telefone";
import { cn } from "@/lib/utils";

type Servico = { nome: string; preco: string };
type Agendamento = {
  id: string;
  data: string;
  horarioInicio: string;
  status: "agendado" | "concluido" | "cancelado" | "nao_compareceu";
  valorTotal: string;
  servicos: Servico[];
};
type Resultado = { nome: string; agendamentos: Agendamento[] };

// ─── Estado visual derivado do agendamento ──────────────────────────────────
type Visual = {
  rotulo: string;
  badge: string; // classes da etiqueta
  faixa: string; // classes da faixa lateral
  ativo: boolean; // verde / futuro
  podeAlterar: boolean;
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// true quando a data é Hoje ou Amanhã (mostra chip de destaque)
function relevante(data: string): boolean {
  const r = rotuloRelativo(data);
  return r === "Hoje" || r === "Amanhã";
}

function visualDe(a: Agendamento): Visual {
  const [h, m] = a.horarioInicio.split(":").map(Number);
  const inicio = new Date(a.data);
  inicio.setHours(h ?? 0, m ?? 0, 0, 0);
  const passou = inicio.getTime() < Date.now();
  const faltaMaisDe1h = inicio.getTime() - Date.now() > 60 * 60 * 1000;

  if (a.status === "cancelado")
    return {
      rotulo: "Cancelado",
      badge: "bg-danger-muted text-danger-muted-foreground",
      faixa: "bg-danger",
      ativo: false,
      podeAlterar: false,
    };
  if (a.status === "nao_compareceu")
    return {
      rotulo: "Não compareceu",
      badge: "bg-danger-muted text-danger-muted-foreground",
      faixa: "bg-danger/70",
      ativo: false,
      podeAlterar: false,
    };
  if (a.status === "concluido" || (a.status === "agendado" && passou))
    return {
      rotulo: "Finalizado",
      badge: "bg-muted text-muted-foreground",
      faixa: "bg-muted-foreground/30",
      ativo: false,
      podeAlterar: false,
    };
  // agendado, futuro
  return {
    rotulo: "Confirmado",
    badge: "bg-success-muted text-success-muted-foreground",
    faixa: "bg-success",
    ativo: true,
    podeAlterar: faltaMaisDe1h,
  };
}

export default function MeusAgendamentosPage() {
  const [telefone, setTelefone] = useState("");
  const [consultado, setConsultado] = useState<string | null>(null);
  const qc = useQueryClient();

  // Pré-preenche (e já busca) com o telefone usado no agendamento
  useEffect(() => {
    const t = telefoneLembrado();
    if (t) {
      setTelefone(formatarTelefone(t));
      setConsultado(t);
    }
  }, []);

  const consulta = useQuery<Resultado, Error>({
    queryKey: ["meus-agendamentos", consultado],
    enabled: !!consultado,
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${consultado}/historico`);
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Erro ao buscar.");
      return dados;
    },
  });

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const tel = telefoneNumeros(telefone);
    if (tel.length < 10) return;
    lembrarTelefone(tel);
    setConsultado(tel);
  }

  const podeBuscar = telefoneNumeros(telefone).length >= 10;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Meus agendamentos"
        descricao="Veja, remarque ou cancele seus horários."
      />

      <form onSubmit={buscar} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(31) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          className="h-12 font-mono text-base tabular-nums sm:flex-1"
        />
        <button
          type="submit"
          disabled={!podeBuscar || consulta.isFetching}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {consulta.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Buscar
        </button>
      </form>

      {consulta.isError && (
        <EstadoVazio
          icone={Search}
          titulo={consulta.error.message}
          texto="Confira o número e tente de novo."
        />
      )}

      {consulta.isSuccess && (
        <div className="mt-10">
          <p className="text-sm text-muted-foreground">
            Agendamentos de{" "}
            <span className="font-medium text-foreground">
              {consulta.data.nome}
            </span>
          </p>

          {consulta.data.agendamentos.length === 0 ? (
            <EstadoVazio
              icone={Calendar}
              titulo="Nenhum agendamento ainda"
              texto="Quando você agendar, tudo aparece aqui."
            />
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              className="mt-4 space-y-3"
            >
              {consulta.data.agendamentos.map((a) => (
                <CartaoAgendamento
                  key={a.id}
                  agendamento={a}
                  telefone={consultado!}
                  onMudou={() =>
                    qc.invalidateQueries({
                      queryKey: ["meus-agendamentos", consultado],
                    })
                  }
                />
              ))}
            </motion.ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cartão de agendamento ──────────────────────────────────────────────────
function CartaoAgendamento({
  agendamento: a,
  onMudou,
}: {
  agendamento: Agendamento;
  telefone: string;
  onMudou: () => void;
}) {
  const v = visualDe(a);
  const [remarcando, setRemarcando] = useState(false);

  const cancelar = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/agendamentos/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "cancelar" }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Erro ao cancelar.");
      return dados;
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado.");
      onMudou();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
      }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Faixa lateral de status */}
      <span className={cn("absolute inset-y-0 left-0 w-1.5", v.faixa)} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                v.ativo
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Scissors className="size-5" />
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="font-heading text-base font-semibold tracking-tight text-foreground">
                  {capitalizar(formatarDataExtenso(a.data).replace(/\./g, ""))}
                </p>
                {relevante(a.data) && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                    {rotuloRelativo(a.data)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-sm tabular-nums text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {a.horarioInicio}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              v.badge
            )}
          >
            {v.rotulo}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-border pt-3">
          <p className="text-sm text-foreground">
            {a.servicos.map((s) => s.nome).join(", ")}
          </p>
          <span className="font-mono text-base font-bold tabular-nums text-foreground">
            {formatarPreco(a.valorTotal)}
          </span>
        </div>

        {/* Ações (só para agendado futuro, até 1h antes) */}
        {v.ativo && v.podeAlterar && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setRemarcando((x) => !x)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
            >
              <CalendarClock className="size-4" />
              Remarcar
            </button>
            <button
              type="button"
              onClick={() => cancelar.mutate()}
              disabled={cancelar.isPending}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50"
            >
              {cancelar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Cancelar
            </button>
          </div>
        )}
        {v.ativo && !v.podeAlterar && (
          <p className="mt-3 text-xs text-muted-foreground">
            Alterações encerradas (menos de 1h para o horário).
          </p>
        )}

        {/* Remarcar — inline */}
        <AnimatePresence>
          {remarcando && (
            <Remarcar
              id={a.id}
              onFechar={() => setRemarcando(false)}
              onPronto={() => {
                setRemarcando(false);
                onMudou();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

// ─── Remarcação inline ──────────────────────────────────────────────────────
function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const cursor = new Date(hoje);
  while (dias.length < qtd) {
    const ds = cursor.getDay();
    if (ds !== 0 && ds !== 1) dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}
function dataISO(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${dia}`;
}

function Remarcar({
  id,
  onFechar,
  onPronto,
}: {
  id: string;
  onFechar: () => void;
  onPronto: () => void;
}) {
  const dias = proximosDias(10);
  const [data, setData] = useState<string | null>(null);
  const [horario, setHorario] = useState<string | null>(null);

  const slots = useQuery<string[]>({
    queryKey: ["slots", data],
    enabled: !!data,
    queryFn: async () => {
      const res = await fetch(`/api/slots?data=${data}`);
      if (!res.ok) throw new Error("Erro ao carregar horários");
      return res.json();
    },
  });

  const remarcar = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "remarcar", data, horario }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Erro ao remarcar.");
      return dados;
    },
    onSuccess: () => {
      toast.success("Agendamento remarcado.");
      onPronto();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Escolha o novo horário</p>
          <button
            type="button"
            onClick={onFechar}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Dias */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dias.map((d) => {
            const iso = dataISO(d);
            const ativo = data === iso;
            const partes = formatarDataExtenso(d).split(", ");
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setData(iso);
                  setHorario(null);
                }}
                className={cn(
                  "flex min-w-[58px] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2 transition-colors",
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                )}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">
                  {partes[0]}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {partes[1]?.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Horários */}
        {data && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))
            ) : slots.data && slots.data.length > 0 ? (
              slots.data.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorario(h)}
                  className={cn(
                    "h-10 rounded-lg border font-mono text-sm font-medium tabular-nums transition-colors",
                    horario === h
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  )}
                >
                  {h}
                </button>
              ))
            ) : (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                Sem horários nesse dia.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!data || !horario || remarcar.isPending}
          onClick={() => remarcar.mutate()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {remarcar.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Confirmar novo horário"
          )}
        </button>
      </div>
    </motion.div>
  );
}

function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: React.ElementType;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icone className="size-6" />
      </span>
      <p className="font-medium text-foreground">{titulo}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
