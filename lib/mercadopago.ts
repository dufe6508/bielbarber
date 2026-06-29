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
async function client() {
  const { MercadoPagoConfig } = await import("mercadopago");
  return new MercadoPagoConfig({ accessToken: ACCESS_TOKEN! });
}

export type PreferenciaInput = {
  chargeId: string;
  titulo: string;
  valor: number;
  descricao?: string;
  pagadorNome?: string;
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
        back_urls: {
          success: `${base}/mensalista?pago=1`,
          pending: `${base}/mensalista?pendente=1`,
          failure: `${base}/mensalista?falhou=1`,
        },
        auto_return: "approved",
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
