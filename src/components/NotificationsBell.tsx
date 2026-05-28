import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Bell, BellOff, CalendarClock, Check, FileText, MailOpen,
  MessageSquare, Sparkles, UserPlus, X, CheckCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime } from '../lib/types'

interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  actor_name: string | null
  kind: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export function NotificationsBell() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems((data as Notification[]) ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])
  useRealtime('notifications', load)

  // Click-outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unread = useMemo(() => items.filter(i => !i.read_at).length, [items])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null)
  }

  async function markAllRead() {
    if (!profile) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', profile.id).is('read_at', null)
  }

  async function clear(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
  }

  function open_and_nav(n: Notification) {
    if (!n.read_at) markRead(n.id)
    if (n.link) {
      setOpen(false)
      nav(n.link)
    }
  }

  if (!profile) return null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-md border border-jax-blue/40 hover:bg-jax-blue/20 transition"
        aria-label="Notifications"
        title={`${unread} unread`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-jax-red text-jax-light text-[10px] font-bold leading-[16px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden z-40">
          <div className="px-4 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-jax-blue" /> Notifications
              </div>
              <div className="text-[10px] text-jax-gray-3 mt-0.5">{unread > 0 ? `${unread} unread` : 'All caught up'}</div>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-jax-blue hover:text-jax-sky inline-flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && <div className="p-6 text-center text-xs text-jax-gray-3">Loading...</div>}
            {!loading && items.length === 0 && (
              <div className="p-8 text-center">
                <BellOff className="h-8 w-8 text-jax-gray-3 mx-auto mb-2" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-[11px] text-jax-gray-3 mt-1">When you're assigned cases, mentioned in chat, or get email, it'll show up here.</p>
              </div>
            )}
            <ul className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
              {items.map(n => (
                <NotificationRow key={n.id} n={n} onOpen={() => open_and_nav(n)} onMarkRead={() => markRead(n.id)} onClear={() => clear(n.id)} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationRow({ n, onOpen, onMarkRead, onClear }: { n: Notification; onOpen: () => void; onMarkRead: () => void; onClear: () => void }) {
  const Icon = iconFor(n.kind)
  const unread = !n.read_at
  return (
    <li className={`group ${unread ? 'bg-jax-blue/5 dark:bg-jax-blue/10' : ''}`}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button onClick={onOpen} className="flex-1 text-left flex items-start gap-2.5 min-w-0">
          <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${unread ? 'bg-jax-blue/15 text-jax-blue' : 'bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4'}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {unread && <span className="h-1.5 w-1.5 rounded-full bg-jax-blue shrink-0" />}
              <div className={`text-xs ${unread ? 'font-semibold' : 'text-jax-gray-4 dark:text-jax-gray-2'} truncate`}>
                {n.title}
              </div>
            </div>
            {n.body && <div className="text-[11px] text-jax-gray-3 line-clamp-2 mt-0.5">{n.body}</div>}
            <div className="text-[10px] text-jax-gray-3 mt-1">
              {n.actor_name && <>{n.actor_name} · </>}
              {relativeTime(n.created_at)}
            </div>
          </div>
        </button>
        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition">
          {unread && (
            <button onClick={onMarkRead} className="p-1 rounded hover:bg-jax-blue/15 transition" title="Mark read">
              <Check className="h-3 w-3 text-jax-blue" />
            </button>
          )}
          <button onClick={onClear} className="p-1 rounded hover:bg-jax-danger/10 transition" title="Dismiss">
            <X className="h-3 w-3 text-jax-gray-3" />
          </button>
        </div>
      </div>
    </li>
  )
}

function iconFor(kind: string): React.ComponentType<{ className?: string }> {
  switch (kind) {
    case 'case_assigned':   return UserPlus
    case 'case_priority':   return AlertTriangle
    case 'case_commented':  return MessageSquare
    case 'chat_mention':    return MessageSquare
    case 'email_received':  return MailOpen
    case 'task_assigned':   return FileText
    case 'meeting_invite':  return CalendarClock
    case 'ai_suggested':    return Sparkles
    default:                return Bell
  }
}
