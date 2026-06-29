import { Loader2 } from "lucide-react";

export default function ClienteLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}
