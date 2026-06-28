"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPinModal } from "@/components/AdminPinModal";

// Substitui o <Link href="/"> do logo. Comportamento:
//   • toque/clique curto → navega para a home
//   • long-press (900ms)  → abre o modal de acesso do admin (entrada oculta)
// Não há rótulo visível: só quem sabe do gesto chega ao login.
const LIMIAR_MS = 900;

export function AdminSecretLogo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disparou = useRef(false);

  function iniciar() {
    disparou.current = false;
    timer.current = setTimeout(() => {
      disparou.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
      setAberto(true);
    }, LIMIAR_MS);
  }

  function cancelar() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function aoClicar(e: React.MouseEvent) {
    if (disparou.current) {
      // Long-press já abriu o modal: não navega.
      e.preventDefault();
      disparou.current = false;
      return;
    }
    router.push("/");
  }

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        aria-label="Biel Barber Shop — início"
        className={className}
        style={{ cursor: "pointer", touchAction: "manipulation" }}
        onPointerDown={iniciar}
        onPointerUp={cancelar}
        onPointerLeave={cancelar}
        onPointerCancel={cancelar}
        onClick={aoClicar}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push("/");
          }
        }}
      >
        {children}
      </div>
      <AdminPinModal
        key={aberto ? "on" : "off"}
        aberto={aberto}
        onFechar={() => setAberto(false)}
      />
    </>
  );
}
