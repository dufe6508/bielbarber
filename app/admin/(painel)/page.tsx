import Link from "next/link";
import {
  Wallet,
  Scissors,
  ShoppingBag,
  CalendarCheck,
  CalendarClock,
  TrendingUp,
  Gauge,
  UserPlus,
  XCircle,
  ChevronRight,
  CalendarRange,
} from "lucide-react";
import {
  AdminPage,
  AdminHeader,
  StatCard,
  SectionCard,
} from "@/components/admin/primitives";
import { MonthSelector } from "@/components/admin/MonthSelector";
import {
  ReceitaBarChart,
  RankingBarChart,
  OcupacaoBarChart,
} from "@/components/admin/Charts";
import {
  janelaMes,
  receitaPorFonte,
  atendimentoNoPeriodo,
  serieReceitaPorDia,
  servicosMaisVendidos,
  ocupacaoPorHora,
  novosClientes,
  proximosAtendimentos,
} from "@/lib/admin/metrics";
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

  const [fonte, atend, serie, ranking, ocupacao, novos, proximos] = await Promise.all([
    receitaPorFonte(desde, ate),
    atendimentoNoPeriodo(desde, ate),
    serieReceitaPorDia(desde, ate),
    servicosMaisVendidos(6),
    ocupacaoPorHora(),
    novosClientes(desde, ate),
    proximosAtendimentos(8),
  ]);

  const ticket = atend.concluidos ? fonte.servicos / atend.concluidos : 0;
  const ags = "/admin/agendamentos";

  return (
    <AdminPage>
      <AdminHeader
        titulo="Visão geral"
        descricao="Como anda a barbearia no mês. Toque nos cards para abrir os detalhes."
        acao={<MonthSelector atual={mesParam} />}
      />

      {/* Hero + grade de métricas — 2 colunas no mobile, 4 no desktop */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <div className="col-span-2">
          <StatCard
            rotulo="Faturamento do mês"
            valor={formatarPreco(fonte.total)}
            icone={Wallet}
            hint={`${atend.concluidos} atendimentos · ticket ${formatarPreco(ticket)}`}
            href="/admin/financeiro"
            destaque
          />
        </div>

        <StatCard
          rotulo="Serviços"
          valor={formatarPreco(fonte.servicos)}
          icone={Scissors}
        />
        <StatCard
          rotulo="Loja"
          valor={formatarPreco(fonte.loja)}
          icone={ShoppingBag}
          href="/admin/financeiro"
        />
        <StatCard
          rotulo="Ticket médio"
          valor={formatarPreco(ticket)}
          icone={TrendingUp}
        />
        <StatCard
          rotulo="Novos clientes"
          valor={String(novos)}
          icone={UserPlus}
          hint="cadastrados no mês"
        />

        <StatCard
          rotulo="Concluídos"
          valor={String(atend.concluidos)}
          icone={CalendarCheck}
          href={`${ags}?status=concluido`}
        />
        <StatCard
          rotulo="Agendados"
          valor={String(atend.agendados)}
          icone={CalendarClock}
          href={`${ags}?status=agendado`}
        />
        <StatCard
          rotulo="Ocupação"
          valor={`${Math.round(atend.taxaOcupacao * 100)}%`}
          icone={Gauge}
          hint="ver horários cheios"
          href={`${ags}?status=agendado`}
        />
        <StatCard
          rotulo="Cancelados"
          valor={String(atend.cancelados)}
          icone={XCircle}
          href={`${ags}?status=cancelado`}
        />
      </div>

      <div className="mt-5">
        <SectionCard titulo="Receita no mês">
          <ReceitaBarChart dados={serie} />
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard titulo="Mais vendidos">
          <RankingBarChart dados={ranking} />
        </SectionCard>
        <SectionCard titulo="Horários mais cheios">
          <OcupacaoBarChart dados={ocupacao} />
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard titulo="Próximos atendimentos">
          {proximos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum agendamento futuro.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {proximos.map((a) => {
                const [ano, mes, dia] = a.data.split("-").map(Number);
                const label = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                });
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex w-24 shrink-0 flex-col items-end">
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {a.horarioInicio}
                      </span>
                      <span className="text-[11px] capitalize text-muted-foreground">{label}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.cliente}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.servicos.join(", ")}
                      </p>
                    </div>
                    <Link
                      href={`/admin/agendamentos`}
                      className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground hover:text-foreground"
                    >
                      {a.valorTotal > 0
                        ? `R$ ${a.valorTotal.toFixed(2).replace(".", ",")}`
                        : "—"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 border-t border-border pt-3">
            <Link
              href="/admin/agendamentos"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos os agendamentos
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
