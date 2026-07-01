"use client";

import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  Calendar,
  CalendarClock,
  Clock,
  X,
  Award,
  Star,
  Package as PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { RatingDrawer } from "@/components/RatingDrawer";
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
  rating: number | null;
};
type PacoteSaldoCliente = {
  nome: string;
  usosTotais: number | null;
  usosRestantes: number | null;
  expiraEm: string | null;
  status: "ativo" | "expirado" | "encerrado";
  diasParaVencer: number | null;
  limiteSemanal: number | null;
  usosNaSemana: number;
  bloqueado: boolean;
};
type Resultado = {
  nome: string;
  pacotes?: PacoteSaldoCliente[];
  agendamentos: Agendamento[];
};

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill do telefone lembrado no mount
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
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

          <Fidelidade
            concluidos={
              consulta.data.agendamentos.filter((a) => a.status === "concluido").length
            }
          />

          {consulta.data.pacotes && consulta.data.pacotes.length > 0 && (
            <MeusPacotes pacotes={consulta.data.pacotes} />
          )}

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
  telefone,
  onMudou,
}: {
  agendamento: Agendamento;
  telefone: string;
  onMudou: () => void;
}) {
  const v = visualDe(a);
  const [remarcando, setRemarcando] = useState(false);
  const [avaliando, setAvaliando] = useState(false);

  const cancelar = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/agendamentos/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "cancelar", telefone }),
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
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      {/* Faixa lateral de status */}
      <span className={cn("absolute inset-y-0 left-0 w-1", v.faixa)} />

      <div className="p-3 pl-3.5">
        {/* Linha 1: data/hora à esquerda · status + valor à direita */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-heading text-sm font-semibold leading-tight tracking-tight text-foreground">
                {capitalizar(formatarDataExtenso(a.data).replace(/\./g, ""))}
              </p>
              {relevante(a.data) && (
                <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">
                  {rotuloRelativo(a.data)}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {a.horarioInicio}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                v.badge
              )}
            >
              {v.rotulo}
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {formatarPreco(a.valorTotal)}
            </span>
          </div>
        </div>

        {/* Serviços — pills discretas */}
        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-dashed border-border pt-2.5">
          {a.servicos.map((s) => (
            <span
              key={s.nome}
              className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
            >
              {s.nome}
            </span>
          ))}
        </div>

        {/* Ações (só para agendado futuro, até 1h antes) */}
        {v.ativo && v.podeAlterar && (
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setRemarcando((x) => !x)}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
            >
              <CalendarClock className="size-3.5" />
              Remarcar
            </button>
            <button
              type="button"
              onClick={() => cancelar.mutate()}
              disabled={cancelar.isPending}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-50"
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

        {/* Avaliação pós-corte — só para concluídos */}
        {a.status === "concluido" &&
          (a.rating ? (
            <div className="mt-3 flex items-center gap-1 border-t border-dashed border-border pt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-4",
                    n <= a.rating!
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">
                Você avaliou
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAvaliando(true)}
              className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
            >
              <Star className="size-3.5" />
              Avaliar este corte
            </button>
          ))}

        <RatingDrawer
          open={avaliando}
          onOpenChange={setAvaliando}
          agendamentoId={a.id}
          telefone={telefone}
          onAvaliado={() => onMudou()}
        />

        {/* Remarcar — inline */}
        <AnimatePresence>
          {remarcando && (
            <Remarcar
              id={a.id}
              telefone={telefone}
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
  telefone,
  onFechar,
  onPronto,
}: {
  id: string;
  telefone: string;
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
        body: JSON.stringify({ acao: "remarcar", data, horario, telefone }),
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

// ─── Saldo de pacotes do cliente ────────────────────────────────────────────
function MeusPacotes({ pacotes }: { pacotes: PacoteSaldoCliente[] }) {
  return (
    <div className="mt-4 space-y-2.5">
      {pacotes.map((p, i) => {
        const temSaldo = p.usosTotais != null;
        const restante = p.usosRestantes ?? 0;
        const encerrado = p.status === "encerrado";
        const vencido = p.status === "expirado" || (p.diasParaVencer != null && p.diasParaVencer < 0);
        const inativo = encerrado || vencido;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3",
              inativo ? "border-border bg-muted/30 opacity-75" : "border-primary/30 bg-primary/[0.04]"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                inativo ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
              )}
            >
              <PackageIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                {p.nome}
              </p>
              <p className="text-xs text-muted-foreground">
                {encerrado
                  ? "Pacote concluído"
                  : vencido
                    ? "Pacote vencido"
                    : p.diasParaVencer != null
                      ? `Válido por mais ${p.diasParaVencer} dias`
                      : "Ativo"}
                {!inativo && p.limiteSemanal != null && (
                  <> · {p.usosNaSemana}/{p.limiteSemanal} nesta semana</>
                )}
              </p>
            </div>
            {temSaldo && (
              <div className="shrink-0 text-right">
                <p className="font-mono text-xl font-bold tabular-nums leading-none text-foreground">
                  {restante}
                  <span className="text-sm font-medium text-muted-foreground">/{p.usosTotais}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">cortes</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Selo de fidelidade ─────────────────────────────────────────────────────
// Mostra quantos cortes o cliente já concluiu — reconhecimento leve, sem login
// nem backend novo. A partir de 5 cortes, vira "cliente fiel".
function Fidelidade({ concluidos }: { concluidos: number }) {
  if (concluidos < 1) return null;
  const fiel = concluidos >= 5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3",
        fiel
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border bg-card"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          fiel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Award className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-base font-semibold tracking-tight text-foreground">
          {concluidos} {concluidos === 1 ? "corte concluído" : "cortes concluídos"}
        </p>
        <p className="text-xs text-muted-foreground">
          {fiel ? "Cliente fiel da casa. Valeu pela parceria!" : "Obrigado por voltar sempre."}
        </p>
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
