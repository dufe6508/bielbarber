/*
  Warnings:

  - You are about to drop the column `cupom_id` on the `agendamentos` table. All the data in the column will be lost.
  - You are about to drop the `cupons` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('aluguel', 'agua', 'luz', 'internet', 'produtos', 'funcionarios', 'impostos', 'manutencao', 'marketing', 'outros');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('pago', 'pendente');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('percentual', 'fixo', 'nenhum');

-- DropForeignKey
ALTER TABLE "agendamentos" DROP CONSTRAINT "agendamentos_cupom_id_fkey";

-- AlterTable
ALTER TABLE "agendamentos" DROP COLUMN "cupom_id";

-- DropTable
DROP TABLE "cupons";

-- DropEnum
DROP TYPE "CouponType";

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "ExpenseCategory" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'pago',
    "observacao" TEXT,
    "recorrente_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas_recorrentes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "ExpenseCategory" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dia_vencimento" INTEGER,
    "data_inicio" DATE NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_recorrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_contabeis" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "AdjustmentType" NOT NULL,
    "motivo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_contabeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_imposto" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "modo" "TaxMode" NOT NULL DEFAULT 'nenhum',
    "taxa" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "valor_fixo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_imposto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE INDEX "despesas_recorrente_id_data_idx" ON "despesas"("recorrente_id", "data");

-- CreateIndex
CREATE INDEX "ajustes_contabeis_data_idx" ON "ajustes_contabeis"("data");

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_recorrente_id_fkey" FOREIGN KEY ("recorrente_id") REFERENCES "despesas_recorrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
