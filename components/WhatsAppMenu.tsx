"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  TEMPLATES,
  linkTemplate,
  type TemplateWhatsApp,
  type VarsTemplate,
} from "@/lib/whatsapp/templates";
import { cn } from "@/lib/utils";

// Botão verde discreto que abre as mensagens prontas relevantes para o
// contexto. Cada item abre o WhatsApp (wa.me) já preenchido para o número do
// cliente. Aparece só quando há telefone e ao menos um template.
export function WhatsAppMenu({
  telefone,
  vars,
  templates,
  rotulo,
  className,
  align = "right",
}: {
  telefone: string;
  vars: VarsTemplate;
  templates: TemplateWhatsApp[];
  rotulo?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [aberto, setAberto] = useState(false);
  if (!telefone || templates.length === 0) return null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Enviar mensagem no WhatsApp"
        aria-expanded={aberto}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-500",
          aberto && "bg-emerald-500/10"
        )}
      >
        <WhatsAppIcon className="size-4" />
        {rotulo && <span>{rotulo}</span>}
      </button>

      <AnimatePresence>
        {aberto && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "absolute top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <WhatsAppIcon className="size-3" />
                Mensagens prontas
              </p>
              {templates.map((t) => (
                <a
                  key={t}
                  href={linkTemplate(telefone, t, vars)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAberto(false)}
                  className="block rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  {TEMPLATES[t].rotulo}
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
