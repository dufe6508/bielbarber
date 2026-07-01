import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // O Payment Brick do Mercado Pago carrega um script externo (sdk.mercadopago.com)
            // e tokeniza o cartão dentro de um iframe do próprio domínio MP (PCI compliance) —
            // sem liberar script-src/frame-src pra eles, o SDK nunca inicializa e o Brick
            // fica preso no fallback ("Formulário bloqueado"), mesmo sem bloqueador nenhum.
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com; " +
              "style-src 'self' 'unsafe-inline' https://http2.mlstatic.com; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' https:; " +
              "frame-src 'self' https://www.mercadopago.com https://www.mercadolibre.com; " +
              "connect-src 'self' https: wss:;",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
