-- AlterTable: buckets de lembrete já enviados (dedup do cron de lembretes)
ALTER TABLE "agendamentos"
    ADD COLUMN "lembretes_enviados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
