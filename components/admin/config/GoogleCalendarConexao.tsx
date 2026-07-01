"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarX2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Status = { conectado: boolean; calendarId: string } | null;

export function GoogleCalendarConexao() {
  const [status, setStatus] = useState<Status>(null);
  const [carregando, setCarregando] = useState(true);
  const [desconectando, setDesconectando] = useState(false);

  async function carregarStatus() {
    setCarregando(true);
    try {
      const res = await fetch("/api/admin/google-calendar/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // Lê o resultado do callback OAuth da URL, se houver.
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("google_calendar");
    if (resultado === "conectado") {
      toast.success("Google Calendar conectado com sucesso!");
      // Limpa o parâmetro da URL sem recarregar.
      window.history.replaceState({}, "", window.location.pathname);
    } else if (resultado === "erro") {
      const motivo = params.get("motivo") ?? "desconhecido";
      toast.error(`Erro ao conectar: ${motivo}`);
      window.history.replaceState({}, "", window.location.pathname);
    }

    carregarStatus();
  }, []);

  async function desconectar() {
    setDesconectando(true);
    try {
      const res = await fetch("/api/admin/google-calendar/status", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Google Calendar desconectado.");
      await carregarStatus();
    } catch {
      toast.error("Erro ao desconectar.");
    } finally {
      setDesconectando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verificando conexão…
      </div>
    );
  }

  if (status?.conectado) {
    return (
      <div className="flex flex-col gap-3">
        {/* Badge de status */}
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/8 px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
            <CalendarCheck className="size-4 text-green-500" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Conectado</p>
            <p className="text-xs text-muted-foreground">
              Novos agendamentos aparecem automaticamente no Google Calendar.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/google-calendar/authorize"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Reconectar
          </a>
          <a
            href={`https://calendar.google.com/calendar/r`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            Abrir Google Agenda
          </a>
          <button
            onClick={desconectar}
            disabled={desconectando}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/8 disabled:opacity-50"
          >
            {desconectando ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CalendarX2 className="size-3.5" />
            )}
            Desconectar
          </button>
        </div>
      </div>
    );
  }

  // Não conectado
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <CalendarX2 className="size-4 text-muted-foreground" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Não conectado</p>
          <p className="text-xs text-muted-foreground">
            Conecte para criar eventos automaticamente ao agendar.
          </p>
        </div>
      </div>

      <a
        href="/api/admin/google-calendar/authorize"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Conectar Google Calendar
      </a>
    </div>
  );
}
