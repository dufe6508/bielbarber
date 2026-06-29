import { NextResponse } from "next/server";
import { cachedSlots } from "@/lib/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.json(
      { error: "Parâmetro 'data' é obrigatório (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const slots = await cachedSlots(data);
  return NextResponse.json(slots);
}
