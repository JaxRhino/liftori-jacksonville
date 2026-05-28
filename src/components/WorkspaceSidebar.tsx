import { NavLink } from 'react-router-dom'
import {
  Activity, BookOpen, Calendar, CheckSquare, Inbox, Mail, MessageSquare,
  StickyNote, Video,
} from 'lucide-react'
import { useT, type StringKey } from '../lib/i18n'

interface NavItem {
  to: string
  labelKey: StringKey
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/work',          labelKey: 'nav.dashboard',  icon: Activity,       end: true },
  { to: '/work/cases',    labelKey: 'nav.cases',      icon: Inbox },
  { to: '/work/chat',     labelKey: 'nav.teamChat',   icon: MessageSquare },
  { to: '/work/calendar', labelKey: 'nav.calendar',   icon: Calendar },
  { to: '/work/notes',    labelKey: 'nav.notes',      icon: StickyNote },
  { to: '/work/tasks',    labelKey: 'nav.tasks',      icon: CheckSquare },
  { to: '/work/email',    labelKey: 'nav.email',      icon: Mail },
  { to: '/work/meet',     labelKey: 'nav.meet',       icon: Video },
  { to: '/work/knowledge', labelKey: 'nav.knowledge', icon: BookOpen },
]

export function WorkspaceSidebar() {
  const t = useT()
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white dark:bg-jax-navy-deep/40 border-r border-jax-gray-1 dark:border-jax-blue/20 sticky top-16 h-[calc(100vh-64px)]">
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                isActive
                  ? 'bg-jax-blue/15 text-jax-blue font-medium'
                  : 'hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 text-jax-gray-4 dark:text-jax-gray-2'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{t(item.labelKey)}</span>
            {item.badge && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-warn/15 text-jax-warn shrink-0">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
        <div className="text-[10px] uppercase tracking-widest text-jax-gray-3">{t('nav.workspace')}</div>
        <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
          {t('nav.workspaceCaption')}
        </div>
      </div>
    </aside>
  )
}
