-- Campos novos de Serviço: capacidade por slot + ordem de exibição.
ALTER TABLE "servicos"
  ADD COLUMN "capacidade_por_slot" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

-- CMS da loja: categoria, badge, destaque e ordem.
ALTER TABLE "produtos"
  ADD COLUMN "categoria" TEXT,
  ADD COLUMN "badge" TEXT,
  ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

-- Exceções pontuais à agenda (feriados, folgas, pausas, aberturas extras).
CREATE TYPE "ScheduleExceptionType" AS ENUM ('fechado', 'horarios');

CREATE TABLE "agenda_excecoes" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" "ScheduleExceptionType" NOT NULL,
    "horarios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_excecoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agenda_excecoes_data_key" ON "agenda_excecoes"("data");

-- Planos recorrentes (assinatura) + destaque/ordem nos pacotes.
ALTER TABLE "pacotes"
  ADD COLUMN "quantidade_mensal" INTEGER,
  ADD COLUMN "limite_semanal" INTEGER,
  ADD COLUMN "renovavel" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

-- Configurações globais (chave/valor): horizonte de agendamento, etc.
CREATE TABLE "configuracoes" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave")
);
