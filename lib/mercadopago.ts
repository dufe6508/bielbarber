// ─── Gateway Mercado Pago (desacoplado) ─────────────────────────────────────
// Toda a estrutura de pagamento já existe; basta preencher MERCADOPAGO_ACCESS_TOKEN
// no ambiente para "ligar" a integração — nenhuma mudança de UI ou schema é
// necessária depois. Sem credencial, as funções retornam null e o app cai no
// fluxo manual (barbeiro confirma o pagamento na mão).
//
// Env esperadas:
//   MERCADOPAGO_ACCESS_TOKEN   — token privado (server-side)
//   NEXT_PUBLIC_MP_PUBLIC_KEY  — chave pública (Checkout Bricks, opcional)
//   NEXT_PUBLIC_APP_URL        — base p/ back_urls e notification_url

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

export function mpConfigurado(): boolean {
  return Boolean(ACCESS_TOKEN);
}

export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Importa o SDK só quando há credencial — mantém o build leve e desacoplado.
// timeout evita que uma chamada trave pra sempre (ex: rede instável) — sem
// isso, o Brick no cliente fica em loading infinito esperando uma promise
// que nunca resolve nem rejeita.
async function client() {
  const { MercadoPagoConfig } = await import("mercadopago");
  return new MercadoPagoConfig({
    accessToken: ACCESS_TOKEN!,
    options: { timeout: 10_000 },
  });
}

export type PreferenciaInput = {
  chargeId: string;
  titulo: string;
  valor: number;
  descricao?: string;
  pagadorNome?: string;
  // Sufixo base para back_urls (ex: "/mensalista", "/pacotes", "/loja"). Padrão: "/mensalista".
  backUrlPath?: string;
};

export type PreferenciaResult = {
  preferenceId: string;
  initPoint: string;
};

// Cria a preferência de pagamento (checkout). Retorna null se MP não configurado
// — o chamador trata o fallback (mostrar instrução de pagamento manual).
export async function criarPreferencia(
  input: PreferenciaInput
): Promise<PreferenciaResult | null> {
  if (!mpConfigurado()) return null;

  try {
    const { Preference } = await import("mercadopago");
    const pref = new Preference(await client());
    const base = baseUrl();
    // back_urls/auto_return exigem URL pública https — o MP rejeita localhost
    // (erro "auto_return invalid"). Em dev geramos a preferência sem eles.
    const publico = base.startsWith("https://") && !base.includes("localhost");
    const caminho = input.backUrlPath ?? "/mensalista";

    const res = await pref.create({
      body: {
        items: [
          {
            id: input.chargeId,
            title: input.titulo,
            description: input.descricao,
            quantity: 1,
            unit_price: input.valor,
            currency_id: "BRL",
          },
        ],
        // Liga o pagamento à nossa cobrança — o webhook usa isto.
        external_reference: input.chargeId,
        notification_url: `${base}/api/pagamentos/mercadopago/webhook`,
        ...(publico
          ? {
              back_urls: {
                success: `${base}${caminho}?pago=1`,
                pending: `${base}${caminho}?pendente=1`,
                failure: `${base}${caminho}?falhou=1`,
              },
              auto_return: "approved" as const,
            }
          : {}),
        statement_descriptor: "BIEL BARBER",
      },
    });

    if (!res.id || !res.init_point) return null;
    return { preferenceId: res.id, initPoint: res.init_point };
  } catch (err) {
    console.error("[mercadopago] erro ao criar preferência", err);
    return null;
  }
}

// ─── Checkout transparente (Payment Brick) ──────────────────────────────────
// Cria o pagamento direto pela API a partir do formData do Brick. O valor é
// SEMPRE o do servidor (input.valor) — nunca confiamos no que vem do cliente.
export type PagamentoInput = {
  chargeId: string;
  valor: number;
  descricao?: string;
  // formData do Payment Brick: token, payment_method_id, issuer_id, installments, payer.
  formData: Record<string, unknown>;
};

export type PixData = {
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
};

export type PagamentoCriado = {
  id: string;
  status: string | null;
  statusDetail: string | null;
  metodo: string | null;
  pix: PixData | null;
};

export async function criarPagamento(
  input: PagamentoInput
): Promise<PagamentoCriado | null> {
  if (!mpConfigurado()) return null;

  const fd = input.formData;
  const { Payment } = await import("mercadopago");
  const pagamento = new Payment(await client());

  const body: Record<string, unknown> = {
    transaction_amount: input.valor, // autoritativo (servidor)
    description: input.descricao ?? "Mensalidade — Biel Barber",
    payment_method_id: fd.payment_method_id,
    external_reference: input.chargeId,
    notification_url: `${baseUrl()}/api/pagamentos/mercadopago/webhook`,
    payer: fd.payer,
  };
  if (fd.token) body.token = fd.token;
  if (fd.installments) body.installments = Number(fd.installments);
  if (fd.issuer_id) body.issuer_id = fd.issuer_id;

  // Idempotência: cartão usa o token (único por tentativa); pix usa o chargeId
  // (evita gerar 2 QRs para a mesma cobrança).
  const idempotencyKey = `${input.chargeId}:${fd.token ?? fd.payment_method_id}`;

  const res = await pagamento.create({
    body,
    requestOptions: { idempotencyKey },
  });

  const poi = (
    res as { point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } } }
  ).point_of_interaction?.transaction_data;

  return {
    id: String(res.id),
    status: res.status ?? null,
    statusDetail: res.status_detail ?? null,
    metodo: res.payment_type_id ?? res.payment_method_id ?? null,
    pix: poi?.qr_code
      ? {
          qrCode: poi.qr_code,
          qrCodeBase64: poi.qr_code_base64 ?? "",
          ticketUrl: poi.ticket_url ?? null,
        }
      : null,
  };
}

export type PagamentoMP = {
  status: string | null; // approved | pending | rejected | cancelled | refunded ...
  metodo: string | null; // pix | credit_card | debit_card | ...
  externalReference: string | null; // = chargeId
  comprovanteUrl: string | null;
};

// Consulta um pagamento no MP (usado pelo webhook para confirmar de forma segura).
export async function consultarPagamento(
  mpPaymentId: string
): Promise<PagamentoMP | null> {
  if (!mpConfigurado()) return null;

  try {
    const { Payment } = await import("mercadopago");
    const pagamento = new Payment(await client());
    const res = await pagamento.get({ id: mpPaymentId });

    return {
      status: res.status ?? null,
      metodo: res.payment_type_id ?? res.payment_method_id ?? null,
      externalReference: res.external_reference ?? null,
      comprovanteUrl:
        (res as { transaction_details?: { external_resource_url?: string } })
          .transaction_details?.external_resource_url ?? null,
    };
  } catch (err) {
    console.error("[mercadopago] erro ao consultar pagamento", err);
    return null;
  }
}

// MP status → nosso ChargeStatus.
export function mapStatusMP(
  mpStatus: string | null
): "pago" | "pendente" | "cancelado" | "expirado" | null {
  switch (mpStatus) {
    case "approved":
      return "pago";
    case "in_process":
    case "pending":
    case "authorized":
      return "pendente";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelado";
    default:
      return null;
  }
}

// MP payment_type_id → nosso ChargeMethod.
export function mapMetodoMP(
  mpMetodo: string | null
): "pix" | "cartao_credito" | "cartao_debito" | "outro" {
  switch (mpMetodo) {
    case "pix":
    case "bank_transfer":
      return "pix";
    case "credit_card":
      return "cartao_credito";
    case "debit_card":
      return "cartao_debito";
    default:
      return "outro";
  }
}
