import { NextResponse } from "next/server";
import { cachedProdutos } from "@/lib/cache";

export async function GET() {
  const produtos = await cachedProdutos();
  return NextResponse.json(produtos);
}
