import { useEffect, useState } from 'react'
import { Database, Users, Building2, BookOpen, Hash } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function SuperAdminPanel() {
  const [counts, setCounts] = useState({ profiles: 0, departments: 0, requests: 0, articles: 0, channels: 0 })

  useEffect(() => {
    ;(async () => {
      const [p, d, r, a, c] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('service_requests').select('*', { count: 'exact', head: true }),
        supabase.from('knowledge_articles').select('*', { count: 'exact', head: true }),
        supabase.from('agent_chat_channels').select('*', { count: 'exact', head: true }),
      ])
      setCounts({
        profiles: p.count ?? 0,
        departments: d.count ?? 0,
        requests: r.count ?? 0,
        articles: a.count ?? 0,
        channels: c.count ?? 0,
      })
    })()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-jax-red mb-1">Super Admin</div>
        <h1 className="text-2xl font-bold">Liftori tenant control panel</h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
          Internal Liftori view. Not visible to city users.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card icon={Users}     label="Profiles"     value={counts.profiles} />
        <Card icon={Building2} label="Departments"  value={counts.departments} />
        <Card icon={Database}  label="Cases"        value={counts.requests} />
        <Card icon={BookOpen}  label="KB articles"  value={counts.articles} />
        <Card icon={Hash}      label="Chat channels" value={counts.channels} />
      </div>

      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
        <h3 className="font-semibold mb-2">Wave status</h3>
        <ul className="space-y-2 text-sm">
          <Wave label="Wave A — Infrastructure + scaffold + jax.liftori.ai live" done />
          <Wave label="Wave B — AgentWeb-killer core (queue, search, real-time, activity)" />
          <Wave label="Wave C — Team chat, video, AI suggestions, semantic search" />
          <Wave label="Wave D — Citizen portal polish + AI chat intake" />
          <Wave label="Wave E — ArcGIS read from maps.coj.net + public transparency" />
          <Wave label="Wave F — Holli's login + seed data + walkthrough script" />
        </ul>
      </div>
    </div>
  )
}

function Card({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <Icon className="h-4 w-4 text-jax-blue mb-2" />
      <div className="text-xs uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function Wave({ label, done }: { label: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${done ? 'bg-jax-success' : 'bg-jax-gray-2'}`} />
      <span className={done ? 'text-jax-gray-4 dark:text-jax-gray-2' : ''}>{label}</span>
      {done && <span className="text-xs text-jax-success ml-auto font-semibold">✓ Done</span>}
    </li>
  )
}
