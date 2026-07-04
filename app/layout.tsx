import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Send Message — Chat Room Sementara",
  description:
    "Buat room, bagikan kodenya, dan mengobrol secara realtime. Pesan tidak pernah disimpan.",
  applicationName: "Send Message",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Send Message",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1226" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body
        className={`${bricolage.variable} ${instrument.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
