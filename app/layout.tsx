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
      { url: '/icons/icon-192-verde.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512-verde.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192-verde.png', sizes: '192x192', type: 'image/png' },
    ],
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
        {/* ── Android / Chrome ─────────────────────────────── */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ── iOS Safari ───────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tranquilo" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192-verde.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512-verde.png" />

        {/* ── Windows ──────────────────────────────────────── */}
        <meta name="msapplication-TileColor" content="#0D6259" />
        <meta name="msapplication-TileImage" content="/icons/icon-192-verde.png" />
      </head>
      <body className={`${geist.variable} antialiased`}>
        {children}

        {/* ── Version check (force PWA update) ──────────────────────────────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  let lastVersion = localStorage.getItem('tranquilo_version');

  function checkVersion() {
    fetch('/version.json?t=' + Date.now())
      .then(r => r.json())
      .then(data => {
        if (lastVersion && lastVersion !== data.version) {
          localStorage.setItem('tranquilo_version', data.version);
          window.location.reload();
        } else if (!lastVersion) {
          localStorage.setItem('tranquilo_version', data.version);
        }
      })
      .catch(() => {});
  }

  checkVersion();
  setInterval(checkVersion, 3000);
})();
            `,
          }}
        />

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
