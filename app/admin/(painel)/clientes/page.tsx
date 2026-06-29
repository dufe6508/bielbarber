import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { ClientesManager } from "@/components/admin/clientes/ClientesManager";
import type { ClienteAdmin } from "@/components/admin/clientes/ClientesManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function mesDia(d: Date | null): string | null {
  if (!d) return null;
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default async function ClientesPage() {
  const [linhas, ativos] = await Promise.all([
    prisma.client.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        telefone: true,
        bloqueado: true,
        motivoBloqueio: true,
        vip: true,
        carimbos: true,
        aniversario: true,
        mensalidade: { select: { status: true } },
        pacotesCliente: { where: { status: "ativo" }, select: { id: true }, take: 1 },
        _count: { select: { agendamentos: true } },
        agendamentos: {
          orderBy: { data: "desc" },
          take: 1,
          select: { data: true },
        },
      },
    }),
    // Agendamentos ativos (ainda não realizados) por cliente.
    prisma.appointment.groupBy({
      by: ["clienteId"],
      where: { status: "agendado" },
      _count: { _all: true },
    }),
  ]);

  const ativosMap = new Map(ativos.map((a) => [a.clienteId, a._count._all]));

  const clientes: ClienteAdmin[] = linhas.map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    bloqueado: c.bloqueado,
    motivoBloqueio: c.motivoBloqueio,
    vip: c.vip,
    mensalista: c.mensalidade?.status === "ativo",
    assinatura: c.pacotesCliente.length > 0,
    carimbos: c.carimbos,
    aniversarioMesDia: mesDia(c.aniversario),
    totalAgendamentos: c._count.agendamentos,
    agendamentosAtivos: ativosMap.get(c.id) ?? 0,
    ultimoAgendamento: c.agendamentos[0]?.data.toISOString().slice(0, 10) ?? null,
  }));

  return (
    <AdminPage>
      <AdminHeader
        titulo="Clientes"
        descricao="Busque, veja o extrato e controle quem agenda. Toque num cliente para abrir o perfil."
      />
      <ClientesManager clientes={clientes} />
    </AdminPage>
  );
}
