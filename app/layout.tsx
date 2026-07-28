import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";

/*
 * Newsreader for display. An editorial old style serif: proper stress, sober
 * proportions, and none of the wonk that made Fraunces read as a design
 * exercise rather than as a hotel. It has a real optical size axis, which is
 * the reason to choose it here specifically, because this site sets the same
 * face at 0.9rem in a plans table and at 4.5rem across a hero. Requesting
 * `opsz` lets the browser pick the drawing rather than scaling one drawing,
 * so the large settings keep their fine hairlines and the small ones do not
 * fall apart.
 *
 * Public Sans for body. Quiet, neutral, slightly narrow, and it sits properly
 * underneath a serif at small sizes without competing with it. Deliberately
 * not Inter.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  axes: ["opsz"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "StayMate, the concierge on the desk",
  description:
    "A QR triggered concierge for boutique hotels. One card on the desk, and every guest question answered.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${publicSans.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
