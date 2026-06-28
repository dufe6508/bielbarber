import type { MetadataRoute } from "next";

// Manifest PWA — permite "instalar" o site como app na tela inicial.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biel Barber Shop",
    short_name: "Biel Barber",
    description: "Agende seu corte no Biel Barber Shop.",
    start_url: "/",
    display: "standalone",
    background_color: "#141417",
    theme_color: "#141417",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
