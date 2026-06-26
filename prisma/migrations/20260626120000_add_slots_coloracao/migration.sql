-- Baseline de colunas já presentes no banco (aplicadas via Supabase MCP / fora do histórico).
-- Marcada como aplicada com `prisma migrate resolve --applied`; o SQL não é re-executado.

-- produtos.preco_antigo (preço "de/por" na loja)
ALTER TABLE "produtos" ADD COLUMN "preco_antigo" DECIMAL(10,2);

-- servicos.slots_necessarios — quantos horários de 1h o serviço ocupa (coloração = 2)
ALTER TABLE "servicos" ADD COLUMN "slots_necessarios" INTEGER NOT NULL DEFAULT 1;

-- agendamentos.slots — quantos horários de 1h o agendamento ocupa
ALTER TABLE "agendamentos" ADD COLUMN "slots" INTEGER NOT NULL DEFAULT 1;
