-- AlterEnum: novo status para pacote totalmente utilizado
ALTER TYPE "ClientPackageStatus" ADD VALUE 'encerrado';

-- CreateEnum: origem do uso de um pacote (automático ao concluir vs. manual)
CREATE TYPE "PackageUsageOrigin" AS ENUM ('automatico', 'manual');

-- AlterTable: total de usos concedidos pelo pacote (tipo quantidade)
ALTER TABLE "pacotes" ADD COLUMN "quantidade_total" INTEGER;

-- AlterTable: snapshot do total de usos no pacote do cliente
ALTER TABLE "cliente_pacotes" ADD COLUMN "usos_totais" INTEGER;

-- CreateTable: histórico de utilização (uma linha por corte descontado)
CREATE TABLE "cliente_pacote_usos" (
    "id" TEXT NOT NULL,
    "cliente_pacote_id" TEXT NOT NULL,
    "servico_id" TEXT,
    "agendamento_id" TEXT,
    "origem" "PackageUsageOrigin" NOT NULL DEFAULT 'manual',
    "usado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pacote_usos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cliente_pacote_usos_cliente_pacote_id_idx" ON "cliente_pacote_usos"("cliente_pacote_id");

-- AddForeignKey
ALTER TABLE "cliente_pacote_usos" ADD CONSTRAINT "cliente_pacote_usos_cliente_pacote_id_fkey" FOREIGN KEY ("cliente_pacote_id") REFERENCES "cliente_pacotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_pacote_usos" ADD CONSTRAINT "cliente_pacote_usos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
