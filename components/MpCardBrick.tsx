"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

// Brick de cartão do Mercado Pago (Card Payment) — SÓ o formulário de cartão,
// sem seletor de método nem Pix. Usado no passo "Cartão" do PagamentoDrawer,
// depois que o cliente já escolheu o método na nossa própria tela. Tokeniza o
// cartão no navegador (o número nunca passa pelo nosso servidor) e envia o
// formData para /api/pagamentos/mercadopago/processar, que cobra o valor
// autoritativo do servidor.

const PUB = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
let inited = false;

export type ResultadoCartao = { tipo: "aprovado" } | { tipo: "pendente" };

export function MpCardBrick({
  amount,
  chargeId,
  onResult,
  onErro,
  onReadyChange,
}: {
  amount: number;
  chargeId: string;
  onResult: (r: ResultadoCartao) => void;
  onErro: (msg?: string) => void;
  onReadyChange?: (pronto: boolean) => void;
}) {
  const onResultRef = useRef(onResult);
  const onErroRef = useRef(onErro);
  const onReadyRef = useRef(onReadyChange);
  useEffect(() => {
    onResultRef.current = onResult;
    onErroRef.current = onErro;
    onReadyRef.current = onReadyChange;
  });

  useEffect(() => {
    if (!PUB) {
      onErroRef.current?.("Pagamento no app indisponível");
      return;
    }
    if (!inited) {
      initMercadoPago(PUB, { locale: "pt-BR" });
      inited = true;
    }
  }, []);

  const handleReady = useCallback(() => {
    onReadyRef.current?.(true);
  }, []);

  const handleError = useCallback((e: { message?: string }) => {
    onErroRef.current?.(e?.message);
  }, []);

  // O Card Payment Brick entrega o formData direto (diferente do Payment Brick,
  // que envolve em { selectedPaymentMethod, formData }).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = useCallback(async (formData: any): Promise<void> => {
    let res: Response;
    try {
      res = await fetch("/api/pagamentos/mercadopago/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId, formData }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      onErroRef.current?.("Sem resposta do servidor. Tente novamente.");
      throw new Error("Tempo esgotado ao processar o pagamento.");
    }
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      onErroRef.current?.(d?.detalhe ?? d?.error);
      throw new Error(d?.detalhe ?? d?.error ?? "Falha no pagamento");
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
    // chargeId é estável durante a sessão — OK como dep.
  }, [chargeId]);

  // O wrapper React do Brick re-inicializa sempre que `initialization` muda de
  // referência (está nas deps do useEffect dele). Passar `{ amount }` inline
  // criava um objeto novo a cada render do drawer, o que fazia o Brick ficar
  // preso no skeleton. Memoizar mantém a referência estável.
  const initialization = useMemo(() => ({ amount }), [amount]);

  if (!PUB) return null;

  return (
    <CardPayment
      initialization={initialization}
      onReady={handleReady}
      onError={handleError}
      onSubmit={handleSubmit}
    />
  );
}
