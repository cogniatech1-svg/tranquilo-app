import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor PoC — feature/capacitor-poc
 *
 * IMPORTANTE: Este archivo es parte del Proof of Concept.
 * No fusionar a main hasta validar funcionamiento completo.
 *
 * Estrategia PoC:
 * - webDir: 'out' → para build estático (next export)
 * - server.url → apunta al servidor de desarrollo local
 *   Android emulador usa 10.0.2.2 para acceder al host
 *
 * NOTA: server.url se documenta como "solo desarrollo".
 * Para producción se requiere static export.
 */
const config: CapacitorConfig = {
  appId: 'co.tranquilo.app',
  appName: 'Tranquilo',
  webDir: 'out',
  server: {
    // Para pruebas con el servidor de desarrollo de Next.js
    // Android emulador: 10.0.2.2 = host machine localhost
    // Comentar esta sección para usar el build estático (out/)
    url: 'http://10.0.2.2:3000',
    cleartext: true, // Permite HTTP (solo desarrollo)
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
  ios: {
    scheme: 'Tranquilo',
  },
}

export default config
