"use client";

import { useCallback, useEffect, useRef } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

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
  onReadyChange,
}: {
  amount: number;
  chargeId: string;
  onResult: (r: ResultadoPagamento) => void;
  onErro: (msg?: string) => void;
  onReadyChange?: (pronto: boolean) => void;
}) {
  // Refs para callbacks — assim as funções passadas ao <Payment> têm
  // referência ESTÁVEL entre renders e o Brick não se reinicializa.
  const onResultRef = useRef(onResult);
  const onErroRef = useRef(onErro);
  const onReadyRef = useRef(onReadyChange);
  onResultRef.current = onResult;
  onErroRef.current = onErro;
  onReadyRef.current = onReadyChange;

  useEffect(() => {
    if (!PUB) {
      onErroRef.current?.("Pagamento no app indisponível");
      return;
    }
    if (!inited) {
      initMercadoPago(PUB, { locale: "pt-BR" });
      inited = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Callbacks com deps vazias — referência estável para o SDK do MP não
  // destruir e recriar o Brick a cada re-render do componente pai.
  const handleReady = useCallback(() => {
    onReadyRef.current?.(true);
  }, []);

  const handleError = useCallback((e: { message?: string }) => {
    onErroRef.current?.(e?.message);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = useCallback(async ({ formData }: { formData: any }) => {
    const res = await fetch("/api/pagamentos/mercadopago/processar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeId, formData }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      onErroRef.current?.(d?.error);
      throw new Error(d?.error ?? "Falha no pagamento");
    }
    if (d?.pix) {
      onResultRef.current({
        tipo: "pix",
        qrCode: d.pix.qrCode,
        qrCodeBase64: d.pix.qrCodeBase64,
        ticketUrl: d.pix.ticketUrl,
      });
      return;
    }
    if (d?.status === "approved") {
      onResultRef.current({ tipo: "aprovado" });
      return;
    }
    if (d?.status === "in_process" || d?.status === "pending") {
      onResultRef.current({ tipo: "pendente" });
      return;
    }
    // Rejeitado — deixa o Brick exibir o erro e permitir nova tentativa.
    throw new Error("Pagamento recusado. Tente outro cartão.");
  // chargeId é parte da URL — OK como dep estável (não muda durante a sessão)
  }, [chargeId]);

  if (!PUB) {
    return null; // O PagamentoDrawer já lida com o fallback
  }

  return (
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
      onReady={handleReady}
      onError={handleError}
      onSubmit={handleSubmit}
    />
  );
}
