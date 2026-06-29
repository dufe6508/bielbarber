// Backfill de slugs para linhas criadas antes do campo existir.
// Rodar uma vez: npx tsx prisma/backfill-slugs.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { slugify } from "../lib/slugify";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function backfill(
  nome: string,
  rows: { id: string; nome: string }[],
  setSlug: (id: string, slug: string) => Promise<unknown>
) {
  const usados = new Set<string>();
  for (const r of rows) {
    const base = slugify(r.nome) || "item";
    let slug = base;
    let n = 2;
    while (usados.has(slug)) slug = `${base}-${n++}`;
    usados.add(slug);
    await setSlug(r.id, slug);
  }
  console.log(`${nome}: ${rows.length} slugs backfilled`);
}

async function main() {
  const servicos = await prisma.service.findMany({
    where: { slug: null },
    select: { id: true, nome: true },
  });
  await backfill("servicos", servicos, (id, slug) =>
    prisma.service.update({ where: { id }, data: { slug } })
  );

  const produtos = await prisma.product.findMany({
    where: { slug: null },
    select: { id: true, nome: true },
  });
  await backfill("produtos", produtos, (id, slug) =>
    prisma.product.update({ where: { id }, data: { slug } })
  );

  const pacotes = await prisma.package.findMany({
    where: { slug: null },
    select: { id: true, nome: true },
  });
  await backfill("pacotes", pacotes, (id, slug) =>
    prisma.package.update({ where: { id }, data: { slug } })
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
