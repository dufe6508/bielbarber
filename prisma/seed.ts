import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

// Serviços de exemplo — substituir pela lista real do barbeiro
const servicos = [
  { nome: "Corte", descricao: "Tesoura ou máquina, do clássico ao degradê", duracaoMinutos: 30, preco: 35 },
  { nome: "Corte + Barba", descricao: "Combo completo: corte na régua e barba feita", duracaoMinutos: 50, preco: 50 },
  { nome: "Barba", descricao: "Modelagem, toalha quente e acabamento na navalha", duracaoMinutos: 20, preco: 25 },
  { nome: "Sobrancelha", descricao: "Alinhamento na navalha ou pinça", duracaoMinutos: 10, preco: 10 },
  { nome: "Pigmentação", descricao: "Disfarça falhas e dá densidade ao cabelo ou barba", duracaoMinutos: 40, preco: 40 },
  { nome: "Pintura / Platinado", descricao: "Descoloração e coloração completa", duracaoMinutos: 90, preco: 120 },
  { nome: "Nevou (luzes)", descricao: "Mechas e luzes pra um visual marcante", duracaoMinutos: 90, preco: 100 },
  { nome: "Corte Infantil", descricao: "Paciência e cuidado com a criançada", duracaoMinutos: 30, preco: 30 },
];

// Produtos de exemplo — imagens fictícias (Unsplash, temática grooming)
const produtos = [
  {
    nome: "Pomada Modeladora",
    descricao: "Fixação forte, efeito matte",
    preco: 35,
    quantidadeEstoque: 12,
    urlImagem:
      "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=70",
  },
  {
    nome: "Gel Fixador",
    descricao: "Brilho e fixação",
    preco: 22,
    quantidadeEstoque: 20,
    urlImagem:
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=70",
  },
  {
    nome: "Óleo para Barba",
    descricao: "Hidrata e dá brilho",
    preco: 40,
    quantidadeEstoque: 8,
    urlImagem:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=70",
  },
  {
    nome: "Shampoo Anticaspa",
    descricao: "Limpeza profunda",
    preco: 28,
    quantidadeEstoque: 15,
    urlImagem:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=70",
  },
];

async function main() {
  for (const s of servicos) {
    const existe = await prisma.service.findFirst({ where: { nome: s.nome } });
    if (existe) {
      await prisma.service.update({
        where: { id: existe.id },
        data: { descricao: s.descricao },
      });
    } else {
      await prisma.service.create({ data: s });
    }
  }

  for (const p of produtos) {
    const existe = await prisma.product.findFirst({ where: { nome: p.nome } });
    if (existe) {
      await prisma.product.update({
        where: { id: existe.id },
        data: { descricao: p.descricao, urlImagem: p.urlImagem },
      });
    } else {
      await prisma.product.create({ data: p });
    }
  }

  // ─── Mensalista demo (para testar a tela do mensalista) ──────────────────
  const TELEFONE_DEMO = "31988887777";
  const clienteDemo = await prisma.client.upsert({
    where: { telefone: TELEFONE_DEMO },
    update: {},
    create: { nome: "Lucas Andrade", telefone: TELEFONE_DEMO },
  });

  // próximo dia 10
  const hoje = new Date();
  const proxDia10 = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
  if (proxDia10 <= hoje) proxDia10.setMonth(proxDia10.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { clienteId: clienteDemo.id },
    update: { status: "ativo", diaCobranca: 10, proximaCobranca: proxDia10 },
    create: {
      clienteId: clienteDemo.id,
      diaCobranca: 10,
      status: "ativo",
      proximaCobranca: proxDia10,
    },
  });

  // Cortes do ciclo (só cria se ainda não houver pendentes)
  const jaTem = await prisma.appointment.count({
    where: { clienteId: clienteDemo.id, statusPagamento: "pendente" },
  });

  if (jaTem === 0) {
    const corte = await prisma.service.findFirst({ where: { nome: "Corte" } });
    const corteBarba = await prisma.service.findFirst({
      where: { nome: "Corte + Barba" },
    });
    const barba = await prisma.service.findFirst({ where: { nome: "Barba" } });

    const cortesCiclo = [
      { dias: 2, horario: "10:00", svc: corte },
      { dias: 9, horario: "15:30", svc: corteBarba },
      { dias: 16, horario: "11:00", svc: barba },
    ];

    for (const c of cortesCiclo) {
      if (!c.svc) continue;
      const data = new Date(hoje);
      data.setDate(data.getDate() - c.dias);
      data.setHours(0, 0, 0, 0);
      await prisma.appointment.create({
        data: {
          clienteId: clienteDemo.id,
          data,
          horarioInicio: c.horario,
          status: "concluido",
          statusPagamento: "pendente",
          formaPagamento: "local",
          valorTotal: c.svc.preco,
          servicos: {
            create: [{ servicoId: c.svc.id, precoNaHora: c.svc.preco }],
          },
        },
      });
    }
  }

  console.log("Seed concluído. Mensalista demo:", TELEFONE_DEMO);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
