import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Send Message — Chat Room Sementara",
    short_name: "Send Message",
    description:
      "Buat room, bagikan kodenya, dan mengobrol secara realtime. Pesan tidak pernah disimpan.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f3fa",
    theme_color: "#4c5bf5",
    lang: "id",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
