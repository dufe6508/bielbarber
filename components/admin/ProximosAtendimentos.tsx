import Link from "next/link";
import { formatarPreco } from "@/lib/utils/format";

export type ProximoAtendimento = {
  id: string;
  data: string; // YYYY-MM-DD
  horarioInicio: string; // HH:MM
  cliente: string;
  servicos: string[];
  valorTotal: number;
};

// Lista compacta de próximos atendimentos — uma linha por horário, sem cartões
// nem agrupamento por dia. Layout minimalista (hora+data à esquerda, cliente/
// serviço no meio, valor à direita), pensado para leitura rápida no painel.
export function ProximosAtendimentos({ itens }: { itens: ProximoAtendimento[] }) {
  if (itens.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum agendamento futuro.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {itens.map((a) => {
        const [ano, mes, dia] = a.data.split("-").map(Number);
        const label = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
        return (
          <li key={a.id}>
            <Link
              href="/admin/agendamentos"
              className="flex items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-accent/30"
            >
              <div className="flex w-24 shrink-0 flex-col items-end">
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {a.horarioInicio}
                </span>
                <span className="text-[11px] capitalize text-muted-foreground">{label}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.cliente}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.servicos.join(", ")}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {a.valorTotal > 0 ? formatarPreco(a.valorTotal) : "—"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
