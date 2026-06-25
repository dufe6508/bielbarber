-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('agendado', 'concluido', 'cancelado', 'nao_compareceu');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendente', 'pago', 'falhou');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'cartao', 'local');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('quantidade', 'combo');

-- CreateEnum
CREATE TYPE "ClientPackageStatus" AS ENUM ('ativo', 'expirado');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "OrderPickupStatus" AS ENUM ('pendente', 'pronto', 'retirado');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('agendamento', 'pedido', 'mensalista');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('confirmacao', 'lembrete', 'cobranca');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('enviado', 'falhou');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "pode_pagar_local" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "horario_inicio" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'agendado',
    "status_pagamento" "PaymentStatus" NOT NULL DEFAULT 'pendente',
    "forma_pagamento" "PaymentMethod" NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento_servicos" (
    "agendamento_id" TEXT NOT NULL,
    "servico_id" TEXT NOT NULL,
    "preco_na_hora" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "agendamento_servicos_pkey" PRIMARY KEY ("agendamento_id","servico_id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "quantidade_estoque" INTEGER NOT NULL DEFAULT 0,
    "url_imagem" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacotes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "PackageType" NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "validade_dias" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pacotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacote_servicos" (
    "pacote_id" TEXT NOT NULL,
    "servico_id" TEXT NOT NULL,

    CONSTRAINT "pacote_servicos_pkey" PRIMARY KEY ("pacote_id","servico_id")
);

-- CreateTable
CREATE TABLE "pacote_produtos" (
    "pacote_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pacote_produtos_pkey" PRIMARY KEY ("pacote_id","produto_id")
);

-- CreateTable
CREATE TABLE "cliente_pacotes" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pacote_id" TEXT NOT NULL,
    "comprado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usos_restantes" INTEGER,
    "expira_em" TIMESTAMP(3),
    "status" "ClientPackageStatus" NOT NULL DEFAULT 'ativo',

    CONSTRAINT "cliente_pacotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensalistas" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "dia_cobranca" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ativo',
    "total_ciclo_atual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "data_ultimo_pagamento" TIMESTAMP(3),
    "valor_ultimo_pagamento" DECIMAL(10,2),
    "proxima_cobranca" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensalistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status_pagamento" "PaymentStatus" NOT NULL DEFAULT 'pendente',
    "forma_pagamento" "PaymentMethod",
    "status_retirada" "OrderPickupStatus" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_na_hora" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "tipo_referencia" "ReferenceType" NOT NULL,
    "agendamento_id" TEXT,
    "pedido_id" TEXT,
    "mensalista_id" TEXT,
    "periodo_cobranca" DATE,
    "valor" DECIMAL(10,2) NOT NULL,
    "metodo" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pendente',
    "id_pagamento_mercadopago" TEXT,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_notificacoes" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" "NotificationType" NOT NULL,
    "canal" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_telefone_key" ON "clientes"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "mensalistas_cliente_id_key" ON "mensalistas"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_agendamento_id_key" ON "pagamentos"("agendamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_pedido_id_key" ON "pagamentos"("pedido_id");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_servicos" ADD CONSTRAINT "agendamento_servicos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_servicos" ADD CONSTRAINT "agendamento_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacote_servicos" ADD CONSTRAINT "pacote_servicos_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "pacotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacote_servicos" ADD CONSTRAINT "pacote_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacote_produtos" ADD CONSTRAINT "pacote_produtos_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "pacotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacote_produtos" ADD CONSTRAINT "pacote_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_pacotes" ADD CONSTRAINT "cliente_pacotes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_pacotes" ADD CONSTRAINT "cliente_pacotes_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "pacotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensalistas" ADD CONSTRAINT "mensalistas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_mensalista_id_fkey" FOREIGN KEY ("mensalista_id") REFERENCES "mensalistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_notificacoes" ADD CONSTRAINT "log_notificacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
