import type { QueryClient } from "@tanstack/react-query";

// Fonte única da query de horários — usada por useQuery e por prefetch,
// garantindo a MESMA chave de cache (clique vira instantâneo).
export function slotsQueryOptions(data: string | null) {
  return {
    queryKey: ["slots", data] as const,
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`/api/slots?data=${data}`);
      if (!res.ok) throw new Error("Erro ao carregar horários");
      return res.json();
    },
    enabled: !!data,
  };
}

// Pré-carrega um dia no cache sem bloquear a UI (hover/mount).
export function prefetchSlots(client: QueryClient, data: string) {
  client.prefetchQuery(slotsQueryOptions(data));
}
