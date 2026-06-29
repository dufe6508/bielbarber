"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Wallet, CalendarClock, Scissors } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PagamentoDrawer } from "@/components/PagamentoDrawer";
import { Input } from "@/components/ui/input";
import {
  formatarTelefone,
  telefoneNumeros,
  formatarData,
  formatarPreco,
} from "@/lib/utils/format";
import { lembrarTelefone, telefoneLembrado } from "@/lib/utils/telefone";

type Servico = { nome: string; preco: string };
type Corte = {
  id: string;
  data: string;
  horarioInicio: string;
  valorTotal: string;
  servicos: Servico[];
};
type Resultado =
  | { mensalista: false; nome: string }
  | {
      mensalista: true;
      nome: string;
      diaCobranca: number;
      proximaCobranca: string | null;
      agendamentos: Corte[];
      total: number;
    };

export default function MensalistaPage() {
  const [telefone, setTelefone] = useState("");
  const [pagar, setPagar] = useState(false);

  const busca = useMutation<Resultado, Error, string>({
    mutationFn: async (tel: string) => {
      const res = await fetch(`/api/mensalistas/${tel}`);
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Erro ao buscar.");
      return dados;
    },
  });

  // Pré-preenche (e já entra) com o telefone usado no agendamento
  useEffect(() => {
    const t = telefoneLembrado();
    if (t) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill do telefone lembrado no mount
      setTelefone(formatarTelefone(t));
      busca.mutate(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const tel = telefoneNumeros(telefone);
    if (tel.length < 10) return;
    lembrarTelefone(tel);
    busca.mutate(tel);
  }

  const podeBuscar = telefoneNumeros(telefone).length >= 10;
  const r = busca.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <PageHeader
        titulo="Mensalista"
        descricao="Acompanhe seus cortes do mês e pague a mensalidade. Digite seu telefone para entrar."
      />

      <form onSubmit={buscar} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(31) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          className="h-12 font-mono text-base tabular-nums sm:flex-1"
        />
        <button
          type="submit"
          disabled={!podeBuscar || busca.isPending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busca.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Entrar
        </button>
      </form>

      {/* Erro / não encontrado */}
      {busca.isError && (
        <EstadoVazio
          icone={Search}
          titulo={busca.error.message}
          texto="Confira o número e tente de novo."
        />
      )}

      {/* Não é mensalista */}
      {r && r.mensalista === false && (
        <EstadoVazio
          icone={Wallet}
          titulo={`Olá, ${r.nome.split(" ")[0]}`}
          texto="Você ainda não é mensalista. Fale com a barbearia para ativar seu plano pós-pago."
        />
      )}

      {/* Mensalista — ciclo */}
      {r && r.mensalista === true && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Ciclo aberto de{" "}
                <span className="font-medium text-foreground">{r.nome}</span>
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                Fecha dia {r.diaCobranca}
                {r.proximaCobranca && (
                  <span className="font-mono tabular-nums">
                    · {formatarData(r.proximaCobranca)}
                  </span>
                )}
              </div>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              {r.agendamentos.length}{" "}
              {r.agendamentos.length === 1 ? "corte" : "cortes"}
            </span>
          </div>

          {r.agendamentos.length === 0 ? (
            <EstadoVazio
              icone={Scissors}
              titulo="Nenhum corte neste ciclo"
              texto="Quando você cortar, os atendimentos aparecem aqui."
            />
          ) : (
            <>
              {/* Lista de cortes — como um "carrinho" do ciclo */}
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                className="mt-5 space-y-3"
              >
                {r.agendamentos.map((c) => (
                  <motion.li
                    key={c.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-primary/[0.05]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Scissors className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {c.servicos.map((s) => s.nome).join(", ")}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatarData(c.data)} · {c.horarioInicio}
                      </p>
                    </div>
                    <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatarPreco(c.valorTotal)}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>

              {/* Total + pagar — peça focal, elevação maior */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-md shadow-primary/[0.04]">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total do ciclo
                  </span>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={r.total}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-2xl font-bold tabular-nums text-foreground"
                    >
                      {formatarPreco(r.total)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  onClick={() => setPagar(true)}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.97]"
                >
                  <Wallet className="size-4" />
                  Pagar mensalidade
                </button>
              </div>

              <PagamentoDrawer
                open={pagar}
                onOpenChange={setPagar}
                total={r.total}
              />
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: React.ElementType;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icone className="size-6" />
      </span>
      <p className="font-medium text-foreground">{titulo}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
