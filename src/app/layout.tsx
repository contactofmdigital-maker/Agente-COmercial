import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://upscaleia.cl"),
  title: {
    default: "UpScale IA | Inteligencia comercial para tu negocio",
    template: "%s | UpScale IA",
  },
  description: "Configura, prueba y mejora un agente comercial con el contexto de tu negocio. Organiza conocimiento y simula conversaciones desde una sola plataforma.",
  applicationName: "UpScale IA",
  openGraph: {
    title: "UpScale IA | Inteligencia comercial para tu negocio",
    description: "Configura, prueba y mejora tu agente comercial con el contexto de tu negocio.",
    siteName: "UpScale IA",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UpScale IA | Inteligencia comercial para tu negocio",
    description: "Configura, prueba y mejora tu agente comercial con el contexto de tu negocio.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
