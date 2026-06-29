"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function AdminTabs({
  abas,
}: {
  abas: { id: string; rotulo: string; conteudo: React.ReactNode }[];
}) {
  const [ativa, setAtiva] = useState(abas[0]?.id);

  return (
    <div>
      <div className="mb-6 flex justify-center gap-1 border-b border-border">
        {abas.map((aba) => {
          const on = aba.id === ativa;
          return (
            <button
              key={aba.id}
              onClick={() => setAtiva(aba.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {aba.rotulo}
              {on && (
                <motion.div
                  layoutId="admin-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {abas.map(
        (aba) =>
          aba.id === ativa && (
            <motion.div
              key={aba.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {aba.conteudo}
            </motion.div>
          )
      )}
    </div>
  );
}
