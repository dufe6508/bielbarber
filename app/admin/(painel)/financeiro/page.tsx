import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { MonthSelector } from "@/components/admin/MonthSelector";
import {
  FinanceiroView,
  type DadosFinanceiro,
} from "@/components/admin/financeiro/FinanceiroView";
import {
  janelaMes,
  receitaPorFonte,
  atendimentoNoPeriodo,
  serieReceitaPorDia,
  novosClientes,
  rankingServicos,
  rankingProdutos,
  ocupacaoPorHoraJanela,
  ocupacaoPorDiaSemana,
  recorrencia,
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

  const [
    fonte,
    atend,
    serie,
    novos,
    rankServ,
    rankProd,
    horas,
    dias,
    recorr,
    fonteAnt,
    atendAnt,
    novosAnt,
  ] = await Promise.all([
    receitaPorFonte(desde, ate),
    atendimentoNoPeriodo(desde, ate),
    serieReceitaPorDia(desde, ate),
    novosClientes(desde, ate),
    rankingServicos(desde, ate),
    rankingProdutos(desde, ate),
    ocupacaoPorHoraJanela(desde, ate),
    ocupacaoPorDiaSemana(desde, ate),
    recorrencia(desde, ate),
    receitaPorFonte(desdeAnt, ateAnt),
    atendimentoNoPeriodo(desdeAnt, ateAnt),
    novosClientes(desdeAnt, ateAnt),
  ]);

  const ticket = atend.concluidos ? fonte.servicos / atend.concluidos : 0;
  const ticketAnt = atendAnt.concluidos ? fonteAnt.servicos / atendAnt.concluidos : 0;

  // Delta vs. mês anterior, em %. null = sem dado relevante (some o rótulo).
  const pctDelta = (atual: number, ant: number) => {
    if (ant === 0 && atual === 0) return null;
    const pct = ant === 0 ? 100 : Math.round(((atual - ant) / ant) * 100);
    if (pct === 0) return { texto: "igual ao mês anterior", positivo: true };
    const mais = pct > 0;
    return { texto: `${Math.abs(pct)}% ${mais ? "a mais" : "a menos"} que mês anterior`, positivo: mais };
  };
  const absDelta = (atual: number, ant: number, maisEhBom: boolean) => {
    const d = atual - ant;
    if (d === 0) return { texto: "igual ao mês anterior", positivo: true };
    const mais = d > 0;
    return { texto: `${Math.abs(d)} ${mais ? "a mais" : "a menos"} que mês anterior`, positivo: maisEhBom ? mais : !mais };
  };

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
    deltas: {
      total: pctDelta(fonte.total, fonteAnt.total) ?? undefined,
      ticket: pctDelta(ticket, ticketAnt) ?? undefined,
      cancelados: absDelta(atend.cancelados, atendAnt.cancelados, false),
      novos: absDelta(novos, novosAnt, true),
    },
  };

  return (
    <AdminPage>
      <AdminHeader
        titulo="Financeiro"
        descricao="Resumo do mês. Toque em Insights para análises detalhadas."
        acao={<MonthSelector atual={mesParam} />}
      />

      <FinanceiroView
        mes={mesParam}
        dados={dados}
        serie={serie}
        rankServicos={rankServ}
        rankProdutos={rankProd}
        horas={horas}
        dias={dias}
        ocupacao={atend.taxaOcupacao}
        recorrencia={recorr}
      />
    </AdminPage>
  );
}
