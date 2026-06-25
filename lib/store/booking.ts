import { create } from "zustand";

export type ServicoSelecionado = {
  id: string;
  nome: string;
  preco: number;
};

export type FormaPagamento = "pix" | "cartao" | "local" | "mensalista";

export type MensalistaInfo = { nome: string; telefone: string };

type BookingState = {
  passo: number; // 0=serviços, 1=horário, 2=pagamento, 3=identificação, 4=ticket
  servicos: ServicoSelecionado[];
  data: string | null; // YYYY-MM-DD
  horario: string | null; // HH:MM
  formaPagamento: FormaPagamento | null;
  mensalista: MensalistaInfo | null; // preenchido quando verificado no passo de pagamento
  nome: string;
  telefone: string;

  toggleServico: (s: ServicoSelecionado) => void;
  setData: (d: string) => void;
  setHorario: (h: string) => void;
  setFormaPagamento: (f: FormaPagamento) => void;
  setMensalista: (m: MensalistaInfo | null) => void;
  setNome: (n: string) => void;
  setTelefone: (t: string) => void;

  avancar: () => void;
  voltar: () => void;
  irPara: (p: number) => void;
  reset: () => void;

  valorTotal: () => number;
};

const estadoInicial = {
  passo: 0,
  servicos: [] as ServicoSelecionado[],
  data: null as string | null,
  horario: null as string | null,
  formaPagamento: null as FormaPagamento | null,
  mensalista: null as MensalistaInfo | null,
  nome: "",
  telefone: "",
};

export const useBooking = create<BookingState>((set, get) => ({
  ...estadoInicial,

  toggleServico: (s) =>
    set((state) => {
      const existe = state.servicos.find((x) => x.id === s.id);
      return {
        servicos: existe
          ? state.servicos.filter((x) => x.id !== s.id)
          : [...state.servicos, s],
      };
    }),

  setData: (data) => set({ data, horario: null }),
  setHorario: (horario) => set({ horario }),
  setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
  setMensalista: (mensalista) => set({ mensalista }),
  setNome: (nome) => set({ nome }),
  setTelefone: (telefone) => set({ telefone }),

  avancar: () => set((s) => ({ passo: Math.min(s.passo + 1, 4) })),
  voltar: () => set((s) => ({ passo: Math.max(s.passo - 1, 0) })),
  irPara: (passo) => set({ passo }),
  reset: () => set(estadoInicial),

  valorTotal: () => get().servicos.reduce((acc, s) => acc + s.preco, 0),
}));
