import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QWIKKER - Business Dashboard",
  description: "QWIKKER business management platform - Grow your business with smart customer engagement tools",
  icons: {
    icon: '/qwikker-icon.svg',
    apple: '/qwikker-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
      >
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-center py-2 text-sm font-medium">
          🚧 DEMO VERSION - Platform in active development
        </div>
        {children}
      </body>
    </html>
  );
}
