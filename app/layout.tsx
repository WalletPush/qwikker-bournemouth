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
  title: "Qwikker - Discover Local Businesses",
  description: "Discover local businesses, unlock secret menus, and get exclusive offers in your city",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qwikker",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Qwikker",
    title: "Qwikker - Discover Local Businesses",
    description: "Discover local businesses, unlock secret menus, and get exclusive offers in your city",
  },
  twitter: {
    card: "summary",
    title: "Qwikker - Discover Local Businesses",
    description: "Discover local businesses, unlock secret menus, and get exclusive offers in your city",
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
        {children}
      </body>
    </html>
  );
}
