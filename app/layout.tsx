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
  title: "Qwikker",
  description: "Discover local businesses and exclusive offers",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover"
  },
  icons: {
    icon: '/qwikker-icon.svg',
    apple: '/qwikker-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Qwikker",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Qwikker',
    'theme-color': '#00d083',
    'msapplication-TileColor': '#00d083',
    'msapplication-navbutton-color': '#00d083',
    'apple-touch-fullscreen': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('✅ SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('❌ SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <style jsx global>{`
          /* iOS Safari fixes */
          html, body {
            height: 100%;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Fix iOS Safari layout shifts */
          @supports (padding: max(0px)) {
            body {
              padding-top: max(env(safe-area-inset-top), 0px);
              padding-bottom: max(env(safe-area-inset-bottom), 0px);
              padding-left: max(env(safe-area-inset-left), 0px);
              padding-right: max(env(safe-area-inset-right), 0px);
            }
          }
          
          /* Prevent zoom on input focus (iOS) */
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          textarea,
          select {
            font-size: 16px !important;
            -webkit-appearance: none;
            border-radius: 0;
          }
          
          /* Fix button alignment on mobile */
          button {
            -webkit-appearance: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          /* Android Chrome fixes */
          @media screen and (-webkit-min-device-pixel-ratio: 0) {
            select,
            textarea,
            input {
              font-size: 16px;
            }
          }
          
          /* Fix mobile navigation and touch targets */
          @media (max-width: 768px) {
            /* Ensure minimum touch target size */
            button,
            a,
            input,
            select,
            textarea {
              min-height: 44px;
              min-width: 44px;
            }
            
            /* Fix mobile grid layouts */
            .grid {
              gap: 1rem;
            }
            
            /* Fix mobile cards */
            .rounded-xl,
            .rounded-lg {
              border-radius: 12px;
            }
            
            /* Improve mobile padding */
            .p-6 {
              padding: 1rem;
            }
            
            .p-4 {
              padding: 0.75rem;
            }
          }
          
          /* PWA specific styles */
          @media all and (display-mode: standalone) {
            body {
              padding-top: env(safe-area-inset-top);
            }
          }
          
          /* Prevent horizontal scroll - CRITICAL */
          * {
            box-sizing: border-box;
          }
          
          html {
            overflow-x: hidden;
            width: 100%;
          }
          
          body {
            overflow-x: hidden;
            width: 100%;
            position: relative;
          }
          
          /* Force all containers to stay within viewport */
          .container,
          .max-w-7xl,
          .max-w-6xl,
          .max-w-4xl,
          .max-w-2xl,
          .max-w-xl,
          .max-w-lg,
          .max-w-md,
          .max-w-sm {
            max-width: 100%;
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          /* Fix common culprits of horizontal scroll */
          .grid {
            width: 100%;
            max-width: 100%;
          }
          
          .flex {
            max-width: 100%;
          }
          
          /* Fix cards and components */
          .rounded-xl,
          .rounded-lg,
          .rounded-md {
            max-width: 100%;
          }
          
          /* Ensure images don't cause overflow */
          img {
            max-width: 100%;
            height: auto;
          }
          
          /* Fix tables on mobile */
          table {
            width: 100%;
            table-layout: fixed;
          }
          
          /* Fix pre and code blocks */
          pre, code {
            max-width: 100%;
            overflow-x: auto;
          }
          
          /* Fix any wide elements */
          @media (max-width: 768px) {
            * {
              max-width: 100vw;
            }
            
            .w-screen {
              width: 100vw;
              max-width: 100vw;
            }
            
            /* Fix specific layout issues */
            .grid-cols-2,
            .grid-cols-3,
            .grid-cols-4 {
              gap: 0.75rem;
            }
            
            /* Ensure buttons don't overflow */
            button {
              max-width: 100%;
              word-wrap: break-word;
            }
            
            /* Fix form elements */
            input,
            select,
            textarea {
              max-width: 100%;
            }
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
