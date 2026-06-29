"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function ClienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader titulo="Erro" descricao="Não foi possível carregar a página." />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mb-4 size-10 text-destructive" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Falha no carregamento
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <RotateCcw className="size-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
