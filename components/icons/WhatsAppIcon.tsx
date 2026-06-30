// Logo do WhatsApp em contorno (outline) — traço, sem preenchimento, para um
// visual minimalista e consistente com os ícones lucide do sistema.
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 21l1.65-4.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10c.2 1 .9 2.1 1.9 3 .9.9 2 1.6 3 1.9.3.1.7 0 .9-.2l.7-.8c.2-.3.2-.6 0-.9-.2-.3-.7-.6-1.2-.9-.4-.2-.7-.1-1 .1l-.3.3c-.6-.3-1.1-.7-1.5-1.1-.4-.4-.8-.9-1.1-1.5l.3-.3c.2-.3.3-.6.1-1-.3-.5-.6-1-.9-1.2-.3-.2-.6-.2-.9 0l-.8.7c-.2.2-.3.6-.2.9z" />
    </svg>
  );
}
