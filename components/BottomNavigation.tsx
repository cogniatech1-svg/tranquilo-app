import { Icon, type IconName } from './ui/Icon'
import { DS } from '../lib/config'
import type { TabId } from '../lib/types'

const TABS: { id: TabId; icon: IconName; label: string }[] = [
  { id: 'inicio',      icon: 'home',   label: 'Inicio'      },
  { id: 'movimientos', icon: 'list',   label: 'Gastos'      },
  { id: 'presupuesto', icon: 'wallet', label: 'Presupuesto' },
  { id: 'insights',    icon: 'chart',  label: 'Insights'    },
  { id: 'perfil',      icon: 'user',   label: 'Perfil'      },
]

export function BottomNavigation({
  active,
  onChange,
}: {
  active: TabId
  onChange: (t: TabId) => void
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/96 backdrop-blur-md border-t border-slate-100 z-30"
      style={{ boxShadow: '0 -4px 24px rgba(15,23,42,.06)' }}
    >
      <div className="max-w-md mx-auto flex">
        {TABS.map(({ id, icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center pt-3 pb-4 gap-1 transition-all"
            >
              <div
                className={`p-2 rounded-xl transition-all duration-200 ${isActive ? '' : ''}`}
                style={
                  isActive
                    ? { background: DS.primaryGrad, boxShadow: '0 2px 8px rgba(15,118,110,.25)' }
                    : {}
                }
              >
                <Icon
                  name={icon}
                  size={20}
                  className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
              </div>
              <span
                className={`text-[10px] font-bold leading-none transition-colors ${
                  isActive ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
