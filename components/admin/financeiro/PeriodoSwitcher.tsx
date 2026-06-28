"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPCOES = [
  { id: "dia", rotulo: "Hoje" },
  { id: "semana", rotulo: "Semana" },
  { id: "mes", rotulo: "Mês" },
  { id: "ano", rotulo: "Ano" },
];

export function PeriodoSwitcher({ atual }: { atual: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function trocar(id: string) {
    const p = new URLSearchParams(params.toString());
    p.set("periodo", id);
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1">
      {OPCOES.map((o) => (
        <button
          key={o.id}
          onClick={() => trocar(o.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            atual === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
