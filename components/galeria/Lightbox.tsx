"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMounted } from "@/lib/hooks/useMounted";

// Lightbox fullscreen com swipe (embla). Navega entre todas as imagens da categoria.
export function Lightbox({
  imagens,
  inicial,
  onFechar,
}: {
  imagens: string[];
  inicial: number;
  onFechar: () => void;
}) {
  const montado = useMounted();
  const [emblaRef, embla] = useEmblaCarousel({ startIndex: inicial, loop: true });

  const anterior = useCallback(() => embla?.scrollPrev(), [embla]);
  const proximo = useCallback(() => embla?.scrollNext(), [embla]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proximo();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onFechar, anterior, proximo]);

  if (!montado) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={onFechar}
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          <X className="size-5" />
        </button>

        <div className="h-full w-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {imagens.map((src, i) => (
              <div key={i} className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="max-h-full max-w-full select-none object-contain" />
              </div>
            ))}
          </div>
        </div>

        {imagens.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={anterior}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20 sm:inline-flex"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima"
              onClick={proximo}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20 sm:inline-flex"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
