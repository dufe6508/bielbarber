"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  QrCode,
  CreditCard,
  Store,
  BadgeCheck,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useBooking, type FormaPagamento } from "@/lib/store/booking";
import {
  formatarTelefone,
  telefoneNumeros,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { UpsellProdutos } from "./UpsellProdutos";

const opcoes: {
  valor: FormaPagamento;
  titulo: string;
  descricao: string;
  icone: React.ElementType;
}[] = [
  { valor: "pix", titulo: "Pix", descricao: "Pague agora, na hora", icone: QrCode },
  {
    valor: "cartao",
    titulo: "Cartão",
    descricao: "Crédito ou débito online",
    icone: CreditCard,
  },
  {
    valor: "local",
    titulo: "Pagar no local",
    descricao: "Pague direto na barbearia",
    icone: Store,
  },
  {
    valor: "mensalista",
    titulo: "Sou mensalista",
    descricao: "Soma no seu ciclo, paga depois",
    icone: BadgeCheck,
  },
];

type VerifResposta =
  | { mensalista: true; nome: string }
  | { mensalista: false; nome: string };

export function StepPagamento() {
  const { formaPagamento, setFormaPagamento, mensalista, setMensalista, setNome, setTelefone, telefone } =
    useBooking();
  // já temos o telefone do passo de identificação — pré-preenche a verificação
  const [telLocal, setTelLocal] = useState(telefone);

  const verificar = useMutation<VerifResposta, Error, string>({
    mutationFn: async (tel: string) => {
      const res = await fetch(`/api/mensalistas/${tel}`);
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error ?? "Não encontramos esse telefone.");
      return dados;
    },
    onSuccess: (dados, tel) => {
      if (dados.mensalista) {
        setMensalista({ nome: dados.nome, telefone: tel });
        // prefill identificação
        setNome(dados.nome);
        setTelefone(formatarTelefone(tel));
      } else {
        setMensalista(null);
      }
    },
  });

  function escolher(valor: FormaPagamento) {
    setFormaPagamento(valor);
    if (valor !== "mensalista") {
      setMensalista(null);
      verificar.reset();
    }
  }

  function checar(e: React.FormEvent) {
    e.preventDefault();
    const tel = telefoneNumeros(telLocal);
    if (tel.length < 10) return;
    setMensalista(null);
    verificar.mutate(tel);
  }

  // mensagem "não cadastrado" quando a verificação retornou mensalista:false
  const naoMensalista =
    verificar.isSuccess && verificar.data.mensalista === false
      ? verificar.data.nome
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Como prefere pagar?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você escolhe, sem complicação.
        </p>
      </div>

      <div className="space-y-3">
        {opcoes.map((op) => {
          const Icone = op.icone;
          const ativo = formaPagamento === op.valor;
          return (
            <div key={op.valor}>
              <button
                type="button"
                onClick={() => escolher(op.valor)}
                aria-pressed={ativo}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-[transform,border-color,background-color] active:scale-[0.99]",
                  ativo
                    ? "border-primary bg-accent/60"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                    ativo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icone className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {op.titulo}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {op.descricao}
                  </span>
                </span>
                {ativo && (
                  <Check className="size-5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>

              {/* Verificação de mensalista (inline) */}
              <AnimatePresence>
                {op.valor === "mensalista" && ativo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                      {mensalista ? (
                        // Verificado com sucesso
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-5" strokeWidth={2.5} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              Confirmado, {mensalista.nome.split(" ")[0]}!
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Este corte entra no seu ciclo.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={checar} className="space-y-3">
                          <label className="block text-sm font-medium text-foreground">
                            Confirme seu telefone de mensalista
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              inputMode="numeric"
                              placeholder="(31) 99999-9999"
                              value={telLocal}
                              onChange={(e) =>
                                setTelLocal(formatarTelefone(e.target.value))
                              }
                              className="h-11 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-base tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                            />
                            <button
                              type="submit"
                              disabled={
                                telefoneNumeros(telLocal).length < 10 ||
                                verificar.isPending
                              }
                              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
                            >
                              {verificar.isPending ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                  <span className="sr-only">Verificando...</span>
                                </>
                              ) : (
                                "Verificar"
                              )}
                            </button>
                          </div>

                          {/* Não é mensalista */}
                          {naoMensalista && (
                            <p className="flex items-start gap-2 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                              <span>
                                {naoMensalista.split(" ")[0]}, você ainda não
                                está cadastrado como mensalista. Fale com a
                                barbearia ou escolha outra forma de pagamento.
                              </span>
                            </p>
                          )}
                          {/* Telefone não encontrado */}
                          {verificar.isError && (
                            <p className="flex items-start gap-2 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                              {verificar.error.message}
                            </p>
                          )}
                        </form>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <UpsellProdutos />
    </div>
  );
}
