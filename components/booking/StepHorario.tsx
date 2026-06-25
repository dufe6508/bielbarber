"use client";

import { useQuery } from "@tanstack/react-query";
import { useBooking } from "@/lib/store/booking";
import { formatarDataExtenso } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// Próximos N dias disponíveis (pula domingo=0 e segunda=1 — folga)
function proximosDias(qtd: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const cursor = new Date(hoje);

  while (dias.length < qtd) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 1) dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function dataParaISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function StepHorario() {
  const { data, horario, setData, setHorario } = useBooking();
  const dias = proximosDias(12);

  const { data: slots, isLoading } = useQuery<string[]>({
    queryKey: ["slots", data],
    queryFn: async () => {
      const res = await fetch(`/api/slots?data=${data}`);
      if (!res.ok) throw new Error("Erro ao carregar horários");
      return res.json();
    },
    enabled: !!data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Escolha o dia e horário
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atendemos de terça a sábado.
        </p>
      </div>

      {/* Dias — scroll horizontal */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dias.map((d) => {
          const iso = dataParaISO(d);
          const ativo = data === iso;
          const partes = formatarDataExtenso(d).split(", ");
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setData(iso)}
              aria-pressed={ativo}
              className={cn(
                "flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-[transform,border-color,background-color] active:scale-95",
                ativo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              )}
            >
              <span className="text-xs font-medium uppercase opacity-80">
                {partes[0]}
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {partes[1]?.split(" ")[0]}
              </span>
              <span className="text-[10px] uppercase opacity-70">
                {partes[1]?.split(" ")[1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horários */}
      {!data ? (
        <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
          Selecione um dia para ver os horários.
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : slots && slots.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((h) => {
            const ativo = horario === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHorario(h)}
                aria-pressed={ativo}
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg border font-mono text-sm font-medium tabular-nums transition-[transform,border-color,background-color] active:scale-95",
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                )}
              >
                {h}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
          Nenhum horário disponível neste dia.
        </p>
      )}
    </div>
  );
}
