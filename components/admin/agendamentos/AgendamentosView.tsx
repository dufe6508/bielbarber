"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CalendarRange, List } from "lucide-react";
import { AgendaDia } from "@/components/admin/agendamentos/AgendaDia";
import { AgendamentosManager } from "@/components/admin/agendamentos/AgendamentosManager";
import { cn } from "@/lib/utils";

// Vindo de um card de status (ex.: ?status=concluido) já abre na Lista.
export function AgendamentosView() {
  const params = useSearchParams();
  const temStatus = !!params.get("status");
  const [aba, setAba] = useState<"dia" | "lista">(temStatus ? "lista" : "dia");

  const abas = [
    { id: "dia" as const, rotulo: "Agenda do dia", icone: CalendarRange },
    { id: "lista" as const, rotulo: "Lista", icone: List },
  ];

  return (
    <div>
      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {abas.map((a) => {
          const Icone = a.icone;
          const on = a.id === aba;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {on && (
                <motion.span
                  layoutId="agview-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
              <Icone className="relative size-3.5" />
              <span className="relative">{a.rotulo}</span>
            </button>
          );
        })}
      </div>

      {aba === "dia" ? <AgendaDia /> : <AgendamentosManager />}
    </div>
  );
}
