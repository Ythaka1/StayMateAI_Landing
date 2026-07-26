import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";

/*
 * Type: Fraunces for display — a soft "old-style-ish" serif with real
 * letterpress character (variable optical size), which is exactly what a
 * cream table tent wants. Archivo for body — a quiet grotesque that stays
 * out of the way and reads cleanly at app-UI sizes on the phone layer.
 * Deliberately not Inter, not Playfair, not Cormorant.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "StayMate — the concierge on the desk",
  description:
    "A QR-triggered AI concierge for boutique hotels. One card on the desk, every guest question answered.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
