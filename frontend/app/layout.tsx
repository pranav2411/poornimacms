import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";
import ShaderBackground from "@/components/ShaderBackground";
import { Toaster } from "@/components/Toaster";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Poornima CMS",
  description: "Complaint Management System for Poornima College Of Engineering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", plusJakarta.variable, inter.variable, jetBrains.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-bg text-body">
        <ShaderBackground />
        <Toaster />
        <div className="relative z-10 h-screen flex flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
