import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Donasi Masjid Darul Hidayah",
    short_name: "Donasi MDH",
    description: "Aplikasi Donasi Pelunasan Hutang Pembangunan Masjid Darul Hidayah, Titik Nol Tanah Merah, Boven Digoel",
    start_url: "/",
    display: "standalone",
    background_color: "#109559",
    theme_color: "#109559",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
