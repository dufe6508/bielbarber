import Link from "next/link";
import { Clock, ChevronRight, CalendarOff } from "lucide-react";
import { formatarPreco } from "@/lib/utils/format";

export type ProximoAtendimento = {
  id: string;
  data: string; // YYYY-MM-DD
  horarioInicio: string; // HH:MM
  cliente: string;
  servicos: string[];
  valorTotal: number;
};

// "YYYY-MM-DD" local de hoje/amanhã, para rótulos relativos sem off-by-one.
function chaveLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function rotuloDia(data: string): { relativo: string | null; dataCurta: string } {
  const [a, m, d] = data.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const hojeKey = chaveLocal(hoje);
  const amanhaKey = chaveLocal(amanha);
  const relativo = data === hojeKey ? "Hoje" : data === amanhaKey ? "Amanhã" : null;
  const dataCurta = dt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return { relativo, dataCurta };
}

// Lista de próximos atendimentos agrupada por dia. Destaca horário, cliente e
// serviço, com leitura rápida no mobile (cartões com bloco de hora à esquerda).
export function ProximosAtendimentos({ itens }: { itens: ProximoAtendimento[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <CalendarOff className="size-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
      </div>
    );
  }

  // Agrupa por data preservando a ordem (já vem ordenado por data/horário).
  const grupos: { data: string; itens: ProximoAtendimento[] }[] = [];
  for (const it of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === it.data) ultimo.itens.push(it);
    else grupos.push({ data: it.data, itens: [it] });
  }

  return (
    <div className="space-y-4">
      {grupos.map((g) => {
        const { relativo, dataCurta } = rotuloDia(g.data);
        return (
          <div key={g.data}>
            {/* Cabeçalho do dia */}
            <div className="mb-2 flex items-center gap-2 px-0.5">
              {relativo && (
                <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  {relativo}
                </span>
              )}
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {dataCurta}
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/60">
                {g.itens.length} {g.itens.length === 1 ? "horário" : "horários"}
              </span>
            </div>

            {/* Cartões do dia */}
            <ul className="space-y-2">
              {g.itens.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/admin/agendamentos"
                    className="group flex items-stretch gap-3 rounded-xl border border-border bg-card p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0"
                  >
                    {/* Bloco de horário — destaque visual */}
                    <div className="flex w-[58px] shrink-0 flex-col items-center justify-center rounded-lg bg-muted/70 py-1.5">
                      <Clock className="mb-0.5 size-3 text-muted-foreground/70" />
                      <span className="font-mono text-sm font-bold tabular-nums leading-none text-foreground">
                        {a.horarioInicio}
                      </span>
                    </div>

                    {/* Cliente + serviços */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">
                        {a.cliente}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.servicos.slice(0, 3).map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex max-w-full truncate rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                        {a.servicos.length > 3 && (
                          <span className="inline-flex rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            +{a.servicos.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor + chevron */}
                    <div className="flex shrink-0 items-center gap-1 self-center">
                      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                        {a.valorTotal > 0 ? formatarPreco(a.valorTotal) : "—"}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
