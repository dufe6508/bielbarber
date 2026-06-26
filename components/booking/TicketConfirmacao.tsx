"use client";

import { motion } from "framer-motion";
import { Check, MapPin } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import { formatarPreco, formatarData } from "@/lib/utils/format";

const rotuloPagamento: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  local: "No local",
  mensalista: "Mensalista (ciclo)",
};

export function TicketConfirmacao() {
  const { servicos, extras, data, horario, formaPagamento, nome, valorTotal, reset } =
    useBooking();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="space-y-6"
    >
      {/* Selo de sucesso */}
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
          className="flex size-16 items-center justify-center rounded-full bg-primary/10"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-6" strokeWidth={3} aria-hidden="true" />
          </div>
        </motion.div>
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Agendamento confirmado
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Te esperamos, {nome.split(" ")[0]}!
          </p>
        </div>
      </div>

      {/* Ticket */}
      <div className="relative">
        {/* recortes laterais (efeito ingresso) */}
        <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
        <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Cabeçalho do ticket */}
          <div className="bg-foreground px-5 py-5 text-center">
            <p className="font-heading text-lg font-bold tracking-tight text-background">
              Biel Barber Shop
            </p>
          </div>

          {/* Corpo */}
          <div className="space-y-4 px-5 py-5">
            <LinhaTicket
              rotulo="Data"
              valor={data ? formatarData(data) : "—"}
              mono
            />
            <LinhaTicket rotulo="Horário" valor={horario ?? "—"} mono />

            <div className="border-t border-dashed border-border pt-4">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Serviços
              </p>
              <div className="space-y-2">
                {servicos.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-sm text-foreground">{s.nome}</span>
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {formatarPreco(s.preco)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {extras.length > 0 && (
              <div className="border-t border-dashed border-border pt-4">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Produtos
                </p>
                <div className="space-y-2">
                  {extras.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">
                        {e.qtd}× {e.nome}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-foreground">
                        {formatarPreco(e.preco * e.qtd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-dashed border-border pt-4">
              <span className="font-heading text-base font-semibold tracking-tight text-foreground">
                Total
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-primary">
                {formatarPreco(valorTotal())}
              </span>
            </div>

            <LinhaTicket
              rotulo="Pagamento"
              valor={formaPagamento ? rotuloPagamento[formaPagamento] : "—"}
            />
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-center gap-1.5 border-t border-dashed border-border bg-muted/40 px-5 py-3">
            <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              Av. Serrinha, 82 · Vale do Jatobá, BH · 30692-600
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-[transform,background-color] hover:bg-muted active:scale-[0.99]"
      >
        Fazer novo agendamento
      </button>
    </motion.div>
  );
}

function LinhaTicket({
  rotulo,
  valor,
  mono,
}: {
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </span>
      <span
        className={
          mono
            ? "font-mono text-sm font-medium tabular-nums text-foreground"
            : "text-sm font-medium text-foreground"
        }
      >
        {valor}
      </span>
    </div>
  );
}
