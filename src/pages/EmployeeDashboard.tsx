import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle, Clock, Eye,
  Inbox, MapPin, MessageSquare, Search, Sparkles, Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { OnlineAgentsCard } from '../components/OnlineAgentsCard'
import { useCommandPalette } from '../components/CommandPalette'
import type { ServiceRequestRow, Department } from '../lib/types'
import { priorityTone, statusTone, relativeTime, slaState } from '../lib/types'

interface QueueStats { open: number; due_today: number; breached: number; resolved_today: number; agents_online: number }

interface RecentActivity {
  id: string
  request_id: string
  kind: string
  actor_name: string | null
  created_at: string
  case_subject?: string
  case_ticket?: string
}

export function EmployeeDashboard() {
  const { profile } = useAuth()
  const palette = useCommandPalette()
  const [stats, setStats] = useState<QueueStats>({ open: 0, due_today: 0, breached: 0, resolved_today: 0, agents_online: 0 })
  const [departments, setDepartments] = useState<Department[]>([])
  const [topQueue, setTopQueue] = useState<ServiceRequestRow[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadAll = useCallback(async () => {
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999)

    const [openR, dueR, breachR, resR, agentsR, deptsR, queueR, actR] = await Promise.all([
      supabase.from('service_requests').select('id', { count: 'exact', head: true }).in('status', ['new','triaged','assigned','in_progress']),
      supabase.from('service_requests').select('id', { count: 'exact', head: true }).in('status', ['new','triaged','assigned','in_progress']).lte('sla_due_at', endOfDay.toISOString()),
      supabase.from('service_requests').select('id', { count: 'exact', head: true }).in('status', ['new','triaged','assigned','in_progress']).lt('sla_due_at', new Date().toISOString()),
      supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status','resolved').gte('updated_at', startOfDay.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role','city_employee').eq('status','online'),
      supabase.from('departments').select('*').eq('is_active', true).order('sort_order'),
      // Top open queue: simple created_at order, client-side resort by priority+SLA
      supabase.from('service_requests')
        .select(`
          id, ticket_number, subject, status, priority, source, citizen_name,
          service_address, council_district, sla_due_at, created_at, updated_at, tags, ai_summary,
          department:departments(id, slug, name, color_hex, icon),
          assignee:profiles!service_requests_assigned_to_fkey(id, full_name, display_name, avatar_url, status),
          citizen:profiles!service_requests_citizen_id_fkey(id, full_name, display_name, email, phone)
        `)
        .in('status', ['new','triaged','assigned','in_progress'])
        .order('created_at', { ascending: false })
        .limit(20),
      // Recent activity across all cases
      supabase.from('request_activity')
        .select('id, request_id, kind, actor_name, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    setStats({
      open: openR.count ?? 0,
      due_today: dueR.count ?? 0,
      breached: breachR.count ?? 0,
      resolved_today: resR.count ?? 0,
      agents_online: agentsR.count ?? 0,
    })
    setDepartments(((deptsR.data as Department[]) ?? []))

    const weight: Record<string, number> = { emergency: 0, urgent: 1, high: 2, normal: 3, low: 4 }
    const sorted = ((queueR.data as unknown as ServiceRequestRow[]) ?? []).slice().sort((a, b) => {
      const aw = weight[a.priority]; const bw = weight[b.priority]
      if (aw !== bw) return aw - bw
      const ad = a.sla_due_at ? new Date(a.sla_due_at).getTime() : Infinity
      const bd = b.sla_due_at ? new Date(b.sla_due_at).getTime() : Infinity
      return ad - bd
    })
    setTopQueue(sorted.slice(0, 6))

    // Enrich activity with case subject + ticket
    const rawAct = ((actR.data as Array<{ id: string; request_id: string; kind: string; actor_name: string | null; created_at: string }>) ?? [])
    if (rawAct.length > 0) {
      const ids = Array.from(new Set(rawAct.map(x => x.request_id)))
      const { data: subs } = await supabase.from('service_requests').select('id, ticket_number, subject').in('id', ids)
      const lookup: Record<string, { ticket_number: string; subject: string }> = {}
      for (const s of ((subs as Array<{ id: string; ticket_number: string; subject: string }>) ?? [])) lookup[s.id] = s
      setRecentActivity(rawAct.map(a => ({ ...a, case_subject: lookup[a.request_id]?.subject, case_ticket: lookup[a.request_id]?.ticket_number })))
    } else {
      setRecentActivity([])
    }

    setLoading(false)
    setLastUpdated(new Date())
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useRealtime('service_requests', loadAll)
  useRealtime('profiles', loadAll)
  useRealtime('request_activity', loadAll)

  const displayName = profile?.display_name || profile?.full_name || profile?.email

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1">Agent Desktop</div>
          <h1 className="text-2xl font-bold">Welcome back, {displayName}.</h1>
          <div className="text-xs text-jax-gray-3 mt-1 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jax-success animate-pulse" />
            Live · updated {relativeTime(lastUpdated.toISOString())} · {stats.agents_online} agent{stats.agents_online === 1 ? '' : 's'} online
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/work/chat" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition">
            <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Team chat</span>
          </Link>
          <button onClick={palette.open} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition" title="Press Cmd+K (or Ctrl+K) to open">
            <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search any case</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] rounded bg-jax-gray-1 dark:bg-jax-navy-deep border border-jax-gray-2 dark:border-jax-blue/30">⌘K</kbd>
          </button>

        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Inbox}         label="Open cases"     value={stats.open}           tone="blue"    loading={loading} />
        <Stat icon={Clock}         label="Due today"      value={stats.due_today}      tone="warn"    loading={loading} />
        <Stat icon={AlertTriangle} label="SLA breached"   value={stats.breached}       tone="danger"  loading={loading} />
        <Stat icon={CheckCircle}   label="Resolved today" value={stats.resolved_today} tone="success" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-jax-blue" /> AI-prioritized queue</h3>
                <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2">Top {topQueue.length} of {stats.open} open cases, ranked by priority + SLA risk.</p>
              </div>
              <Link to="/work/cases" className="text-xs font-medium text-jax-blue hover:text-jax-sky flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-jax-gray-1 dark:divide-jax-blue/10">
              {loading && <div className="p-6 text-center text-sm text-jax-gray-3">Loading…</div>}
              {!loading && topQueue.length === 0 && (
                <div className="p-8 text-center text-sm text-jax-gray-4 dark:text-jax-gray-2">No open cases. The city is having a good day.</div>
              )}
              {topQueue.map(c => <QueueRow key={c.id} c={c} />)}
            </div>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-jax-blue" /> Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {departments.map(d => (
                <Link
                  key={d.id}
                  to={`/work/cases?dept=${d.slug}`}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-jax-blue/10 dark:hover:bg-jax-blue/20 transition text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color_hex }} />
                    {d.name}
                  </span>
                  <ArrowRight className="h-3 w-3 text-jax-gray-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — fresh post-Wave-F content */}
        <div className="space-y-6">
          <OnlineAgentsCard />

          {/* Live activity feed */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-jax-blue" /> Live activity</h3>
              <p className="text-[11px] text-jax-gray-3 mt-0.5">What's happening across the city right now.</p>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {recentActivity.length === 0 && (
                <div className="p-5 text-xs text-jax-gray-3 italic">No recent activity.</div>
              )}
              <ul className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
                {recentActivity.map(a => (
                  <li key={a.id} className="px-4 py-2.5">
                    <Link to={`/work/cases/${a.request_id}`} className="block hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 -mx-2 px-2 py-1 rounded transition">
                      <div className="text-xs">
                        <span className="font-medium">{a.actor_name || 'System'}</span>
                        <span className="text-jax-gray-3"> · {actionVerb(a.kind)}</span>
                      </div>
                      {a.case_subject && (
                        <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 truncate mt-0.5">
                          on <span className="font-medium">{a.case_subject}</span>
                          {a.case_ticket && <span className="ml-1 font-mono text-jax-gray-3">{a.case_ticket}</span>}
                        </div>
                      )}
                      <div className="text-[10px] text-jax-gray-3 mt-0.5">{relativeTime(a.created_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick links to other surfaces */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-jax-blue" /> Quick links</h3>
            <ul className="space-y-1.5 text-sm">
              <QuickLink to="/transparency" icon={Eye} label="Public transparency" sub="What citizens see — no login" external />
              <QuickLink to="/me" icon={Users} label="Citizen dashboard" sub="The portal residents use" />
              <QuickLink to="/me/intake" icon={Sparkles} label="AI intake demo" sub="Plain-English new request flow" />
              <QuickLink to="/work/chat" icon={MessageSquare} label="Team chat" sub="13 channels, real-time" />
              <QuickLink to="/admin" icon={Activity} label="Liftori control panel" sub="Internal tenant view" />
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function QueueRow({ c }: { c: ServiceRequestRow }) {
  const sla = slaState(c.sla_due_at)
  return (
    <Link to={`/work/cases/${c.id}`} className="block px-5 py-4 hover:bg-jax-light dark:hover:bg-jax-navy-deep/30 transition">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityTone(c.priority)}`}>{c.priority}</span>
            {sla === 'breached' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-jax-red text-white">SLA BREACHED</span>}
            {sla === 'soon' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-jax-warn text-white">DUE SOON</span>}
            <span className="font-mono text-xs text-jax-gray-3">{c.ticket_number}</span>
          </div>
          <div className="font-medium truncate">{c.subject}</div>
          {c.ai_summary && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5 line-clamp-1 italic">{c.ai_summary}</div>}
          <div className="flex items-center gap-3 text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-1.5">
            {c.department && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.department.color_hex }} />
                {c.department.name}
              </span>
            )}
            {c.assignee && <span>· {c.assignee.display_name || c.assignee.full_name}</span>}
            {!c.assignee && <span className="italic text-jax-warn">· Unassigned</span>}
            <span>· {relativeTime(c.created_at)}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 ${statusTone(c.status)}`}>{c.status.replace('_',' ')}</span>
      </div>
    </Link>
  )
}

function Stat({ icon: Icon, label, value, tone, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: 'blue' | 'warn' | 'danger' | 'success'; loading: boolean }) {
  const colors = { blue: 'text-jax-blue', warn: 'text-jax-warn', danger: 'text-jax-danger', success: 'text-jax-success' }
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${colors[tone]}`} /> {label}
      </div>
      <div className={`text-2xl font-bold ${colors[tone]}`}>
        {loading ? <span className="inline-block h-6 w-10 bg-jax-gray-1 dark:bg-jax-navy/60 rounded animate-pulse" /> : value}
      </div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, label, sub, external }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; sub: string; external?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-2 p-2 -mx-2 rounded hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition">
        <Icon className="h-4 w-4 text-jax-blue shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {label}
            {external && <span className="text-[9px] uppercase tracking-wider text-jax-gray-3 ml-1">public</span>}
          </div>
          <div className="text-[10px] text-jax-gray-3 truncate">{sub}</div>
        </div>
        <ArrowRight className="h-3 w-3 text-jax-gray-3 shrink-0" />
      </Link>
    </li>
  )
}

function actionVerb(kind: string): string {
  switch (kind) {
    case 'created':            return 'created a case'
    case 'status_changed':     return 'changed status'
    case 'priority_changed':   return 'changed priority'
    case 'assigned':           return 'assigned a case'
    case 'unassigned':         return 'unassigned a case'
    case 'department_changed': return 'routed a case'
    case 'commented':          return 'added a comment'
    case 'video_started':      return 'started a video huddle'
    case 'ai_suggested':       return 'received an AI suggestion'
    case 'ai_applied':         return 'applied an AI suggestion'
    default:                   return kind.replace('_', ' ')
  }
}
