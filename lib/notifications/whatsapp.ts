import type { NotificationEvent } from "./events";

// ponytail: stub — envio real depende de provedor escolhido (Meta Cloud API,
// Twilio, etc.) + número aprovado + token. Quando definir o BSP, plugar aqui.
// Mantém o mesmo contrato de evento do push para reaproveitar os triggers.
export async function sendWhatsAppToClient(
  telefone: string,
  event: NotificationEvent
): Promise<void> {
  // TODO: POST para a API do provedor com template aprovado.
  console.log("[whatsapp stub]", telefone, event.type);
}
