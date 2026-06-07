import { TermsContent } from '../../legal/TermsAndConditions'

export const metadata = {
  title: 'Términos y Condiciones — Tranquilo',
  description: 'Condiciones de uso de Tranquilo. Sin letra chica.',
}

export default function TermsPage() {
  return <TermsContent showHeader={true} />
}
