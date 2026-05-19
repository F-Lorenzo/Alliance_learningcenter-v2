import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { WhatsAppButton } from "@/components/whatsapp-button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Alliance Learning Center",
    template: "%s | Alliance Learning Center",
  },
  description:
    "La plataforma oficial de Alliance Argentina. Accedé a más de 20 sistemas de jiu jitsu, técnica por técnica.",
  openGraph: {
    title: "Alliance Learning Center",
    description:
      "La plataforma oficial de Alliance Argentina. Accedé a más de 20 sistemas de jiu jitsu.",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
