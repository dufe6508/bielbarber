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
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}
