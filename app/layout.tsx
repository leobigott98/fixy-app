import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Fixy",
  description: "Modern workshop operating system for auto repair shops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
