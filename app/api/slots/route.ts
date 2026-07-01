import { NextResponse } from "next/server";
import { getSlotsDisponiveis } from "@/lib/utils/slots";

// Sem cache: volume da barbearia é baixo (10-12 cortes/dia) e disponibilidade
// errada (cache desatualizado após cancelar/remarcar) é pior que uma query a mais.
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
