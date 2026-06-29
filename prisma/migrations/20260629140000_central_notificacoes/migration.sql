-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('cliente', 'admin');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('agenda', 'pagamentos', 'mensalistas', 'assinaturas', 'loja', 'sistema', 'promocoes');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "audiencia" "NotificationAudience" NOT NULL,
    "cliente_id" TEXT,
    "categoria" "NotificationCategory" NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "prioridade" "NotificationPriority" NOT NULL DEFAULT 'normal',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "fixada" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "metadata" JSONB,
    "lida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacoes_audiencia_lida_criado_em_idx" ON "notificacoes"("audiencia", "lida", "criado_em");

-- CreateIndex
CREATE INDEX "notificacoes_cliente_id_criado_em_idx" ON "notificacoes"("cliente_id", "criado_em");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: extensões de preferências de notificação
ALTER TABLE "preferencias_notificacao"
    ADD COLUMN "sistema_ativo" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "email_ativo" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "quiet_inicio" INTEGER,
    ADD COLUMN "quiet_fim" INTEGER;
