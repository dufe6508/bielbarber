// Seed da Galeria de Cortes — categorias + imagens placeholder (picsum).
// Idempotente: pula categorias cujo slug já existe.
// Rodar: npx tsx prisma/seed-gallery.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const CATEGORIAS = [
  { nome: "Corte Americano", slug: "corte-americano", precoMedio: 35.0 },
  { nome: "Corte Militar", slug: "corte-militar", precoMedio: 30.0 },
  { nome: "Freestyle", slug: "freestyle", precoMedio: 50.0 },
  { nome: "Low Fade", slug: "low-fade", precoMedio: 35.0 },
  { nome: "Mid Fade", slug: "mid-fade", precoMedio: 38.0 },
];

function img(slug: string, n: number) {
  // placeholder estável por seed — trocar por uploads reais depois
  return `https://picsum.photos/seed/${slug}-${n}/600/800`;
}

async function main() {
  let criadas = 0;
  for (let i = 0; i < CATEGORIAS.length; i++) {
    const cat = CATEGORIAS[i];
    const existe = await prisma.galleryCategory.findUnique({
      where: { slug: cat.slug },
      select: { id: true },
    });
    if (existe) {
      console.log(`· ${cat.slug} já existe, pulando`);
      continue;
    }
    const qtd = 4; // 3-5 imagens; 4 é o meio-termo
    await prisma.galleryCategory.create({
      data: {
        nome: cat.nome,
        slug: cat.slug,
        precoMedio: cat.precoMedio,
        imagemCapa: img(cat.slug, 1),
        destaque: i === 0,
        ordem: i,
        imagens: {
          create: Array.from({ length: qtd }, (_, n) => ({
            urlImagem: img(cat.slug, n + 1),
            ordem: n,
            destaque: n === 0,
          })),
        },
      },
    });
    criadas++;
    console.log(`✓ ${cat.slug} (+${qtd} imagens)`);
  }
  console.log(`\nGaleria: ${criadas} categoria(s) criada(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
