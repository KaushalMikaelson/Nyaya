import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nyaay – AI Legal Assistant for Indian Law",
  description: "Get instant, accurate answers to your Indian legal questions powered by Nyaay AI. Free legal guidance at your fingertips.",
  keywords: ["legal AI", "Indian law", "legal assistant", "Nyaay"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: "#0a0a0f", color: "#f1f1f5" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
