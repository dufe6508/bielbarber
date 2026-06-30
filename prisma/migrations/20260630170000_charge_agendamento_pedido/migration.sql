-- AlterEnum: cobrança também cobre agendamento avulso e pedido da loja
ALTER TYPE "ChargeType" ADD VALUE IF NOT EXISTS 'agendamento';
ALTER TYPE "ChargeType" ADD VALUE IF NOT EXISTS 'pedido';

-- AlterTable: vínculo da cobrança com o agendamento / pedido pago
ALTER TABLE "cobrancas_mensalidade" ADD COLUMN IF NOT EXISTS "agendamento_id" TEXT;
ALTER TABLE "cobrancas_mensalidade" ADD COLUMN IF NOT EXISTS "pedido_id" TEXT;
