import { useSyncExternalStore } from "react";

// Retorna false na renderização do servidor / primeiro paint, true após montar.
// Sem useEffect+setState (evita cascading renders) — bom para guardar createPortal.
const assinar = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    assinar,
    () => true, // cliente
    () => false // servidor
  );
}
