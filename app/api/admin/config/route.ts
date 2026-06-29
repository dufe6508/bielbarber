import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getHorizonteDias,
  setHorizonteDias,
  getFidelidade,
  setFidelidade,
  getGaleriaVisivel,
  setGaleriaVisivel,
} from "@/lib/utils/slots";
import { getPerfil, setPerfil } from "@/lib/perfil";
import { notify } from "@/lib/notifications/notify";
import { dataISOLocal } from "@/lib/utils/format";

// GET — configurações do painel (horizonte + fidelidade + perfil).
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const [horizonteDias, fidelidade, galeriaVisivel, perfil] = await Promise.all([
    getHorizonteDias(),
    getFidelidade(),
    getGaleriaVisivel(),
    getPerfil(),
  ]);
  return NextResponse.json({ horizonteDias, ...fidelidade, galeriaVisivel, ...perfil });
}

// PUT — atualiza configurações.
// Body: { horizonteDias?:number, fidelidadeMeta?:number, fidelidadeRecompensa?:string }
export async function PUT(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);

  if (body?.horizonteDias !== undefined) {
    const dias = body.horizonteDias;
    if (typeof dias !== "number" || dias < 1 || dias > 365) {
      return NextResponse.json(
        { error: "horizonteDias deve ser 1..365" },
        { status: 400 }
      );
    }
    const anterior = await getHorizonteDias();
    await setHorizonteDias(dias);
    // Ampliou a janela de agendamento → avisa os clientes que abriu agenda.
    if (dias > anterior) {
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      void notify({ type: "agenda_liberada", ateData: dataISOLocal(ate) });
    }
  }

  if (body?.fidelidadeMeta !== undefined || body?.fidelidadeRecompensa !== undefined) {
    const meta = body.fidelidadeMeta;
    if (meta !== undefined && (typeof meta !== "number" || meta < 1 || meta > 100)) {
      return NextResponse.json(
        { error: "fidelidadeMeta deve ser 1..100" },
        { status: 400 }
      );
    }
    await setFidelidade({ meta, recompensa: body.fidelidadeRecompensa });
  }

  if (typeof body?.galeriaVisivel === "boolean") {
    await setGaleriaVisivel(body.galeriaVisivel);
  }

  if (
    typeof body?.nome === "string" ||
    typeof body?.local === "string" ||
    typeof body?.logoUrl === "string"
  ) {
    await setPerfil({ nome: body.nome, local: body.local, logoUrl: body.logoUrl });
  }

  revalidateTag("config", {});
  const [horizonteDias, fidelidade, galeriaVisivel, perfil] = await Promise.all([
    getHorizonteDias(),
    getFidelidade(),
    getGaleriaVisivel(),
    getPerfil(),
  ]);
  return NextResponse.json({ horizonteDias, ...fidelidade, galeriaVisivel, ...perfil });
}
