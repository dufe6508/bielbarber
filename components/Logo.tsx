"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Logo redonda. Se /biel-logo.png não existir, mostra um fallback com a inicial.
export function Logo({ className }: { className?: string }) {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-primary font-heading font-bold text-primary-foreground",
          className
        )}
        aria-label="Biel Barber Shop"
      >
        B
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/biel-logo.png"
      alt="Biel Barber Shop"
      onError={() => setErro(true)}
      className={cn("object-cover", className)}
    />
  );
}
