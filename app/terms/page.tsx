/**
 * app/terms/page.tsx
 *
 * Ruta pública: /terms
 * - Completamente independiente del estado auth
 * - Sin guards de login
 * - Preparada para futura web pública
 * - Renderiza TermsContent como página standalone
 */
import { TermsContent } from '../../legal/TermsAndConditions'

export const metadata = {
  title: 'Términos y Condiciones — Tranquilo',
  description: 'Condiciones de uso de Tranquilo. Sin letra chica.',
}

export default function TermsPage() {
  return <TermsContent showHeader={true} />
}
