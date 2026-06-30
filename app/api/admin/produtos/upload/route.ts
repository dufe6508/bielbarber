import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "produtos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// POST — recebe um arquivo de imagem (multipart) da galeria/câmera do admin,
// sobe pro Storage e devolve a URL pública. Substitui a entrada manual de URL.
export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato não aceito. Use JPEG, PNG, WebP ou GIF." }, { status: 400 });
  }
  // Verifica magic bytes reais (primeiros 4 bytes) para rejeitar arquivos com extensão trocada.
  const magic = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isJpeg = magic[0] === 0xff && magic[1] === 0xd8;
  const isPng  = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e && magic[3] === 0x47;
  const isWebp = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46;
  const isGif  = magic[0] === 0x47 && magic[1] === 0x49 && magic[2] === 0x46;
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem acima de 5 MB" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  // ponytail: garante o bucket a cada upload (idempotente). Volume de admin é
  // baixo; se virar gargalo, criar o bucket uma vez via migration/CLI.
  await supa.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `${randomUUID()}.${ext || "jpg"}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supa.storage
    .from(BUCKET)
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }

  const { data } = supa.storage.from(BUCKET).getPublicUrl(caminho);
  return NextResponse.json({ url: data.publicUrl });
}
