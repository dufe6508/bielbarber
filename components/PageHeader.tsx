// Cabeçalho de página — usado nas telas internas do cliente (Loja, Pacotes, Histórico)
export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}
