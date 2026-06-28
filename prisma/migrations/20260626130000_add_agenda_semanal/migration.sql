-- Agenda semanal: horas abertas por dia da semana (template recorrente do barbeiro).
CREATE TABLE "agenda_semanal" (
    "dia_semana" INTEGER NOT NULL,
    "horarios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_semanal_pkey" PRIMARY KEY ("dia_semana")
);
