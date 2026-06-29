"use client";

import { useEffect } from "react";
import { ativarPush } from "@/lib/notifications/subscribe-client";
import { telefoneLembrado } from "@/lib/utils/telefone";

// Pede permissão de push ao entrar no site. Se já tem telefone no localStorage,
// registra a subscription imediatamente. Senão, só garante a permissão — o
// BookingStepper chama ativarPush com o telefone após o agendamento.
export function PushInit() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    )
      return;

    const tel = telefoneLembrado();
    if (tel.length >= 10) {
      void ativarPush(tel);
    } else {
      void Notification.requestPermission();
    }
  }, []);

  return null;
}
