import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "galeria";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type Ctx = { params: Promise<{ id: string }> };

// Sobe um arquivo de imagem pro Storage e devolve a URL pública.
// Mesmo padrão de produtos/upload.
async function uploadParaStorage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > MAX_BYTES) return null;
  const supa = getSupabaseAdmin();
  await supa.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `${randomUUID()}.${ext || "jpg"}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supa.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (error) return null;
  return supa.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

// POST — adiciona imagem à categoria. Aceita multipart (arquivo) OU JSON com urlImagem.
export async function POST(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const categoria = await prisma.galleryCategory.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!categoria) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  let urlImagem: string | null = null;
  const tipo = request.headers.get("content-type") || "";
  if (tipo.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    }
    urlImagem = await uploadParaStorage(file);
    if (!urlImagem) {
      return NextResponse.json({ error: "Falha no upload (imagem inválida ou >5MB)" }, { status: 400 });
    }
  } else {
    const b = await request.json().catch(() => null);
    if (!b?.urlImagem) {
      return NextResponse.json({ error: "urlImagem é obrigatória" }, { status: 400 });
    }
    urlImagem = String(b.urlImagem).slice(0, 500);
  }

  // nova imagem vai pro fim da ordem
  const ultima = await prisma.galleryImage.findFirst({
    where: { categoriaId: id },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });
  const imagem = await prisma.galleryImage.create({
    data: { categoriaId: id, urlImagem, ordem: (ultima?.ordem ?? -1) + 1 },
  });

  // ponytail: primeira imagem vira capa automaticamente se ainda não houver
  await prisma.galleryCategory.updateMany({
    where: { id, imagemCapa: null },
    data: { imagemCapa: urlImagem },
  });

  revalidateTag("galeria", {});
  return NextResponse.json(imagem, { status: 201 });
}
