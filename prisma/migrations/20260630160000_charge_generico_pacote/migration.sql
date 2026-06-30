-- CreateEnum: o que a cobrança paga (generaliza além do mensalista)
CREATE TYPE "ChargeType" AS ENUM ('mensalista', 'pacote');

-- AlterTable: tipo da cobrança + suporte a cobrança de pacote
ALTER TABLE "cobrancas_mensalidade" ADD COLUMN "tipo" "ChargeType" NOT NULL DEFAULT 'mensalista';
ALTER TABLE "cobrancas_mensalidade" ALTER COLUMN "mensalista_id" DROP NOT NULL;
ALTER TABLE "cobrancas_mensalidade" ADD COLUMN "pacote_id" TEXT;
ALTER TABLE "cobrancas_mensalidade" ADD COLUMN "cliente_pacote_id" TEXT;
