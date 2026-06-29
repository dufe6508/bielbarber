-- Adiciona canal push e tipo geral ao enum de notificações
-- Adiciona campo lida ao log de notificações (inbox do cliente)

ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'push';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'geral';

ALTER TABLE "log_notificacoes"
  ADD COLUMN IF NOT EXISTS "lida" BOOLEAN NOT NULL DEFAULT false;
