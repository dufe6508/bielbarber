-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "vip" BOOLEAN NOT NULL DEFAULT false;
