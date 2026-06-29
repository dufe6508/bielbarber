"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Ban, Cake, CalendarClock, ChevronRight, Crown, Search, Star } from "lucide-react";
import { Pill } from "@/components/admin/primitives";
import { FotosClienteModal } from "./FotosClienteModal";
import { ClientePerfilSheet, type PatchCliente } from "./ClientePerfilSheet";
import { formatarTelefone } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type ClienteAdmin = {
  id: string;
  nome: string;
  telefone: string;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  vip: boolean;
  mensalista: boolean;
  assinatura: boolean;
  carimbos: number;
  aniversarioMesDia: string | null; // "MM-DD" ou null
  totalAgendamentos: number;
  agendamentosAtivos: number; // ainda não realizados
  ultimoAgendamento: string | null; // "YYYY-MM-DD" ou null
};

type Filtro = "todos" | "mensalista" | "assinatura" | "vip" | "bloqueado";

function aniversarioHoje(mesDia: string | null): boolean {
  if (!mesDia) return false;
  const h = new Date();
  const hoje = `${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  return mesDia === hoje;
}

function ResumoStat({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs">
      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
    </div>
  );
}

export function ClientesManager({ clientes }: { clientes: ClienteAdmin[] }) {
  const [lista, setLista] = useState(clientes);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [fotosAlvo, setFotosAlvo] = useState<ClienteAdmin | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((c) => {
      if (filtro === "mensalista" && !c.mensalista) return false;
      if (filtro === "assinatura" && !c.assinatura) return false;
      if (filtro === "vip" && !c.vip) return false;
      if (filtro === "bloqueado" && !c.bloqueado) return false;
      if (!q) return true;
      return c.nome.toLowerCase().includes(q) || c.telefone.includes(q.replace(/\D/g, ""));
    });
  }, [lista, busca, filtro]);

  const resumo = useMemo(
    () => ({
      mensalistas: lista.filter((c) => c.mensalista).length,
      assinaturas: lista.filter((c) => c.assinatura).length,
      bloqueados: lista.filter((c) => c.bloqueado).length,
      ativos: lista.reduce((s, c) => s + c.agendamentosAtivos, 0),
    }),
    [lista]
  );

  function aplicarPatch(id: string, p: PatchCliente) {
    setLista((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }

  const FILTROS: { chave: Filtro; rotulo: string }[] = [
    { chave: "todos", rotulo: "Todos" },
    { chave: "mensalista", rotulo: "Mensalistas" },
    { chave: "assinatura", rotulo: "Assinaturas" },
    { chave: "vip", rotulo: "VIP" },
    { chave: "bloqueado", rotulo: "Bloqueados" },
  ];

  return (
    <div>
      {/* Resumo — totais do banco */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ResumoStat rotulo="Mensalistas" valor={resumo.mensalistas} />
        <ResumoStat rotulo="Assinaturas" valor={resumo.assinaturas} />
        <ResumoStat rotulo="Agend. ativos" valor={resumo.ativos} />
        <ResumoStat rotulo="Bloqueados" valor={resumo.bloqueados} />
      </div>

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* Filtros compactos */}
      <div className="mb-4 flex gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filtro === f.chave
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {lista.length === 0 ? "Nenhum cliente cadastrado." : "Nada encontrado."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((c) => {
            const fazAniversario = aniversarioHoje(c.aniversarioMesDia);
            return (
              <motion.li key={c.id} layout>
                <button
                  onClick={() => setPerfilId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-muted/40",
                    c.bloqueado ? "border-destructive/40" : "border-border"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{c.nome}</span>
                      {c.mensalista && <Pill tom="azul">Mensalista</Pill>}
                      {c.assinatura && (
                        <Pill tom="amber">
                          <Crown className="size-3" /> Assinatura
                        </Pill>
                      )}
                      {c.vip && (
                        <Pill tom="neutro">
                          <Star className="size-3" /> VIP
                        </Pill>
                      )}
                      {c.bloqueado && (
                        <Pill tom="vermelho">
                          <Ban className="size-3" /> Bloqueado
                        </Pill>
                      )}
                      {fazAniversario && (
                        <Pill tom="azul">
                          <Cake className="size-3" /> hoje
                        </Pill>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <span>{formatarTelefone(c.telefone)}</span>
                      <span>·</span>
                      <span>{c.totalAgendamentos} agend.</span>
                      {c.agendamentosAtivos > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary dark:text-primary-foreground">
                          <CalendarClock className="size-3" /> {c.agendamentosAtivos} ativo
                          {c.agendamentosAtivos > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <ClientePerfilSheet
        clienteId={perfilId}
        onFechar={() => setPerfilId(null)}
        onAbrirFotos={() => {
          const c = lista.find((x) => x.id === perfilId);
          if (c) setFotosAlvo(c);
        }}
        onPatch={aplicarPatch}
      />

      <FotosClienteModal
        clienteId={fotosAlvo?.id ?? null}
        clienteNome={fotosAlvo?.nome ?? ""}
        onFechar={() => setFotosAlvo(null)}
      />
    </div>
  );
}
