"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COR = "var(--primary)";
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

// Área empilhada: receita serviços + loja por dia.
export function ReceitaAreaChart({
  dados,
}: {
  dados: { data: string; servicos: number; loja: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gServ" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR} stopOpacity={0.32} />
            <stop offset="100%" stopColor={COR} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gLoja" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EIXO} stopOpacity={0.22} />
            <stop offset="100%" stopColor={EIXO} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="data"
          tickFormatter={rotuloDia}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={moedaCurta}
          tick={{ fontSize: 10, fill: EIXO }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          content={<TooltipBox moeda />}
          labelFormatter={(l) => rotuloDia(String(l))}
        />
        <Area
          type="monotone"
          dataKey="servicos"
          name="Serviços"
          stackId="1"
          stroke={COR}
          strokeWidth={2}
          fill="url(#gServ)"
        />
        <Area
          type="monotone"
          dataKey="loja"
          name="Loja"
          stackId="1"
          stroke={EIXO}
          strokeWidth={1.5}
          fill="url(#gLoja)"
        />
      </AreaChart>
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
            <Cell key={i} fill={COR} fillOpacity={1 - i * 0.1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut: receita por fonte. Tons de onyx (mono-acento) por opacidade.
export function FonteDonutChart({
  dados,
}: {
  dados: { nome: string; valor: number }[];
}) {
  const filtrado = dados.filter((d) => d.valor > 0);
  if (!filtrado.length)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sem receita no período.
      </p>
    );
  const total = filtrado.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={180} className="!w-auto sm:!w-1/2">
        <PieChart>
          <Pie
            data={filtrado}
            dataKey="valor"
            nameKey="nome"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
            strokeWidth={0}
          >
            {filtrado.map((_, i) => (
              <Cell key={i} fill={COR} fillOpacity={1 - i * 0.18} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox moeda />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full space-y-2 sm:w-1/2">
        {filtrado.map((d, i) => (
          <li key={d.nome} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: COR, opacity: 1 - i * 0.18 }}
            />
            <span className="text-muted-foreground">{d.nome}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
              {moedaCurta(d.valor)}
            </span>
            <span className="w-10 text-right font-mono text-xs text-muted-foreground">
              {Math.round((d.valor / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
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
