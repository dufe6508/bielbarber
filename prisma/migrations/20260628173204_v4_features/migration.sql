-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('percentual', 'fixo', 'gratis');

-- AlterTable
ALTER TABLE "agenda_semanal" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "checkin_em" TIMESTAMP(3),
ADD COLUMN     "cupom_id" TEXT,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "rating_comentario" TEXT,
ADD COLUMN     "rating_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "aniversario" DATE,
ADD COLUMN     "carimbos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "motivo_bloqueio" TEXT;

-- AlterTable
ALTER TABLE "pacotes" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "servicos" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "blocos_tempo" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "inicio" TEXT NOT NULL,
    "fim" TEXT NOT NULL,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocos_tempo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_notificacao" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "push_ativo" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_ativo" BOOLEAN NOT NULL DEFAULT false,
    "confirmacao" BOOLEAN NOT NULL DEFAULT true,
    "lembrete" BOOLEAN NOT NULL DEFAULT true,
    "promocao" BOOLEAN NOT NULL DEFAULT false,
    "assinatura_vencendo" BOOLEAN NOT NULL DEFAULT true,
    "estoque_novo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "preferencias_notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galeria_categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "preco_medio" DECIMAL(10,2),
    "imagem_capa" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "servico_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "galeria_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galeria_imagens" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "url_imagem" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "galeria_imagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_espera" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lista_espera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupons" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "CouponType" NOT NULL,
    "valor" DECIMAL(10,2),
    "uso_maximo" INTEGER,
    "usos_feitos" INTEGER NOT NULL DEFAULT 0,
    "expiracao_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "url_imagem" TEXT NOT NULL,
    "legenda" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocos_tempo_data_idx" ON "blocos_tempo"("data");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_cliente_id_idx" ON "push_subscriptions"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificacao_cliente_id_key" ON "preferencias_notificacao"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "galeria_categorias_slug_key" ON "galeria_categorias"("slug");

-- CreateIndex
CREATE INDEX "galeria_imagens_categoria_id_ordem_idx" ON "galeria_imagens"("categoria_id", "ordem");

-- CreateIndex
CREATE INDEX "lista_espera_data_idx" ON "lista_espera"("data");

-- CreateIndex
CREATE UNIQUE INDEX "lista_espera_cliente_id_data_key" ON "lista_espera"("cliente_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "cupons_codigo_key" ON "cupons"("codigo");

-- CreateIndex
CREATE INDEX "fotos_cliente_cliente_id_idx" ON "fotos_cliente"("cliente_id");

-- CreateIndex
CREATE INDEX "agendamentos_data_status_idx" ON "agendamentos"("data", "status");

-- CreateIndex
CREATE INDEX "agendamentos_cliente_id_idx" ON "agendamentos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "pacotes_slug_key" ON "pacotes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_mensalista_id_periodo_cobranca_key" ON "pagamentos"("mensalista_id", "periodo_cobranca");

-- CreateIndex
CREATE INDEX "pedidos_criado_em_status_pagamento_idx" ON "pedidos"("criado_em", "status_pagamento");

-- CreateIndex
CREATE INDEX "pedidos_cliente_id_idx" ON "pedidos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_slug_key" ON "produtos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_slug_key" ON "servicos"("slug");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "cupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_notificacao" ADD CONSTRAINT "preferencias_notificacao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria_categorias" ADD CONSTRAINT "galeria_categorias_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria_imagens" ADD CONSTRAINT "galeria_imagens_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "galeria_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_cliente" ADD CONSTRAINT "fotos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
