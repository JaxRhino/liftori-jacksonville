import { NavLink } from 'react-router-dom'
import {
  Activity, Calendar, CheckSquare, Inbox, Mail, MessageSquare,
  StickyNote, Video,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/work',          label: 'Dashboard',  icon: Activity,       end: true },
  { to: '/work/cases',    label: 'Cases',      icon: Inbox },
  { to: '/work/chat',     label: 'Team chat',  icon: MessageSquare },
  { to: '/work/calendar', label: 'Calendar',   icon: Calendar,    badge: 'G.2' },
  { to: '/work/notes',    label: 'Notes',      icon: StickyNote,  badge: 'G.3' },
  { to: '/work/tasks',    label: 'Tasks',      icon: CheckSquare, badge: 'G.4' },
  { to: '/work/email',    label: 'Email',      icon: Mail,        badge: 'G.5' },
  { to: '/work/meet',     label: 'Meet',       icon: Video,       badge: 'G.6' },
]

export function WorkspaceSidebar() {
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
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-warn/15 text-jax-warn shrink-0">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
        <div className="text-[10px] uppercase tracking-widest text-jax-gray-3">Workspace</div>
        <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
          One stop for everything you do. Click any item with a G.x badge to see what's shipping next.
        </div>
      </div>
    </aside>
  )
}
