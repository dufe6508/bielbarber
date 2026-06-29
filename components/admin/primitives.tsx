import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";

// Casca de página do painel — padding e largura consistentes.
export function AdminPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl p-5 pb-24 md:p-8", className)}>
      {children}
    </div>
  );
}

export function AdminHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[28px]">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}

// Cartão de métrica — número grande + rótulo + hint. Vira link clicável quando
// recebe `href` (afeta hover + chevron).
export function StatCard({
  rotulo,
  valor,
  icone: Icone,
  hint,
  tom = "neutro",
  href,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  icone?: LucideIcon;
  hint?: string;
  tom?: "neutro" | "positivo" | "alerta";
  href?: string;
  destaque?: boolean;
}) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[11px] font-medium uppercase tracking-wide",
            destaque ? "text-primary-foreground/70" : "text-muted-foreground/80"
          )}
        >
          {rotulo}
        </span>
        {Icone && (
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
              destaque
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-muted/70 text-muted-foreground"
            )}
          >
            <Icone className="size-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-mono font-semibold tabular-nums tracking-tight",
          destaque
            ? "text-3xl text-primary-foreground md:text-4xl"
            : "text-[22px] text-foreground md:text-[26px]"
        )}
      >
        {valor}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-[11px]",
            destaque && "text-primary-foreground/75",
            !destaque && tom === "positivo" && "text-success-muted-foreground",
            !destaque && tom === "alerta" && "text-danger-muted-foreground",
            !destaque && tom === "neutro" && "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      )}
      {href && (
        <ChevronRight
          className={cn(
            "absolute right-3 top-3 size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100",
            destaque ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        />
      )}
    </>
  );

  const base = cn(
    "group relative block rounded-2xl border p-4 text-left shadow-xs transition-all md:p-5",
    destaque
      ? "border-primary bg-primary"
      : "border-border bg-card",
    href && "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
    href && !destaque && "hover:border-primary/40"
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {conteudo}
      </Link>
    );
  }
  return <div className={base}>{conteudo}</div>;
}

export function SectionCard({
  titulo,
  acao,
  children,
  className,
}: {
  titulo?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-xs",
        className
      )}
    >
      {(titulo || acao) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && (
            <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
              {titulo}
            </h2>
          )}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

// Selo de status reutilizável.
export function Pill({
  children,
  tom = "neutro",
}: {
  children: React.ReactNode;
  tom?: "neutro" | "verde" | "amber" | "vermelho" | "azul";
}) {
  const tons: Record<string, string> = {
    neutro: "bg-neutral-muted text-neutral-muted-foreground",
    verde: "bg-success-muted text-success-muted-foreground",
    amber: "bg-danger-muted text-danger-muted-foreground",
    vermelho: "bg-danger-muted text-danger-muted-foreground",
    azul: "bg-primary/15 text-primary dark:text-primary-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tons[tom]
      )}
    >
      {children}
    </span>
  );
}
