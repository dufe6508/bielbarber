"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COR = "var(--chart-1)";
const GRID = "var(--border)";
const EIXO = "var(--muted-foreground)";

function moedaCurta(v: number): string {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
}

function rotuloDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function TooltipBox({
  active,
  payload,
  label,
  moeda,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  moeda?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 font-medium">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-mono tabular-nums">
            {moeda ? moedaCurta(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

type DiaReceita = { data: string; servicos: number; loja: number; total?: number };

// Tooltip do gráfico principal: total do dia + quebra serviços/loja.
function TooltipDia({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DiaReceita }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = p.servicos + p.loja;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {rotuloDia(p.data)}
      </p>
      <p className="mb-1.5 font-mono text-sm font-semibold tabular-nums text-foreground">
        {moedaCurta(total)}
      </p>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block size-2 rounded-full" style={{ background: COR }} />
        Serviços <span className="ml-auto font-mono tabular-nums">{moedaCurta(p.servicos)}</span>
      </p>
      {p.loja > 0 && (
        <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block size-2 rounded-full" style={{ background: EIXO }} />
          Loja <span className="ml-auto font-mono tabular-nums">{moedaCurta(p.loja)}</span>
        </p>
      )}
    </div>
  );
}

// Receita total por dia — barras finas, canto arredondado, pico destacado.
// Detalhe serviços/loja fica no tooltip (evita empilhamento ruidoso).
export function ReceitaBarChart({ dados }: { dados: DiaReceita[] }) {
  const linhas = dados.map((d) => ({ ...d, total: d.servicos + d.loja }));
  const max = Math.max(0, ...linhas.map((d) => d.total));
  if (max === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Sem receita no período.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={linhas} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="data"
          tickFormatter={rotuloDia}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={moedaCurta}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickCount={4}
        />
        <Tooltip content={<TooltipDia />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
        <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={16}>
          {linhas.map((d, i) => (
            <Cell key={i} fill={COR} fillOpacity={d.total === max ? 1 : 0.5} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Fluxo de caixa por dia — entradas vs saídas (barras agrupadas, mono).
export function FluxoCaixaChart({
  dados,
}: {
  dados: { dia: string; entradas: number; saidas: number }[];
}) {
  const max = Math.max(0, ...dados.map((d) => Math.max(d.entradas, d.saidas)));
  if (max === 0)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Sem movimento no período.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={dados} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="dia"
          tickFormatter={rotuloDia}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={moedaCurta}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickCount={4}
        />
        <Tooltip content={<TooltipBox moeda />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
        <Bar dataKey="entradas" name="Entradas" fill={COR} radius={[3, 3, 0, 0]} maxBarSize={12} />
        <Bar dataKey="saidas" name="Saídas" fill="oklch(0.52 0.17 26)" radius={[3, 3, 0, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras horizontais: ranking (serviços mais vendidos).
export function RankingBarChart({
  dados,
}: {
  dados: { nome: string; total: number }[];
}) {
  if (!dados.length)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem dados ainda.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 42)}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nome"
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" name="Vendas" radius={[0, 6, 6, 0]}>
          {dados.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras verticais: ocupação por hora.
export function OcupacaoBarChart({
  dados,
}: {
  dados: { hora: string; total: number }[];
}) {
  if (!dados.length)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem dados ainda.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="hora"
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" name="Atend." fill={COR} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Mini barras verticais genéricas (horários fortes, dias fortes). Destaca a
// barra de maior valor; demais ficam esmaecidas — leitura instantânea do pico.
export function MiniBarChart({
  dados,
  height = 150,
}: {
  dados: { rotulo: string; total: number }[];
  height?: number;
}) {
  if (!dados.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
    );
  const max = Math.max(...dados.map((d) => d.total));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={dados} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="22%">
        <XAxis
          dataKey="rotulo"
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" name="Atend." radius={[5, 5, 0, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={COR} fillOpacity={d.total === max ? 1 : 0.32} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
