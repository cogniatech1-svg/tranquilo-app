'use client'

const EMOJI_GROUPS = [
  { label: 'Hogar',           emojis: ['🏠', '🏡', '🛋️', '🪴', '🔧', '💡', '🚰', '🧹'] },
  { label: 'Comida',          emojis: ['🍔', '🍕', '🥗', '🛒', '🍽️', '☕', '🍱', '🧃'] },
  { label: 'Transporte',      emojis: ['🚗', '🚌', '✈️', '🚲', '⛽', '🏍️', '🚇', '🛵'] },
  { label: 'Salud',           emojis: ['🏥', '💊', '🩺', '🧴', '🦷', '🩹', '🧠'] },
  { label: 'Educación',       emojis: ['📚', '🎓', '📝', '✏️', '🖊️', '🔬', '🖥️'] },
  { label: 'Trabajo',         emojis: ['💼', '💻', '📊', '📱', '🖨️', '📋', '🔑'] },
  { label: 'Entretenimiento', emojis: ['🎬', '🎮', '🎵', '🎨', '🎭', '🎤', '🎧'] },
  { label: 'Moda',            emojis: ['👕', '👟', '👜', '💄', '👗', '🧢', '🕶️'] },
  { label: 'Mascotas',        emojis: ['🐾', '🐕', '🐈', '🐠', '🦜', '🐇'] },
  { label: 'Finanzas',        emojis: ['💰', '💳', '🏦', '📈', '💸', '🛡️', '🪙'] },
  { label: 'Familia',         emojis: ['👨‍👩‍👧', '👶', '🎁', '❤️', '🏫', '🧸'] },
  { label: 'Deporte',         emojis: ['💪', '🏃', '⚽', '🎾', '🏊', '🧘', '🚴'] },
  { label: 'Otros',           emojis: ['⭐', '🌟', '🎯', '🌈', '🔴', '🟡', '🟢', '💎'] },
]

interface Props {
  current: string
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ current, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl px-4 pt-5 pb-8 max-h-[70vh] overflow-y-auto"
        style={{ boxShadow: '0 -8px 40px rgba(15,23,42,.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">
          Elige un ícono
        </p>

        <div className="space-y-4">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { onSelect(emoji); onClose() }}
                    className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                      emoji === current
                        ? 'bg-teal-100 ring-2 ring-teal-400 scale-110'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
