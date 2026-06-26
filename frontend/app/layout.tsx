import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ShaderBackground from "@/components/ShaderBackground";
import { Toaster } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Poornima CMS",
  description: "Complaint Management System for Poornima College Of Engineering",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poornima CMS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", plusJakarta.variable, inter.variable, jetBrains.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col bg-bg text-body">
        <ShaderBackground />
        <Toaster />
        <Providers>
          <div className="relative z-10 min-h-screen flex flex-col overflow-x-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

