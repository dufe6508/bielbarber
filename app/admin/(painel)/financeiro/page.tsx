import { Wallet, Users, TrendingUp, UserPlus } from "lucide-react";
import { AdminPage, AdminHeader, SectionCard } from "@/components/admin/primitives";
import { MonthSelector } from "@/components/admin/MonthSelector";
import { StatsCard } from "@/components/ui/stats-card-1";
import { formatarPreco } from "@/lib/utils/format";
import {
  FinanceiroBreakdown,
  type DadosFinanceiro,
} from "@/components/admin/financeiro/FinanceiroBreakdown";
import {
  ReceitaAreaChart,
  FonteDonutChart,
  RankingBarChart,
} from "@/components/admin/Charts";
import {
  janelaMes,
  receitaPorFonte,
  atendimentoNoPeriodo,
  serieReceitaPorDia,
  servicosMaisVendidos,
  novosClientes,
} from "@/lib/admin/metrics";

export const dynamic = "force-dynamic";

function parseMes(mes?: string): { ano: number; mesIndex: number } {
  const agora = new Date();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split("-").map(Number);
    if (m >= 1 && m <= 12) return { ano: a, mesIndex: m - 1 };
  }
  return { ano: agora.getFullYear(), mesIndex: agora.getMonth() };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const { ano, mesIndex } = parseMes(sp.mes);
  const mesParam = `${ano}-${String(mesIndex + 1).padStart(2, "0")}`;
  const { desde, ate } = janelaMes(ano, mesIndex);
  const { desde: desdeAnt, ate: ateAnt } = janelaMes(ano, mesIndex - 1);

  const [fonte, atend, serie, ranking, novos, fonteAnt, atendAnt, novosAnt] =
    await Promise.all([
      receitaPorFonte(desde, ate),
      atendimentoNoPeriodo(desde, ate),
      serieReceitaPorDia(desde, ate),
      servicosMaisVendidos(6),
      novosClientes(desde, ate),
      receitaPorFonte(desdeAnt, ateAnt),
      atendimentoNoPeriodo(desdeAnt, ateAnt),
      novosClientes(desdeAnt, ateAnt),
    ]);

  const ticket = atend.concluidos ? fonte.servicos / atend.concluidos : 0;
  const ticketAnt = atendAnt.concluidos ? fonteAnt.servicos / atendAnt.concluidos : 0;

  // % variação vs. mês anterior. Sem base anterior (=0): mostra +/-100% se há valor agora, senão 0%.
  const variacao = (atual: number, anterior: number) => {
    const pct = anterior === 0 ? (atual > 0 ? 100 : 0) : ((atual - anterior) / anterior) * 100;
    const sinal = pct >= 0 ? "+" : "";
    return {
      change: `${sinal}${pct.toFixed(1)}%`,
      changeType: (pct >= 0 ? "positive" : "negative") as "positive" | "negative",
    };
  };

  const resumo = [
    { title: "Faturamento", value: formatarPreco(fonte.total), icon: <Wallet className="h-4 w-4 text-muted-foreground" />, ...variacao(fonte.total, fonteAnt.total) },
    { title: "Atendimentos", value: String(atend.concluidos), icon: <Users className="h-4 w-4 text-muted-foreground" />, ...variacao(atend.concluidos, atendAnt.concluidos) },
    { title: "Ticket médio", value: formatarPreco(ticket), icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />, ...variacao(ticket, ticketAnt) },
    { title: "Clientes novos", value: String(novos), icon: <UserPlus className="h-4 w-4 text-muted-foreground" />, ...variacao(novos, novosAnt) },
  ];

  const dados: DadosFinanceiro = {
    total: fonte.total,
    servicos: fonte.servicos,
    loja: fonte.loja,
    assinaturas: fonte.assinaturas,
    mensalistas: fonte.mensalistas,
    ticket,
    atendimentos: atend.concluidos,
    cancelados: atend.cancelados,
    novos,
  };

  const fonteDados = [
    { nome: "Serviços", valor: fonte.servicos },
    { nome: "Loja", valor: fonte.loja },
    { nome: "Assinaturas", valor: fonte.assinaturas },
    { nome: "Mensalistas", valor: fonte.mensalistas },
  ];

  return (
    <AdminPage>
      <AdminHeader
        titulo="Financeiro"
        descricao="Receita por fonte no mês. Toque em cada card para ver os lançamentos."
        acao={<MonthSelector atual={mesParam} />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resumo.map((s) => (
          <StatsCard key={s.title} {...s} />
        ))}
      </div>

      <FinanceiroBreakdown mes={mesParam} dados={dados} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard titulo="Receita por fonte">
          <FonteDonutChart dados={fonteDados} />
        </SectionCard>
        <SectionCard titulo="Mais vendidos">
          <RankingBarChart dados={ranking} />
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard titulo="Curva de receita do mês">
          <ReceitaAreaChart dados={serie} />
        </SectionCard>
      </div>
    </AdminPage>
  );
}
