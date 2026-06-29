import { create } from "zustand";

export type ServicoSelecionado = {
  id: string;
  nome: string;
  preco: number;
  slotsNecessarios?: number; // 2 = exige 2 horários seguidos (coloração). default 1
};

// Produto adicionado no upsell do checkout (retira na hora do corte)
export type ExtraSelecionado = {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
};

export type FormaPagamento = "pix" | "cartao" | "local" | "mensalista";

export type MensalistaInfo = { nome: string; telefone: string };

type BookingState = {
  passo: number; // 0=horário, 1=serviços, 2=identificação, 3=pagamento, 4=ticket
  servicos: ServicoSelecionado[];
  extras: ExtraSelecionado[]; // produtos do upsell
  data: string | null; // YYYY-MM-DD
  horario: string | null; // HH:MM (início)
  horarioFim: string | null; // HH:MM (2º slot, quando o serviço exige 2 horários)
  formaPagamento: FormaPagamento | null;
  mensalista: MensalistaInfo | null; // preenchido quando verificado no passo de pagamento
  nome: string;
  telefone: string;

  toggleServico: (s: ServicoSelecionado) => void;
  setExtraQtd: (p: { id: string; nome: string; preco: number }, qtd: number) => void;
  setData: (d: string) => void;
  setHorario: (h: string, fim?: string | null) => void;
  setFormaPagamento: (f: FormaPagamento) => void;
  setMensalista: (m: MensalistaInfo | null) => void;
  setNome: (n: string) => void;
  setTelefone: (t: string) => void;

  avancar: () => void;
  voltar: () => void;
  irPara: (p: number) => void;
  reset: () => void;

  // Pré-seleciona serviços e vai pro passo de horário ("Repetir Último Corte" / deep link).
  preselecionar: (servicos: ServicoSelecionado[]) => void;

  valorTotal: () => number;
  slotsNecessarios: () => number; // maior exigência entre os serviços (1 ou 2)
};

const estadoInicial = {
  passo: 0,
  servicos: [] as ServicoSelecionado[],
  extras: [] as ExtraSelecionado[],
  data: null as string | null,
  horario: null as string | null,
  horarioFim: null as string | null,
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

  setExtraQtd: (p, qtd) =>
    set((state) => {
      const outros = state.extras.filter((x) => x.id !== p.id);
      return {
        extras:
          qtd <= 0 ? outros : [...outros, { ...p, qtd }],
      };
    }),

  setData: (data) => set({ data, horario: null, horarioFim: null }),
  setHorario: (horario, horarioFim = null) => set({ horario, horarioFim }),
  setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
  setMensalista: (mensalista) => set({ mensalista }),
  setNome: (nome) => set({ nome }),
  setTelefone: (telefone) => set({ telefone }),

  avancar: () => set((s) => ({ passo: Math.min(s.passo + 1, 4) })),
  voltar: () => set((s) => ({ passo: Math.max(s.passo - 1, 0) })),
  irPara: (passo) => set({ passo }),
  reset: () => set(estadoInicial),

  preselecionar: (servicos) =>
    set({ servicos, data: null, horario: null, horarioFim: null, passo: 0 }),

  valorTotal: () => {
    const s = get().servicos.reduce((acc, x) => acc + x.preco, 0);
    const e = get().extras.reduce((acc, x) => acc + x.preco * x.qtd, 0);
    return s + e;
  },

  slotsNecessarios: () =>
    Math.max(1, ...get().servicos.map((s) => s.slotsNecessarios ?? 1)),
}));
