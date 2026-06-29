"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Ops, algo deu errado
      </h2>
      <p className="mt-2 max-w-[300px] text-sm text-muted-foreground">
        Ocorreu um erro inesperado. Já registramos o problema.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
      >
        <RotateCcw className="size-4" />
        Tentar novamente
      </button>
    </div>
  );
}
