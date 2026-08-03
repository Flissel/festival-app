import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getEvent } from "@/lib/event";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Der Name kommt aus dem Admin, also muss auch der Seitentitel pro Aufruf
// entstehen — sonst hieße der Tab weiter wie beim letzten Deploy.
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getEvent();
  return {
    title: `${name} — Einladung`,
    description: "Einladung, Anmeldung und Beitrag für unser Festival",
    openGraph: {
      title: `${name} — Du bist eingeladen`,
      description: "Trag dich ein und sichere dir deinen Platz. Beitrag auf Spendenbasis.",
      type: "website",
      locale: "de_DE",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
