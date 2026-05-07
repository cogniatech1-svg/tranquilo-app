'use client'

import { useOnlineStatus } from '../lib/useOnlineStatus'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 z-40">
      <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
      <span>⚠️ Sin conexión - Los datos se guardan localmente</span>
    </div>
  )
}
