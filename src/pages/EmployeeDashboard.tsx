import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Bell, CheckCircle, Clock, Inbox, MessageSquare, Search, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface QueueStats {
  open: number
  due_today: number
  breached: number
  resolved_today: number
}

interface Department {
  id: string
  slug: string
  name: string
  color_hex: string
}

export function EmployeeDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<QueueStats>({ open: 0, due_today: 0, breached: 0, resolved_today: 0 })
  const [departments, setDepartments] = useState<Department[]>([])
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; kind: string; created_at: string }>>([])

  useEffect(() => {
    ;(async () => {
      const { data: depts } = await supabase.from('departments').select('id, slug, name, color_hex').eq('is_active', true).order('sort_order')
      setDepartments((depts as Department[]) ?? [])

      const { count: open } = await supabase.from('service_requests').select('*', { count: 'exact', head: true }).in('status', ['new', 'triaged', 'assigned', 'in_progress'])
      const { count: resolved } = await supabase.from('service_requests').select('*', { count: 'exact', head: true }).gte('resolved_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      setStats(s => ({ ...s, open: open ?? 0, resolved_today: resolved ?? 0 }))

      const { data: act } = await supabase.from('request_activity').select('id, kind, created_at').order('created_at', { ascending: false }).limit(8)
      setRecentActivity((act as Array<{ id: string; kind: string; created_at: string }>) ?? [])
    })()
  }, [])

  const displayName = profile?.display_name || profile?.full_name || profile?.email

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1">Agent Desktop</div>
          <h1 className="text-2xl font-bold">Welcome back, {displayName}.</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition">
            <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search any case</span>
          </button>
          <button className="relative p-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-jax-red" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Inbox}        label="Open cases"        value={stats.open}            tone="blue" />
        <Stat icon={Clock}        label="Due today"         value={stats.due_today}       tone="warn" />
        <Stat icon={AlertTriangle} label="SLA breached"     value={stats.breached}        tone="danger" />
        <Stat icon={CheckCircle}  label="Resolved today"    value={stats.resolved_today}  tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-jax-blue" /> AI-prioritized queue</h3>
              <span className="text-xs text-jax-gray-4 dark:text-jax-gray-2">Sorted by SLA risk + impact</span>
            </div>
            <div className="text-sm text-jax-gray-4 dark:text-jax-gray-2 italic">
              No cases in your queue yet. <span className="text-jax-blue">Wave B</span> adds the smart-queue dashboard with one-line AI summaries and one-click triage — replacing AgentWeb's 14-field manual entry.
            </div>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-jax-blue" /> Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {departments.map(d => (
                <button key={d.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-jax-blue/10 dark:hover:bg-jax-blue/20 transition text-left text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color_hex }} />
                    {d.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-jax-blue" /> Team chat</h3>
            <div className="text-sm text-jax-gray-4 dark:text-jax-gray-2 italic">
              <span className="text-jax-blue">Wave C</span> lights up real-time team chat per department and per case — the chat Oracle AgentWeb doesn't have.
            </div>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-jax-blue" /> Recent activity</h3>
            {recentActivity.length === 0
              ? <div className="text-sm text-jax-gray-4 dark:text-jax-gray-2 italic">No activity yet.</div>
              : (
                <ul className="space-y-2 text-sm">
                  {recentActivity.map(a => (
                    <li key={a.id} className="flex items-center gap-2 text-jax-gray-4 dark:text-jax-gray-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-jax-blue" />
                      <span className="capitalize">{a.kind.replace('_',' ')}</span>
                      <span className="text-xs text-jax-gray-3 ml-auto">{new Date(a.created_at).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: 'blue' | 'warn' | 'danger' | 'success' }) {
  const colors = {
    blue:    'text-jax-blue',
    warn:    'text-jax-warn',
    danger:  'text-jax-danger',
    success: 'text-jax-success',
  }
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${colors[tone]}`} /> {label}
      </div>
      <div className={`text-2xl font-bold ${colors[tone]}`}>{value}</div>
    </div>
  )
}
