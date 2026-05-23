/**
 * app/privacy/page.tsx
 *
 * Ruta pública: /privacy
 * - Completamente independiente del estado auth
 * - Sin guards de login
 * - Preparada para futura web pública
 * - Renderiza PrivacyPolicyContent como página standalone
 */
import { PrivacyPolicyContent } from '../../legal/PrivacyPolicy'

export const metadata = {
  title: 'Política de Privacidad — Tranquilo',
  description: 'Cómo Tranquilo cuida tu información financiera. Sin letra chica, sin legalese.',
}

export default function PrivacyPage() {
  return <PrivacyPolicyContent showHeader={true} />
}
