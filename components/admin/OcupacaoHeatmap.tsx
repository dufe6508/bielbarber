import type { OcupacaoHeatmap } from "@/lib/admin/metrics";

// Heatmap dia da semana × hora. Grade CSS pura, escala de opacidade onyx
// (primary) — sem dependência nova. Célula vazia fica neutra.
export function OcupacaoHeatmap({ horas, dias, max }: OcupacaoHeatmap) {
  if (!horas.length || max === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem ocupação no período.
      </p>
    );
  }

  // Mostra só dias que têm algum atendimento (some dom/seg vazios sem ruído).
  const linhas = dias.filter((d) => d.celulas.some((c) => c > 0));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Cabeçalho de horas */}
        <div className="mb-1 flex gap-1 pl-9">
          {horas.map((h) => (
            <div
              key={h}
              className="w-7 text-center font-mono text-[10px] tabular-nums text-muted-foreground"
            >
              {h.slice(0, 2)}
            </div>
          ))}
        </div>

        {linhas.map((linha) => (
          <div key={linha.dow} className="mb-1 flex items-center gap-1">
            <div className="w-8 text-right text-[11px] font-medium capitalize text-muted-foreground">
              {linha.dia}
            </div>
            <div className="flex gap-1">
              {linha.celulas.map((c, i) => {
                const intensidade = c / max; // 0..1
                return (
                  <div
                    key={i}
                    title={`${linha.dia} ${horas[i]} · ${c} atend.`}
                    className="flex size-7 items-center justify-center rounded-md border border-border/40 font-mono text-[10px] tabular-nums"
                    style={{
                      backgroundColor:
                        c === 0
                          ? "var(--muted)"
                          : `color-mix(in oklch, var(--primary) ${Math.round(
                              20 + intensidade * 80
                            )}%, transparent)`,
                      color:
                        intensidade > 0.5
                          ? "var(--primary-foreground)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {c > 0 ? c : ""}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Legenda */}
        <div className="mt-3 flex items-center gap-2 pl-9 text-[11px] text-muted-foreground">
          <span>menos</span>
          {[0.2, 0.45, 0.7, 1].map((o) => (
            <span
              key={o}
              className="size-3 rounded-sm"
              style={{
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                  o * 100
                )}%, transparent)`,
              }}
            />
          ))}
          <span>mais</span>
        </div>
      </div>
    </div>
  );
}
