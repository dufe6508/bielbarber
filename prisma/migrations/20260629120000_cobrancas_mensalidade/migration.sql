-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('pendente', 'pago', 'vencido', 'cancelado', 'expirado');

-- CreateEnum
CREATE TYPE "ChargeMethod" AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'outro');

-- CreateTable
CREATE TABLE "cobrancas_mensalidade" (
    "id" TEXT NOT NULL,
    "mensalista_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'pendente',
    "vencimento" DATE NOT NULL,
    "descricao" TEXT,
    "itens" JSONB,
    "emitida_manual" BOOLEAN NOT NULL DEFAULT false,
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "mp_init_point" TEXT,
    "metodo" "ChargeMethod",
    "comprovante_url" TEXT,
    "pago_em" TIMESTAMP(3),
    "ultimo_lembrete" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_mensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cobrancas_mensalidade_cliente_id_status_idx" ON "cobrancas_mensalidade"("cliente_id", "status");

-- CreateIndex
CREATE INDEX "cobrancas_mensalidade_mensalista_id_status_idx" ON "cobrancas_mensalidade"("mensalista_id", "status");

-- CreateIndex
CREATE INDEX "cobrancas_mensalidade_status_vencimento_idx" ON "cobrancas_mensalidade"("status", "vencimento");

-- AddForeignKey
ALTER TABLE "cobrancas_mensalidade" ADD CONSTRAINT "cobrancas_mensalidade_mensalista_id_fkey" FOREIGN KEY ("mensalista_id") REFERENCES "mensalistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_mensalidade" ADD CONSTRAINT "cobrancas_mensalidade_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
