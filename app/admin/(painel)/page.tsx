import Link from "next/link";
import {
  Wallet,
  CalendarClock,
  Users,
  PiggyBank,
  ChevronRight,
} from "lucide-react";
import {
  AdminPage,
  AdminHeader,
  StatCard,
  SectionCard,
} from "@/components/admin/primitives";
import { MonthSelector } from "@/components/admin/MonthSelector";
import { ReceitaBarChart } from "@/components/admin/Charts";
import {
  janelaMes,
  receitaPorFonte,
  atendimentoNoPeriodo,
  serieReceitaPorDia,
  clientesAtivos,
  proximosAtendimentos,
} from "@/lib/admin/metrics";
import { resumoContabil } from "@/lib/admin/accounting";
import { ProximosAtendimentos } from "@/components/admin/ProximosAtendimentos";
import { formatarPreco } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function parseMes(mes?: string): { ano: number; mesIndex: number } {
  const agora = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { ano: a, mesIndex: m - 1 };
  }
  return { ano: agora.getFullYear(), mesIndex: agora.getMonth() };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const { ano, mesIndex } = parseMes(sp.mes);
  const mesParam = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;
  const { desde, ate } = janelaMes(ano, mesIndex);

  const [fonte, atend, serie, ativos, conta, proximos] = await Promise.all([
    receitaPorFonte(desde, ate),
    atendimentoNoPeriodo(desde, ate),
    serieReceitaPorDia(desde, ate),
    clientesAtivos(2),
    resumoContabil(ano, mesIndex),
    proximosAtendimentos(8),
  ]);

  const ags = "/admin/agendamentos";

  return (
    <AdminPage>
      <AdminHeader
        titulo="Visão geral"
        descricao="O essencial do mês. Toque nos cards para abrir os detalhes."
        acao={<MonthSelector atual={mesParam} />}
      />

      {/* Hero — faturamento do mês */}
      <StatCard
        rotulo="Faturamento do mês"
        valor={formatarPreco(fonte.total)}
        icone={Wallet}
        hint={`${atend.concluidos} atendimentos concluídos`}
        href="/admin/financeiro"
        destaque
      />

      {/* Métricas de apoio */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
        <StatCard
          rotulo="Lucro líquido"
          valor={formatarPreco(conta.lucroLiquido)}
          icone={PiggyBank}
          hint="Após despesas"
          href="/admin/financeiro"
        />
        <StatCard
          rotulo="Agendados"
          valor={String(atend.agendados)}
          icone={CalendarClock}
          hint="Ativos no mês"
          href={`${ags}?status=agendado`}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            rotulo="Clientes ativos"
            valor={String(ativos)}
            icone={Users}
            hint="Marcaram nos últimos 2 meses"
            href="/admin/clientes"
          />
        </div>
      </div>

      <div className="mt-5">
        <SectionCard titulo="Receita no mês">
          <ReceitaBarChart dados={serie} />
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          titulo="Próximos atendimentos"
          acao={
            <Link
              href="/admin/agendamentos"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todos
              <ChevronRight className="size-3.5" />
            </Link>
          }
        >
          <ProximosAtendimentos itens={proximos} />
        </SectionCard>
      </div>
    </AdminPage>
  );
}
