import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const BUCKET = "clientes";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// GET — fotos privadas do cliente (mais novas primeiro).
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const fotos = await prisma.clientPhoto.findMany({
    where: { clienteId: id },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(fotos);
}

// POST — sobe uma foto (multipart) e cria o registro. Campo opcional: legenda.
export async function POST(request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const legenda = (form?.get("legenda") as string | null)?.slice(0, 240) || null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem acima de 5 MB" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  // ponytail: bucket idempotente a cada upload (volume admin baixo).
  await supa.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `${id}/${randomUUID()}.${ext || "jpg"}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supa.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }

  const { data } = supa.storage.from(BUCKET).getPublicUrl(caminho);
  const foto = await prisma.clientPhoto.create({
    data: { clienteId: id, urlImagem: data.publicUrl, legenda },
  });
  return NextResponse.json(foto, { status: 201 });
}
