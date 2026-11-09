import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Reportes Técnicos — Dirección de Innovación Digital",
  description:
    "Gestión centralizada de reportes técnicos, incidentes y solicitudes de mantenimiento institucional con trazabilidad, roles y reportes exportables.",
  keywords: ["reportes técnicos", "incidentes", "mantenimiento", "universidad", "innovación digital"],
  authors: [{ name: "Dirección de Innovación Digital" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
