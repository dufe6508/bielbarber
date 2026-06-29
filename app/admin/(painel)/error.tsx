"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AdminPage, AdminHeader } from "@/components/admin/primitives";

export default function AdminError({
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
    <AdminPage>
      <AdminHeader
        titulo="Erro no painel"
        descricao="Ocorreu uma falha ao carregar os dados desta seção."
      />
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Ops, algo deu errado.
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {error.message || "Tente recarregar a página para continuar."}
        </p>
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          <RotateCcw className="size-4" />
          Recarregar dados
        </button>
      </div>
    </AdminPage>
  );
}
