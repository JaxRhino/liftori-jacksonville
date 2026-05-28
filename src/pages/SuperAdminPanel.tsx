import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowRight, Bell, Building2, CheckCircle, ChevronDown,
  ChevronRight, Cloud, Cpu, Database, Eye, FileText, Github, Globe, Hash, Inbox,
  Key, Loader2, MessageSquare, Plug, RefreshCw, Send, Settings as SettingsIcon,
  ShieldAlert, Sparkles, Timer, Trash2, Users, Wifi, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'

type Tab = 'overview' | 'demo' | 'users' | 'settings'

interface Counts {
  profiles: number; departments: number; requests: number; articles: number;
  channels: number; activity: number; messages: number; notifications: number;
}

interface TenantSettings {
  ai_intake_enabled: boolean
  citizens_can_self_register: boolean
  public_transparency_enabled: boolean
  default_citizen_language: 'en' | 'es'
  demo_mode: boolean
  banner_message: string | null
  updated_at: string
}

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  role: 'super_admin' | 'city_employee' | 'citizen'
  language: 'en' | 'es' | null
  department_id: string | null
  last_seen_at: string | null
  status: string | null
}

interface PresenceRow { id: string; live_status: 'online' | 'away' | 'offline' }

interface DeptRow { id: string; slug: string; name: string }

interface Toast { id: string; tone: 'success' | 'error' | 'info'; text: string }

export function SuperAdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const [counts, setCounts] = useState<Counts>({ profiles: 0, departments: 0, requests: 0, articles: 0, channels: 0, activity: 0, messages: 0, notifications: 0 })
  const [agents, setAgents] = useState({ total: 0, online: 0, away: 0 })
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [presence, setPresence] = useState<Record<string, PresenceRow['live_status']>>({})
  const [departments, setDepartments] = useState<DeptRow[]>([])
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastTimer = useRef<Record<string, number>>({})

  function pushToast(tone: Toast['tone'], text: string) {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, tone, text }])
    toastTimer.current[id] = window.setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id))
    }, 4500)
  }

  const load = useCallback(async () => {
    const [p, d, r, a, c, act, m, n, agR, profR, deptR, setR] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('departments').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_articles').select('*', { count: 'exact', head: true }),
      supabase.from('agent_chat_channels').select('*', { count: 'exact', head: true }),
      supabase.from('request_activity').select('*', { count: 'exact', head: true }),
      supabase.from('agent_chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('notifications').select('*', { count: 'exact', head: true }),
      supabase.from('agent_presence').select('id, live_status'),
      supabase.from('profiles')
        .select('id, email, full_name, display_name, role, language, department_id, last_seen_at, status')
        .order('role')
        .order('full_name'),
      supabase.from('departments').select('id, slug, name').order('name'),
      supabase.from('tenant_settings').select('*').limit(1).maybeSingle(),
    ])
    setCounts({
      profiles: p.count ?? 0, departments: d.count ?? 0, requests: r.count ?? 0,
      articles: a.count ?? 0, channels: c.count ?? 0, activity: act.count ?? 0,
      messages: m.count ?? 0, notifications: n.count ?? 0,
    })
    const rows = (agR.data as PresenceRow[]) ?? []
    setAgents({
      total: rows.length,
      online: rows.filter(x => x.live_status === 'online').length,
      away: rows.filter(x => x.live_status === 'away').length,
    })
    const presMap: Record<string, PresenceRow['live_status']> = {}
    rows.forEach(r => { presMap[r.id] = r.live_status })
    setPresence(presMap)
    setProfiles((profR.data as ProfileRow[]) ?? [])
    setDepartments((deptR.data as DeptRow[]) ?? [])
    setSettings((setR.data as TenantSettings) ?? null)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('service_requests', load)
  useRealtime('profiles', load)
  useRealtime('agent_presence', load)
  useRealtime('tenant_settings', load)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-red mb-1">Super Admin · Liftori Internal</div>
          <h1 className="text-2xl font-bold">Tenant control panel</h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
            City of Jacksonville tenant — run the demo, manage users, flip feature flags. Not visible to city users.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 transition">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-jax-gray-1 dark:border-jax-blue/20">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={Activity} label="Overview" />
        <TabBtn active={tab === 'demo'}     onClick={() => setTab('demo')}     icon={Sparkles} label="Demo controls" />
        <TabBtn active={tab === 'users'}    onClick={() => setTab('users')}    icon={Users}    label="Users" badge={String(profiles.length)} />
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={SettingsIcon} label="Settings" />
      </div>

      {tab === 'overview' && <Overview counts={counts} agents={agents} />}
      {tab === 'demo'     && <DemoControls profiles={profiles} departments={departments} onAction={pushToast} onReload={load} />}
      {tab === 'users'    && <UsersTab profiles={profiles} presence={presence} departments={departments} onAction={pushToast} onReload={load} />}
      {tab === 'settings' && <SettingsTab settings={settings} onAction={pushToast} onReload={load} />}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id}
            className={`px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-in slide-in-from-bottom ${
              t.tone === 'success' ? 'bg-jax-success text-white'
              : t.tone === 'error' ? 'bg-jax-danger text-white'
              : 'bg-jax-navy text-jax-light'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; badge?: string;
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition ${
        active ? 'border-jax-blue text-jax-blue' : 'border-transparent text-jax-gray-4 dark:text-jax-gray-2 hover:text-jax-blue'
      }`}>
      <Icon className="h-3.5 w-3.5" /> {label}
      {badge && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4">{badge}</span>}
    </button>
  )
}

/* ============================================================ OVERVIEW */

function Overview({ counts, agents }: { counts: Counts; agents: { total: number; online: number; away: number } }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <>
      <div className="rounded-lg p-5 mb-6 bg-gradient-to-br from-jax-success/15 via-jax-blue/15 to-jax-navy/15 border border-jax-success/40">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-jax-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <h2 className="font-bold text-lg flex items-center gap-2">
              Demo-ready
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-jax-success/20 text-jax-success">Live</span>
            </h2>
            <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2">
              Waves A through I shipped. <code className="font-mono text-xs">https://jax.liftori.ai</code> serving from Vercel,
              Supabase project <code className="font-mono text-xs">gnacmyygtmefgojwngpx</code> healthy,
              pg_cron keeping demo presence fresh every minute. EN/ES toggle live.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <CountCard icon={Users}         label="Profiles"      value={counts.profiles}      />
        <CountCard icon={Building2}     label="Departments"   value={counts.departments}   />
        <CountCard icon={Database}      label="Cases"         value={counts.requests}      />
        <CountCard icon={Activity}      label="Activity"      value={counts.activity}      />
        <CountCard icon={MessageSquare} label="Chat msgs"     value={counts.messages}      />
        <CountCard icon={Hash}          label="Channels"      value={counts.channels}      />
        <CountCard icon={Bell}          label="Notifications" value={counts.notifications} />
        <CountCard icon={FileText}      label="KB articles"   value={counts.articles}      />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Live agents" icon={Cpu}>
          <div className="grid grid-cols-3 text-center gap-1">
            <Stat color="text-jax-success" value={agents.online} label="Online" />
            <Stat color="text-jax-warn"    value={agents.away}   label="Away" />
            <Stat color="text-jax-gray-3"  value={agents.total - agents.online - agents.away} label="Offline" />
          </div>
          <div className="text-[10px] text-jax-gray-3 italic mt-2 text-center">pg_cron refreshes every minute</div>
        </Card>

        <Card title="Edge functions" icon={Plug}>
          <ul className="space-y-1.5 text-sm">
            <FnRow name="draft-reply" desc="Claude / template AI reply" />
            <FnRow name="intake-case" desc="Citizen narrative -> structured case" />
          </ul>
          <div className="text-[10px] text-jax-gray-3 italic mt-2">Claude when ANTHROPIC_API_KEY set; template fallback otherwise</div>
        </Card>

        <Card title="Infrastructure" icon={Cloud}>
          <ul className="space-y-2 text-sm">
            <InfraRow icon={Database} label="Supabase" value="liftori-jacksonville · us-east-1 · Pro" />
            <InfraRow icon={Globe}    label="Vercel"   value="liftori-jacksonville · team Rhino" />
            <InfraRow icon={Github}   label="GitHub"   value="JaxRhino/liftori-jacksonville" />
            <InfraRow icon={Timer}    label="pg_cron"  value="liftori-demo-presence-refresh · 1m" />
          </ul>
        </Card>

        <div className="lg:col-span-2 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
          <button onClick={() => setHistoryOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-jax-blue/5 transition">
            <div className="flex items-center gap-2">
              {historyOpen ? <ChevronDown className="h-4 w-4 text-jax-blue" /> : <ChevronRight className="h-4 w-4 text-jax-blue" />}
              <span className="font-semibold">Build history</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4">{WAVES.length} waves shipped</span>
            </div>
            <span className="text-[10px] text-jax-gray-3 italic">tap to {historyOpen ? 'collapse' : 'expand'}</span>
          </button>
          {historyOpen && (
            <ul className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
              {WAVES.map(w => (
                <li key={w.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-jax-success mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-jax-blue">{w.id}</span>
                        <span className="text-sm font-medium">{w.title}</span>
                      </div>
                      <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">{w.what}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card title="Surfaces" icon={Sparkles}>
          <ul className="space-y-1.5 text-sm">
            <QuickLink to="/work" icon={Activity} label="Agent desktop" />
            <QuickLink to="/work/chat" icon={MessageSquare} label="Team chat" />
            <QuickLink to="/work/cases" icon={Inbox} label="All cases" />
            <QuickLink to="/me" icon={Users} label="Citizen home" />
            <QuickLink to="/me/intake" icon={Zap} label="AI intake" />
            <QuickLink to="/transparency" icon={Eye} label="Public transparency" external />
          </ul>
        </Card>
      </div>
    </>
  )
}

/* ============================================================ DEMO CONTROLS */

const DEMO_CASE_RECIPES = [
  { subject: 'Pothole at Atlantic & 9A',       description: 'Deep pothole on Atlantic Blvd just east of I-295. Multiple drivers swerving.', priority: 'high',    department_slug: 'public-works' },
  { subject: 'Missed garbage pickup',          description: 'Solid Waste truck skipped my Thursday route. Cart still at the curb.',         priority: 'normal',  department_slug: 'solid-waste' },
  { subject: 'Stray dog near elementary school', description: 'Friendly stray dog has been around the school playground for 2 days.',         priority: 'normal',  department_slug: 'animal-care' },
  { subject: 'Tree limb across Edgewood Ave',  description: 'Large limb down blocking the right lane after last night storm.',            priority: 'urgent',  department_slug: 'public-works' },
  { subject: 'Code complaint: tall grass',     description: 'Vacant lot at Riverside & King with 4-foot weeds. Neighborhood eyesore.',       priority: 'low',     department_slug: 'code-compliance' },
  { subject: 'Hood inspection appt request',   description: 'Looking to schedule a NFPA 96 inspection for a new commercial kitchen.',        priority: 'normal',  department_slug: 'building-inspection' },
] as const

function DemoControls({
  profiles, departments, onAction, onReload,
}: { profiles: ProfileRow[]; departments: DeptRow[]; onAction: (tone: 'success' | 'error' | 'info', text: string) => void; onReload: () => void }) {
  const [recipeIdx, setRecipeIdx] = useState(0)
  const [citizenId, setCitizenId] = useState<string>('')
  const [deptSlug, setDeptSlug] = useState<string>(DEMO_CASE_RECIPES[0].department_slug)
  const [priority, setPriority] = useState<string>(DEMO_CASE_RECIPES[0].priority)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const citizens = useMemo(() => profiles.filter(p => p.role === 'citizen'), [profiles])
  const agents   = useMemo(() => profiles.filter(p => p.role === 'city_employee' || p.role === 'super_admin'), [profiles])

  function pickRecipe(i: number) {
    setRecipeIdx(i)
    setDeptSlug(DEMO_CASE_RECIPES[i].department_slug)
    setPriority(DEMO_CASE_RECIPES[i].priority)
  }

  async function fireCase() {
    const r = DEMO_CASE_RECIPES[recipeIdx]
    setBusy('case')
    try {
      const { data, error } = await supabase.rpc('liftori_seed_demo_case', {
        p_subject: r.subject,
        p_description: r.description,
        p_priority: priority,
        p_department_slug: deptSlug,
        p_citizen_id: citizenId || null,
      })
      if (error) throw error
      onAction('success', `Case fired (id ${(data as string).slice(0, 8)}) — check /work/cases`)
      onReload()
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Failed to fire case')
    } finally { setBusy(null) }
  }

  async function forceOnline() {
    setBusy('online')
    try {
      const { data, error } = await supabase.rpc('liftori_force_agents_online')
      if (error) throw error
      onAction('success', `Bumped ${data} agent presence row(s) to online`)
      onReload()
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Failed to force online')
    } finally { setBusy(null) }
  }

  async function resetActivity() {
    setBusy('reset')
    try {
      const { data, error } = await supabase.rpc('liftori_reset_demo_activity', { p_keep_users: true, p_keep_cases: true })
      if (error) throw error
      const d = data as { notifications_cleared: number; chat_cleared: number; activity_cleared: number }
      onAction('success', `Cleared ${d.activity_cleared} activity / ${d.chat_cleared} chat / ${d.notifications_cleared} notifications`)
      setConfirmingReset(false)
      onReload()
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Reset failed')
    } finally { setBusy(null) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Fire a demo citizen case" icon={Zap} accent="blue">
        <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-3">
          Inserts a service request as if a citizen just submitted it. Shows up in /work/cases in realtime — great for live walkthroughs.
        </p>
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">Recipe</label>
          <select value={recipeIdx} onChange={e => pickRecipe(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
            {DEMO_CASE_RECIPES.map((r, i) => <option key={i} value={i}>{r.subject}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">Citizen (optional, random if blank)</label>
              <select value={citizenId} onChange={e => setCitizenId(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
                <option value="">-- random --</option>
                {citizens.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">Department</label>
              <select value={deptSlug} onChange={e => setDeptSlug(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
                {departments.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(['low','normal','high','urgent','emergency'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md font-semibold transition ${
                  priority === p ? 'bg-jax-blue text-jax-light' : 'border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5'
                }`}>{p}</button>
            ))}
          </div>
        </div>
        <button onClick={fireCase} disabled={busy === 'case'}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-navy text-jax-light font-medium hover:bg-jax-blue transition disabled:opacity-50">
          {busy === 'case' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Fire case
        </button>
      </Card>

      <Card title="Force all agents online" icon={Wifi} accent="success">
        <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-3">
          Pre-demo prep: bumps every <code className="font-mono">last_seen_at</code> to now so the live counter and presence dots show green. pg_cron keeps them warm after.
        </p>
        <button onClick={forceOnline} disabled={busy === 'online'}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-success text-white font-medium hover:bg-jax-success/90 transition disabled:opacity-50">
          {busy === 'online' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
          Bump everyone to online
        </button>
      </Card>

      <Card title="Send test notification" icon={Bell} accent="blue">
        <SendTestNotification agents={agents} onAction={onAction} />
      </Card>

      <Card title="Reset demo activity" icon={Trash2} accent="danger">
        <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-3">
          Wipes notifications, chat messages, and request_activity logs. Keeps users + cases. Useful before a fresh walkthrough.
        </p>
        {confirmingReset ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 px-3 py-2 bg-jax-danger/10 border border-jax-danger/30 rounded text-jax-danger text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>This deletes activity rows, chat messages, and notifications. Cannot be undone. Confirm?</span>
            </div>
            <div className="flex gap-2">
              <button onClick={resetActivity} disabled={busy === 'reset'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-jax-danger text-white text-sm font-medium hover:bg-jax-danger/90 transition disabled:opacity-50">
                {busy === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Yes, wipe it
              </button>
              <button onClick={() => setConfirmingReset(false)}
                className="px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-blue/30 text-sm hover:bg-jax-blue/5 transition">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingReset(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-jax-danger/40 text-jax-danger text-sm font-medium hover:bg-jax-danger/10 transition">
            <Trash2 className="h-4 w-4" /> Reset activity / chat / notifications
          </button>
        )}
      </Card>
    </div>
  )
}

function SendTestNotification({ agents, onAction }: { agents: ProfileRow[]; onAction: (tone: 'success' | 'error' | 'info', text: string) => void }) {
  const [target, setTarget] = useState('')
  const [title, setTitle] = useState('Heads up from the control panel')
  const [body, setBody] = useState('Just a test ping.')
  const [busy, setBusy] = useState(false)
  async function send() {
    if (!target) { onAction('error', 'Pick a recipient first'); return }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('liftori_send_test_notification', { p_user_id: target, p_title: title, p_body: body, p_link: '/admin' })
      if (error) throw error
      onAction('success', `Sent. Recipient will see a bell badge.`)
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Send failed')
    } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      <select value={target} onChange={e => setTarget(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
        <option value="">-- pick recipient --</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email} ({a.role})</option>)}
      </select>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
        className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
      <textarea rows={2} value={body} onChange={e => setBody(e.target.value)} placeholder="Body"
        className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none resize-none" />
      <button onClick={send} disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-jax-navy text-jax-light text-sm font-medium hover:bg-jax-blue transition disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />} Send
      </button>
    </div>
  )
}

/* ============================================================ USERS */

function UsersTab({
  profiles, presence, departments, onAction, onReload,
}: {
  profiles: ProfileRow[]; presence: Record<string, PresenceRow['live_status']>; departments: DeptRow[];
  onAction: (tone: 'success' | 'error' | 'info', text: string) => void; onReload: () => void
}) {
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'city_employee' | 'citizen'>('all')

  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name || '—'

  const filtered = useMemo(() => {
    const lower = filter.toLowerCase().trim()
    return profiles.filter(p => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false
      if (lower && !(p.full_name || '').toLowerCase().includes(lower) && !p.email.toLowerCase().includes(lower)) return false
      return true
    })
  }, [profiles, filter, roleFilter])

  async function pingUser(p: ProfileRow) {
    const { error } = await supabase.rpc('liftori_send_test_notification', {
      p_user_id: p.id, p_title: 'Hi from admin', p_body: `Just verifying your notifications work, ${p.full_name?.split(' ')[0] || 'there'}.`, p_link: '/work',
    })
    if (error) onAction('error', error.message)
    else onAction('success', `Ping sent to ${p.full_name || p.email}`)
  }

  async function setLanguage(p: ProfileRow, lang: 'en' | 'es') {
    const { error } = await supabase.from('profiles').update({ language: lang }).eq('id', p.id)
    if (error) onAction('error', error.message)
    else { onAction('success', `${p.full_name || p.email} -> ${lang.toUpperCase()}`); onReload() }
  }

  return (
    <Card title={`Users · ${filtered.length} of ${profiles.length}`} icon={Users}>
      <div className="flex flex-wrap gap-2 mb-3">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name or email..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
        <div className="inline-flex rounded-md border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden">
          {(['all','super_admin','city_employee','citizen'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition ${
                roleFilter === r ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/5'
              }`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-jax-gray-3 border-y border-jax-gray-1 dark:border-jax-blue/20">
              <th className="px-3 py-2 w-7"></th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Language</th>
              <th className="px-3 py-2">Last seen</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
            {filtered.map(p => {
              const live = presence[p.id] ?? 'offline'
              const dot = live === 'online' ? 'bg-jax-success' : live === 'away' ? 'bg-jax-warn' : 'bg-jax-gray-3'
              return (
                <tr key={p.id} className="hover:bg-jax-blue/5 transition">
                  <td className="px-3 py-2"><span className={`inline-block h-2 w-2 rounded-full ${dot}`} title={live} /></td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.full_name || p.display_name || p.email}</div>
                    <div className="text-[11px] text-jax-gray-3 font-mono">{p.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      p.role === 'super_admin' ? 'bg-jax-red/15 text-jax-red'
                      : p.role === 'city_employee' ? 'bg-jax-blue/15 text-jax-blue'
                      : 'bg-jax-gray-2/40 text-jax-gray-4'
                    }`}>{p.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-3 py-2 text-jax-gray-4 dark:text-jax-gray-2 text-xs">{deptName(p.department_id)}</td>
                  <td className="px-3 py-2">
                    <div className="inline-flex rounded border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden">
                      {(['en','es'] as const).map(lng => (
                        <button key={lng} onClick={() => setLanguage(p, lng)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-semibold transition ${
                            (p.language ?? 'en') === lng ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/5'
                          }`}>{lng.toUpperCase()}</button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-jax-gray-3">
                    {p.last_seen_at ? new Date(p.last_seen_at).toLocaleString() : 'never'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => pingUser(p)}
                      title="Send test notification"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/10 transition">
                      <Bell className="h-3 w-3" /> Ping
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-jax-gray-3 text-xs italic">No users match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ============================================================ SETTINGS */

function SettingsTab({ settings, onAction, onReload }: { settings: TenantSettings | null; onAction: (tone: 'success' | 'error' | 'info', text: string) => void; onReload: () => void }) {
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(settings?.banner_message || '')

  useEffect(() => { setBanner(settings?.banner_message || '') }, [settings?.banner_message])

  async function flip(key: keyof TenantSettings, value: TenantSettings[keyof TenantSettings]) {
    setBusy(true)
    try {
      const { error } = await supabase.from('tenant_settings').update({ [key]: value }).eq('id', true)
      if (error) throw error
      onAction('success', `Updated ${key}`)
      onReload()
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Update failed')
    } finally { setBusy(false) }
  }

  async function saveBanner() {
    setBusy(true)
    try {
      const v = banner.trim() || null
      const { error } = await supabase.from('tenant_settings').update({ banner_message: v }).eq('id', true)
      if (error) throw error
      onAction('success', v ? 'Banner set' : 'Banner cleared')
      onReload()
    } catch (e) {
      onAction('error', e instanceof Error ? e.message : 'Save failed')
    } finally { setBusy(false) }
  }

  if (!settings) return <Card title="Settings" icon={SettingsIcon}><div className="text-sm text-jax-gray-3">Loading...</div></Card>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Feature flags" icon={SettingsIcon}>
        <ul className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
          <Toggle label="AI intake (/me/intake)" desc="Citizens can submit natural-language requests to the Claude / template intake function."
            value={settings.ai_intake_enabled} disabled={busy}
            onChange={v => flip('ai_intake_enabled', v)} />
          <Toggle label="Citizen self-registration" desc="Allow visitors to create their own /signup citizen accounts."
            value={settings.citizens_can_self_register} disabled={busy}
            onChange={v => flip('citizens_can_self_register', v)} />
          <Toggle label="Public transparency dashboard" desc="/transparency shows live case map + per-department stats. No login required."
            value={settings.public_transparency_enabled} disabled={busy}
            onChange={v => flip('public_transparency_enabled', v)} />
          <Toggle label="Demo mode" desc="Surfaces 'demo data only' badges, enables seeded narratives, shows the demo-control surface here."
            value={settings.demo_mode} disabled={busy}
            onChange={v => flip('demo_mode', v)} />
        </ul>
      </Card>

      <Card title="Defaults &amp; presentation" icon={Sparkles}>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">Default citizen language</div>
            <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-2">Brand-new citizen profiles start in this language. Per-user override still works via the EN/ES toggle.</p>
            <div className="inline-flex rounded-md border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden">
              {(['en','es'] as const).map(lng => (
                <button key={lng} disabled={busy} onClick={() => flip('default_citizen_language', lng)}
                  className={`px-4 py-1.5 text-xs font-medium font-mono uppercase transition ${
                    settings.default_citizen_language === lng ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/5'
                  } disabled:opacity-50`}>{lng}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">Tenant banner message</div>
            <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-2">Visible to all users at top of every page. Leave blank to hide. (Renderer ships in a later wave.)</p>
            <textarea rows={2} value={banner} onChange={e => setBanner(e.target.value)}
              placeholder="System maintenance window: Saturday 2-4am EST"
              className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none resize-none" />
            <button onClick={saveBanner} disabled={busy}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-jax-navy text-jax-light text-xs font-medium hover:bg-jax-blue transition disabled:opacity-50">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />} Save banner
            </button>
          </div>

          <div className="text-[10px] text-jax-gray-3 italic pt-2 border-t border-jax-gray-1 dark:border-jax-blue/15">
            Updated {settings.updated_at ? new Date(settings.updated_at).toLocaleString() : '—'}
          </div>
        </div>
      </Card>

      <Card title="Where things live" icon={ShieldAlert} accent="warn">
        <ul className="space-y-2 text-xs">
          <li className="flex items-start gap-2">
            <Database className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">tenant_settings</div>
              <div className="text-jax-gray-3">One row, super_admin RLS for writes, staff read.</div>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Plug className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">RPC: liftori_force_agents_online</div>
              <div className="text-jax-gray-3">SECURITY DEFINER, bumps agent_presence.last_seen_at.</div>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Plug className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">RPC: liftori_seed_demo_case</div>
              <div className="text-jax-gray-3">Inserts a citizen-style request. Auto-tags 'demo' + 'admin-seeded'.</div>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Plug className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">RPC: liftori_send_test_notification</div>
              <div className="text-jax-gray-3">Insert a notification row for any user.</div>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Plug className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">RPC: liftori_reset_demo_activity</div>
              <div className="text-jax-gray-3">Truncates notifications + chat + activity (keeps users + cases).</div>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  )
}

function Toggle({ label, desc, value, onChange, disabled }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <li className="py-3 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-jax-gray-3 mt-0.5">{desc}</div>
      </div>
      <button disabled={disabled} onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${
          value ? 'bg-jax-success' : 'bg-jax-gray-2 dark:bg-jax-navy'
        } disabled:opacity-50`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </li>
  )
}

/* ============================================================ shared bits */

function Card({ title, icon: Icon, children, accent }: {
  title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
  accent?: 'blue' | 'success' | 'danger' | 'warn'
}) {
  const accentClass = !accent ? 'border-jax-gray-1 dark:border-jax-blue/20'
    : accent === 'success' ? 'border-jax-success/40'
    : accent === 'danger'  ? 'border-jax-danger/40'
    : accent === 'warn'    ? 'border-jax-warn/40'
    : 'border-jax-blue/40'
  return (
    <div className={`bg-white dark:bg-jax-navy-deep/40 border rounded-lg p-5 ${accentClass}`}>
      <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-jax-blue" /> {title}</h3>
      {children}
    </div>
  )
}

function CountCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <Icon className="h-4 w-4 text-jax-blue mb-2" />
      <div className="text-[10px] uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{label}</div>
    </div>
  )
}

function FnRow({ name, desc }: { name: string; desc: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-jax-success animate-pulse shrink-0" />
      <code className="font-mono text-xs font-semibold">{name}</code>
      <span className="text-[11px] text-jax-gray-3 truncate">· {desc}</span>
    </li>
  )
}

function InfraRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{label}</div>
        <div className="text-xs font-medium truncate">{value}</div>
      </div>
    </li>
  )
}

function QuickLink({ to, icon: Icon, label, external }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; external?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-2 p-1.5 -mx-1.5 rounded hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition">
        <Icon className="h-3.5 w-3.5 text-jax-blue shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {external && <span className="text-[9px] uppercase tracking-wider text-jax-gray-3">public</span>}
        <ArrowRight className="h-3 w-3 text-jax-gray-3 shrink-0" />
      </Link>
    </li>
  )
}

interface WaveItem { id: string; title: string; what: string }
const WAVES: WaveItem[] = [
  { id: 'A',   title: 'Infrastructure + scaffold + jax.liftori.ai live', what: 'Supabase tenant + 33-table schema + React/Vite/Tailwind scaffold + Vercel + Cloudflare DNS.' },
  { id: 'B.1', title: 'Live data, queue, Realtime', what: '5 demo agents + 20 realistic cases seeded. Live stats. AI-prioritized top-6 queue. /work/cases with filters.' },
  { id: 'B.2', title: 'Case detail page', what: 'Split-pane workspace. Status / priority / assignee menus. Inline subject editing. Tabs panel.' },
  { id: 'B.3', title: 'Activity feed + presence', what: 'DB triggers auto-log changes. 30s heartbeat RPC. OnlineAgentsCard.' },
  { id: 'B.4', title: 'Cmd+K fuzzy search', what: 'Global keyboard shortcut. Fuzzy across cases + people + departments.' },
  { id: 'C.1', title: 'In-case team chat', what: 'Per-case channel. Real-time. @mentions. Presence dots.' },
  { id: 'C.2', title: 'Department chat /work/chat', what: 'Slack-style 3-column. Citywide + per-department channels.' },
  { id: 'C.3', title: 'Video huddle (Jitsi)', what: 'One-click Start huddle. Auto-posts join link to case chat.' },
  { id: 'C.4', title: 'AI draft replies', what: 'Draft with AI on Comments tab. Claude / template fallback.' },
  { id: 'C.5', title: 'Similar cases', what: 'find_similar_cases() composite scoring. Flags duplicates.' },
  { id: 'D.1', title: 'Citizen AI intake', what: 'Narrative -> structured case. Subject + dept + priority + tags.' },
  { id: 'D.2', title: 'Citizen home polish', what: 'Gradient hero. Live stats. Realtime my-requests. Neighborhood widget.' },
  { id: 'E.1', title: 'Per-case Leaflet + Esri map', what: 'CaseMap. Esri tiles. Priority-colored marker.' },
  { id: 'E.2', title: 'Public /transparency', what: 'No-auth. Live multi-marker map. Per-dept breakdown. Resolved feed.' },
  { id: 'F.1', title: 'Demo password reset', what: 'All demo accounts confirmed with Demo2026! / Citizen2026!.' },
  { id: 'F.2', title: 'Walkthrough docx', what: '8-beat 15-minute demo flow with credentials cheat sheet.' },
  { id: 'F.3', title: 'Dashboard polish + cron', what: 'Live activity feed. Top-queue bug fix. pg_cron 60s keepalive.' },
  { id: 'F.4', title: 'Tenant panel refresh', what: 'Wave history. Edge functions. Cron jobs. Infrastructure summary.' },
  { id: 'G.1', title: 'Workspace hub', what: 'Schema for events/notes/tasks/email/meetings. Nav + placeholders.' },
  { id: 'G.2', title: 'Calendar (functional)', what: 'Month/week/day. Click-to-create. Jitsi-launch from event.' },
  { id: 'G.3', title: 'Notes', what: 'Two-pane markdown editor. Pin / archive / tags. Realtime.' },
  { id: 'G.4', title: 'Tasks', what: 'Kanban + list. Drag-drop columns. Assignees.' },
  { id: 'G.5', title: 'Email (M365 OAuth setup)', what: 'Demo inbox. Azure setup walkthrough modal.' },
  { id: 'G.6', title: 'Video meetings + invites', what: 'Schedule + invite externals. Public token URL.' },
  { id: 'H.1', title: 'File attachments', what: 'Cases / notes / emails. Storage bucket + RLS.' },
  { id: 'H.2', title: 'Notifications bell', what: 'Realtime bell. DB triggers for case-assigned, mention, etc.' },
  { id: 'H.3', title: 'Spanish UI (i18n)', what: 'EN/ES toggle in header. 120-key dictionary. Browser detect + profile sync.' },
  { id: 'H.4', title: 'Knowledge base editor', what: '/work/knowledge. Public/internal toggle. Dept picker.' },
  { id: 'I',   title: 'Real tenant control panel', what: 'This screen. Tabs. Fire demo cases, force-online, send notifications, flip feature flags.' },
]
