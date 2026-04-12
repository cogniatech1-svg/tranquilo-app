import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tranquilo — Finanzas Personales',
  description: 'Ajustes pequeños para llegar tranquilo a fin de mes',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D6259',
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
        {/* Manifest y iconos PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" sizes="512x512" />

        {/* Meta tags para PWA y móvil */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tranquilo" />
        <meta name="application-name" content="Tranquilo" />

        {/* Windows */}
        <meta name="msapplication-TileColor" content="#0D6259" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="msapplication-config" content="none" />

        {/* Android */}
        <meta name="theme-color" content="#0D6259" />
      </head>
      <body className={`${geist.variable} antialiased`}>
        {children}

        {/* ── Service worker registration ───────────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function(registration) {
        registration.addEventListener('updatefound', function() {
          var newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[SW] Registration failed:', err);
      });
  });
})();
            `,
          }}
        />
      </body>
    </html>
  )
}
