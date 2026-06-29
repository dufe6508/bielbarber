"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";

// Wrapper do Payment Brick do Mercado Pago. Carregado só no cliente (via dynamic
// import com ssr:false no drawer) — o SDK depende de `window`. Tokeniza o cartão
// no navegador (o número nunca passa pelo nosso servidor) e o formData vai para
// /api/pagamentos/mercadopago/processar, que cobra o valor autoritativo.

const PUB = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
let inited = false;

export type ResultadoPagamento =
  | { tipo: "aprovado" }
  | { tipo: "pendente" }
  | { tipo: "pix"; qrCode: string; qrCodeBase64: string; ticketUrl: string | null };

export function MpPaymentBrick({
  amount,
  chargeId,
  onResult,
  onErro,
}: {
  amount: number;
  chargeId: string;
  onResult: (r: ResultadoPagamento) => void;
  onErro: (msg?: string) => void;
}) {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (PUB && !inited) {
      initMercadoPago(PUB, { locale: "pt-BR" });
      inited = true;
    }
  }, []);

  if (!PUB) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Pagamento online indisponível no momento. Fale com a barbearia para
        quitar a mensalidade.
      </p>
    );
  }

  return (
    <div className="relative min-h-[180px]">
      {!pronto && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando pagamento…
        </div>
      )}
      <Payment
        initialization={{ amount }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            bankTransfer: ["pix"],
          },
          visual: {
            style: {
              customVariables: {
                baseColor: "#1c1d20",
                textPrimaryColor: "#18191b",
                textSecondaryColor: "#6b6d72",
                borderRadiusMedium: "12px",
                borderRadiusLarge: "16px",
              },
            },
          },
        }}
        onReady={() => setPronto(true)}
        onError={(e) => onErro(e?.message)}
        onSubmit={async ({ formData }) => {
          const res = await fetch("/api/pagamentos/mercadopago/processar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chargeId, formData }),
          });
          const d = await res.json().catch(() => null);
          if (!res.ok) {
            onErro(d?.error);
            throw new Error(d?.error ?? "Falha no pagamento");
          }
          if (d?.pix) {
            onResult({
              tipo: "pix",
              qrCode: d.pix.qrCode,
              qrCodeBase64: d.pix.qrCodeBase64,
              ticketUrl: d.pix.ticketUrl,
            });
            return;
          }
          if (d?.status === "approved") {
            onResult({ tipo: "aprovado" });
            return;
          }
          if (d?.status === "in_process" || d?.status === "pending") {
            onResult({ tipo: "pendente" });
            return;
          }
          // rejeitado — deixa o Brick exibir o erro e permitir nova tentativa.
          throw new Error("Pagamento recusado. Tente outro cartão.");
        }}
      />
    </div>
  );
}
