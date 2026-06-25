"use client";

import { useBooking } from "@/lib/store/booking";
import { formatarTelefone } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StepIdentificacao() {
  const { nome, telefone, setNome, setTelefone } = useBooking();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Seus dados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Só o nome e o telefone. Sem senha, sem cadastro.
        </p>
      </div>

      <div className="max-w-md space-y-5">
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
        </div>
      </div>
    </div>
  );
}
