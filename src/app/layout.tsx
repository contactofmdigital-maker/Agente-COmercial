import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UpScale IA | Agente Comercial VIP",
  description: "Espacio comercial inteligente para gestionar prospectos y oportunidades.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
