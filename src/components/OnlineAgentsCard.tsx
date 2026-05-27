import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'

interface PresenceRow {
  id: string
  full_name: string | null
  display_name: string | null
  title: string | null
  live_status: 'online' | 'away' | 'offline'
  last_seen_at: string | null
}

function relTime(iso: string | null) {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000)        return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3_600_000)     return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000)    return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function OnlineAgentsCard() {
  const [agents, setAgents] = useState<PresenceRow[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('agent_presence')
      .select('id, full_name, display_name, title, live_status, last_seen_at')
      .order('live_status', { ascending: true })  // online < away < offline alphabetically? we re-sort below
    const rows = ((data as PresenceRow[]) ?? [])
    // Custom sort: online > away > offline, then by name
    const rank: Record<string, number> = { online: 0, away: 1, offline: 2 }
    rows.sort((a, b) => {
      const r = (rank[a.live_status] ?? 9) - (rank[b.live_status] ?? 9)
      if (r !== 0) return r
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
    setAgents(rows)
  }, [])

  useEffect(() => { load() }, [load])
  // Realtime updates trigger reload (the underlying view sees profile updates)
  useRealtime('profiles', load)

  // Also auto-refresh every 30s so stale "online" entries decay to "away"
  useEffect(() => {
    const i = window.setInterval(load, 30_000)
    return () => window.clearInterval(i)
  }, [load])

  const online = agents.filter(a => a.live_status === 'online').length
  const away   = agents.filter(a => a.live_status === 'away').length

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-jax-blue" /> Team
        </h3>
        <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2">
          <span className="text-jax-success font-semibold">{online} online</span>
          {away > 0 && <span className="text-jax-warn ml-2">· {away} away</span>}
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {agents.map(a => (
          <li key={a.id} className="flex items-center gap-2">
            <Dot status={a.live_status} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{a.display_name || a.full_name}</div>
              {a.title && <div className="text-[11px] text-jax-gray-3 truncate">{a.title}</div>}
            </div>
            <div className="text-[10px] text-jax-gray-3 shrink-0">
              {a.live_status === 'online' ? 'now' : relTime(a.last_seen_at)}
            </div>
          </li>
        ))}
        {agents.length === 0 && (
          <li className="text-xs italic text-jax-gray-3">No agents yet.</li>
        )}
      </ul>
    </div>
  )
}

function Dot({ status }: { status: 'online' | 'away' | 'offline' }) {
  const color = status === 'online' ? 'bg-jax-success'
              : status === 'away'   ? 'bg-jax-warn'
              :                       'bg-jax-gray-3'
  const pulse = status === 'online' ? 'animate-pulse' : ''
  return <span className={`h-2 w-2 rounded-full ${color} ${pulse} shrink-0`} />
}
