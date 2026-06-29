import { NextResponse } from "next/server";
import { cachedServicos } from "@/lib/cache";

export async function GET() {
  const servicos = await cachedServicos();
  return NextResponse.json(servicos);
}
