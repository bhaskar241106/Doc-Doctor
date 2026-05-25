import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DocDoctor - Autonomous Developer Knowledge Agent",
  description: "Autonomous code parsing, real-time documentation synchronization, and AI-powered repository intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakarta.variable} h-full scroll-smooth`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="h-full text-white bg-slate-950 antialiased">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
