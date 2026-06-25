import { NextResponse } from "next/server";
import { getSlotsDisponiveis } from "@/lib/utils/slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.json(
      { error: "Parâmetro 'data' é obrigatório (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const slots = await getSlotsDisponiveis(data);
  return NextResponse.json(slots);
}
