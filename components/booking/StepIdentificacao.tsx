"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, MapPin } from "lucide-react";
import { useBooking } from "@/lib/store/booking";
import { formatarTelefone, telefoneNumeros } from "@/lib/utils/format";
import { lembrarTelefone } from "@/lib/utils/telefone";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Reconhecimento =
  | { encontrado: false }
  | { encontrado: true; nome: string; mensalista: boolean };

export function StepIdentificacao() {
  const { nome, telefone, setNome, setTelefone } = useBooking();
  const digitos = telefoneNumeros(telefone);
  const completo = digitos.length >= 10;

  // Debounce: só busca quando o número para de mudar por 250ms — evita disparar
  // a cada dígito (10º e 11º) enquanto o cliente ainda digita.
  const [digitosBusca, setDigitosBusca] = useState("");
  useEffect(() => {
    if (!completo) return;
    const t = setTimeout(() => setDigitosBusca(digitos), 250);
    return () => clearTimeout(t);
  }, [digitos, completo]);

  const { data: rec } = useQuery<Reconhecimento>({
    queryKey: ["cliente", digitosBusca],
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${digitosBusca}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: digitosBusca.length >= 10,
    staleTime: 5 * 60 * 1000,
  });

  // Reconheceu o cliente → pré-preenche o nome (sem sobrescrever o que ele digitou)
  useEffect(() => {
    if (rec?.encontrado && !nome.trim()) setNome(rec.nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);

  // Lembra o telefone pra pré-preencher em "Meus agendamentos" / "Mensalista"
  useEffect(() => {
    if (completo) lembrarTelefone(digitos);
  }, [completo, digitos]);

  const reconhecido = completo && rec?.encontrado === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Seus dados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O horário fica reservado no seu nome.
        </p>
      </div>

      <div className="max-w-md space-y-5">
        {/* Telefone primeiro — é a chave que reconhece o cliente */}
        <div className="space-y-2">
          <Label htmlFor="telefone" className="text-sm font-medium">
            Telefone (WhatsApp)
          </Label>
          <Input
            id="telefone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(31) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            className="h-12 font-mono text-base tabular-nums"
          />

          {/* Reconhecimento — boas-vindas pro cliente recorrente */}
          <AnimatePresence mode="wait">
            {reconhecido && (
              <motion.div
                key="bemvindo"
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <p className="flex items-center gap-2 pt-1 text-sm font-medium text-foreground">
                  <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  Bem-vindo de volta, {rec.nome.split(" ")[0]}!
                  {rec.mensalista && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      Mensalista
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-sm font-medium">
            Nome
          </Label>
          <Input
            id="nome"
            type="text"
            inputMode="text"
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* Atendimento — preenche o espaço com relação/confiança, não com processo */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <Logo className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold text-foreground">
              Atendimento com Biel
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              Av. Serrinha, 82 · Vale do Jatobá
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
