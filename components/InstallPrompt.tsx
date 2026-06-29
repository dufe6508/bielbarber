"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { X, Download, Share, Plus, ChevronRight } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Modo = "android" | "ios-safari" | "ios-outro" | null;

const DISPENSADO = "pwa-install-dispensado";
const PRAZO = 14 * 24 * 60 * 60 * 1000; // reaparece após 14 dias

function dispensadoRecente(): boolean {
  const t = Number(localStorage.getItem(DISPENSADO) || 0);
  return t > 0 && Date.now() - t < PRAZO;
}

// iOS esconde-se de várias formas: iPhone/iPad clássico no UA, e iPad recente
// que se reporta como "MacIntel" mas tem toque.
function detectarIOS(): boolean {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

// No iOS, "Adicionar à Tela de Início" só existe no Safari. Chrome/Firefox/Edge
// no iOS (crios/fxios/edgios) não têm a opção → mandar abrir no Safari.
function ehSafariIOS(): boolean {
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

function jaInstalado(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [evento, setEvento] = useState<BIPEvent | null>(null);
  const [modo, setModo] = useState<Modo>(null);
  const [visivel, setVisivel] = useState(false);
  const [sheet, setSheet] = useState(false); // folha de instrução iOS

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (jaInstalado() || dispensadoRecente()) return;

    // Android/Chrome: o evento chega → instalação real disponível.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvento(e as BIPEvent);
      setModo("android");
      setVisivel(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS não dispara evento — decide o modo por detecção (com pequeno atraso
    // pra não competir com o carregamento inicial).
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (detectarIOS()) {
      timer = setTimeout(() => {
        setModo(ehSafariIOS() ? "ios-safari" : "ios-outro");
        setVisivel(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dispensar() {
    localStorage.setItem(DISPENSADO, String(Date.now()));
    setVisivel(false);
    setSheet(false);
  }

  async function instalarAndroid() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null);
    setVisivel(false);
    if (outcome === "dismissed") localStorage.setItem(DISPENSADO, String(Date.now()));
  }

  const subtitulo =
    modo === "ios-outro"
      ? "Abra este site no Safari para instalar."
      : "Instale na tela inicial. Abre como app.";

  return (
    <>
      <AnimatePresence>
        {visivel && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[calc(64px+env(safe-area-inset-bottom)+0.75rem)] md:pb-5"
            role="dialog"
            aria-label="Instalar o app"
          >
            <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl">
              <Image
                src="/icon-192.png"
                alt="Biel Barber Shop"
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  Biel Barber Shop
                </p>
                <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
              </div>

              {modo === "android" && (
                <button
                  type="button"
                  onClick={instalarAndroid}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:opacity-90 active:scale-95"
                >
                  <Download className="size-4" />
                  Instalar
                </button>
              )}
              {modo === "ios-safari" && (
                <button
                  type="button"
                  onClick={() => setSheet(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:opacity-90 active:scale-95"
                >
                  Instalar
                  <ChevronRight className="size-4" />
                </button>
              )}

              <button
                type="button"
                onClick={dispensar}
                aria-label="Dispensar"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folha de instrução iOS Safari — Apple não permite instalar via código,
          então mostramos os 2 passos com os ícones reais do sistema. */}
      <AnimatePresence>
        {sheet && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setSheet(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="relative w-full max-w-sm rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src="/icon-192.png"
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full"
                />
                <div>
                  <p className="font-heading text-base font-semibold tracking-tight text-foreground">
                    Adicionar à tela inicial
                  </p>
                  <p className="text-xs text-muted-foreground">2 toques no Safari</p>
                </div>
              </div>

              <ol className="space-y-3">
                <PassoIOS numero={1} icone={<Share className="size-4" />}>
                  Toque em <strong className="text-foreground">Compartilhar</strong> na barra
                  do Safari
                </PassoIOS>
                <PassoIOS numero={2} icone={<Plus className="size-4" />}>
                  Escolha{" "}
                  <strong className="text-foreground">Adicionar à Tela de Início</strong>
                </PassoIOS>
              </ol>

              <button
                type="button"
                onClick={() => setSheet(false)}
                className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PassoIOS({
  numero,
  icone,
  children,
}: {
  numero: number;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground">
        {numero}
      </span>
      <p className="flex-1 text-sm text-muted-foreground">{children}</p>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        {icone}
      </span>
    </li>
  );
}
