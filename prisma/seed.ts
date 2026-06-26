import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DIRECT_URL!);
const prisma = new PrismaClient({ adapter });

// Lista real de serviços — tabela da barbearia.
// slotsNecessarios: 2 = coloração (ocupa 2 horários seguidos). Default 1.
type ServicoSeed = {
  nome: string;
  descricao: string;
  duracaoMinutos: number;
  preco: number;
  slotsNecessarios?: number;
};

const servicos: ServicoSeed[] = [
  { nome: "Corte Disfarçado (Fade)", descricao: "Degradê na régua, do baixo ao alto", duracaoMinutos: 40, preco: 45 },
  { nome: "Corte Social", descricao: "Clássico, alinhado e discreto", duracaoMinutos: 30, preco: 30 },
  { nome: "Corte Só Tesoura", descricao: "Acabamento todo na tesoura, mais natural", duracaoMinutos: 45, preco: 50 },
  { nome: "Barba", descricao: "Modelagem, toalha quente e navalha", duracaoMinutos: 20, preco: 20 },
  { nome: "Cavanhaque (Simples)", descricao: "Aparo e contorno do cavanhaque", duracaoMinutos: 10, preco: 10 },
  { nome: "Barba c/ Tinta", descricao: "Barba feita com pigmentação", duracaoMinutos: 30, preco: 30 },
  { nome: "Sobrancelha", descricao: "Alinhamento na navalha ou pinça", duracaoMinutos: 10, preco: 10 },
  { nome: "Pezinho", descricao: "Acabamento da nuca e pé do cabelo", duracaoMinutos: 10, preco: 10 },
  { nome: "Tinta Preta", descricao: "Coloração preta para cabelo ou barba", duracaoMinutos: 30, preco: 25, slotsNecessarios: 2 },
  { nome: "Tinta Colorida", descricao: "Coloração fashion, cores variadas", duracaoMinutos: 90, preco: 100, slotsNecessarios: 2 },
  { nome: "Alisante", descricao: "Alisamento e controle de volume", duracaoMinutos: 40, preco: 30, slotsNecessarios: 2 },
  { nome: "Luzes (Simples)", descricao: "Mechas para iluminar o visual", duracaoMinutos: 80, preco: 80, slotsNecessarios: 2 },
  { nome: "Reflexo Alinhado", descricao: "Reflexos no sentido do corte", duracaoMinutos: 80, preco: 90, slotsNecessarios: 2 },
  { nome: "Reflexo Arrepiado", descricao: "Reflexos com efeito arrepiado", duracaoMinutos: 90, preco: 100, slotsNecessarios: 2 },
  { nome: "Platinado", descricao: "Descoloração completa até o platinado", duracaoMinutos: 120, preco: 150, slotsNecessarios: 2 },
  { nome: "Desenho / Freestyle", descricao: "Traços e desenhos na máquina", duracaoMinutos: 15, preco: 15 },
];

// Produtos reais. Imagens em /public/produtos (mesma proporção nos cards).
const produtos = [
  {
    nome: "Gel Boy",
    descricao: "Mega fixação, ação prolongada — ForceMen",
    preco: 30,
    precoAntigo: 35, // promoção: de R$35 por R$30
    quantidadeEstoque: 12,
    urlImagem: "/produtos/gel-boy.jpg",
  },
  {
    nome: "Prime Fix",
    descricao: "Cera modeladora premium · efeito matte, fixação forte",
    preco: 35,
    precoAntigo: null,
    quantidadeEstoque: 8,
    urlImagem: "/produtos/prime-fix.jpg",
  },
];

async function main() {
  for (const s of servicos) {
    const existe = await prisma.service.findFirst({ where: { nome: s.nome } });
    if (existe) {
      await prisma.service.update({
        where: { id: existe.id },
        data: {
          descricao: s.descricao,
          duracaoMinutos: s.duracaoMinutos,
          preco: s.preco,
          slotsNecessarios: s.slotsNecessarios ?? 1,
          ativo: true,
        },
      });
    } else {
      await prisma.service.create({
        data: { ...s, slotsNecessarios: s.slotsNecessarios ?? 1 },
      });
    }
  }

  // Desativa qualquer serviço fora da lista canônica (some do app, sem quebrar FK)
  const nomesCanonicos = servicos.map((s) => s.nome);
  await prisma.service.updateMany({
    where: { nome: { notIn: nomesCanonicos } },
    data: { ativo: false },
  });

  for (const p of produtos) {
    const existe = await prisma.product.findFirst({ where: { nome: p.nome } });
    if (existe) {
      await prisma.product.update({
        where: { id: existe.id },
        data: {
          descricao: p.descricao,
          preco: p.preco,
          precoAntigo: p.precoAntigo,
          quantidadeEstoque: p.quantidadeEstoque,
          urlImagem: p.urlImagem,
          ativo: true,
        },
      });
    } else {
      await prisma.product.create({ data: p });
    }
  }

  // Desativa produtos fora da lista (somem do app, sem quebrar FK de pedidos)
  const nomesProdutos = produtos.map((p) => p.nome);
  await prisma.product.updateMany({
    where: { nome: { notIn: nomesProdutos } },
    data: { ativo: false },
  });

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
    const corte = await prisma.service.findFirst({ where: { nome: "Corte Social" } });
    const fade = await prisma.service.findFirst({
      where: { nome: "Corte Disfarçado (Fade)" },
    });
    const barba = await prisma.service.findFirst({ where: { nome: "Barba" } });

    const cortesCiclo = [
      { dias: 2, horario: "10:00", svc: corte },
      { dias: 9, horario: "15:30", svc: fade },
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
