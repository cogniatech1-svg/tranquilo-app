import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tranquilo',
  description: 'Ajustes pequeños para llegar tranquilo a fin de mes',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tranquilo',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F766E',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* PWA — Android/Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* PWA — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tranquilo" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Splash background while loading on iOS */}
        <meta name="msapplication-TileColor" content="#0F766E" />
      </head>
      <body className={`${geist.variable} antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      reg.addEventListener('updatefound', function() {
                        var sw = reg.installing;
                        if (!sw) return;
                        sw.addEventListener('statechange', function() {
                          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available — activate immediately
                            sw.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
