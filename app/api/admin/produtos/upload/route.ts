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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 });
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
