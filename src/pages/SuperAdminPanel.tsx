import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, Building2, CheckCircle, Cloud, Cpu, Database,
  Eye, FileText, Github, Globe, Hash, MessageSquare, Plug, Sparkles, Timer, Users, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'

export function SuperAdminPanel() {
  const [counts, setCounts] = useState({ profiles: 0, departments: 0, requests: 0, articles: 0, channels: 0, activity: 0, messages: 0 })
  const [agents, setAgents] = useState({ total: 0, online: 0, away: 0 })

  const load = useCallback(async () => {
    const [p, d, r, a, c, act, m, agentsR] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('departments').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_articles').select('*', { count: 'exact', head: true }),
      supabase.from('agent_chat_channels').select('*', { count: 'exact', head: true }),
      supabase.from('request_activity').select('*', { count: 'exact', head: true }),
      supabase.from('agent_chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('agent_presence').select('id, live_status'),
    ])
    setCounts({
      profiles: p.count ?? 0,
      departments: d.count ?? 0,
      requests: r.count ?? 0,
      articles: a.count ?? 0,
      channels: c.count ?? 0,
      activity: act.count ?? 0,
      messages: m.count ?? 0,
    })
    const rows = (agentsR.data as Array<{ id: string; live_status: string }>) ?? []
    setAgents({
      total: rows.length,
      online: rows.filter(a => a.live_status === 'online').length,
      away:   rows.filter(a => a.live_status === 'away').length,
    })
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('service_requests', load)
  useRealtime('profiles', load)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-jax-red mb-1">Super Admin · Liftori Internal</div>
        <h1 className="text-2xl font-bold">Tenant control panel</h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
          City of Jacksonville tenant — operational status, build history, edge surface.
          Not visible to city users.
        </p>
      </div>

      {/* Build status banner */}
      <div className="rounded-lg p-5 mb-6 bg-gradient-to-br from-jax-success/15 via-jax-blue/15 to-jax-navy/15 border border-jax-success/40">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-jax-success mt-0.5 shrink-0" />
          <div className="flex-1">
            <h2 className="font-bold text-lg flex items-center gap-2">
              Demo-ready
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-jax-success/20 text-jax-success">Live</span>
            </h2>
            <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2">
              All six waves shipped. <code className="font-mono text-xs">https://jax.liftori.ai</code> serving from Vercel,
              Supabase project <code className="font-mono text-xs">gnacmyygtmefgojwngpx</code> healthy, pg_cron keeping demo
              presence fresh every minute. Walk through the demo with confidence.
            </p>
          </div>
        </div>
      </div>

      {/* Big counts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <CountCard icon={Users}        label="Profiles"      value={counts.profiles}    />
        <CountCard icon={Building2}    label="Departments"   value={counts.departments} />
        <CountCard icon={Database}     label="Cases"         value={counts.requests}    />
        <CountCard icon={Activity}     label="Activity rows" value={counts.activity}    />
        <CountCard icon={MessageSquare} label="Chat msgs"     value={counts.messages}    />
        <CountCard icon={Hash}         label="Chat channels" value={counts.channels}    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: wave history (the meaty story) */}
        <div className="lg:col-span-2 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20">
            <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-jax-blue" /> Build history</h3>
            <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2">Every wave that shipped, in order.</p>
          </div>
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
                  <span className="text-[10px] text-jax-success font-semibold uppercase tracking-wider shrink-0">Done</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT: operational status + quick links */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Cpu className="h-4 w-4 text-jax-blue" /> Live agents</h3>
            <div className="grid grid-cols-3 text-center gap-1">
              <div>
                <div className="text-2xl font-bold text-jax-success">{agents.online}</div>
                <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-jax-warn">{agents.away}</div>
                <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">Away</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-jax-gray-3">{agents.total - agents.online - agents.away}</div>
                <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">Offline</div>
              </div>
            </div>
            <div className="text-[10px] text-jax-gray-3 italic mt-2 text-center">pg_cron refreshes every minute</div>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Plug className="h-4 w-4 text-jax-blue" /> Edge functions</h3>
            <ul className="space-y-1.5 text-sm">
              <FnRow name="draft-reply"  desc="AI citizen-facing reply drafting" />
              <FnRow name="intake-case"  desc="Citizen narrative -> structured case" />
            </ul>
            <div className="text-[10px] text-jax-gray-3 italic mt-2">Claude when ANTHROPIC_API_KEY set; template fallback otherwise</div>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Cloud className="h-4 w-4 text-jax-blue" /> Infrastructure</h3>
            <ul className="space-y-2 text-sm">
              <InfraRow icon={Database} label="Supabase" value="liftori-jacksonville · us-east-1 · Pro" />
              <InfraRow icon={Globe}    label="Vercel"   value="liftori-jacksonville · team Rhino" />
              <InfraRow icon={Github}   label="GitHub"   value="JaxRhino/liftori-jacksonville" />
              <InfraRow icon={Timer}    label="pg_cron"  value="liftori-demo-presence-refresh · 1m" />
            </ul>
          </div>

          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-jax-blue" /> Other surfaces</h3>
            <ul className="space-y-1.5 text-sm">
              <QuickLink to="/work" icon={Activity} label="Agent desktop" />
              <QuickLink to="/work/chat" icon={MessageSquare} label="Team chat" />
              <QuickLink to="/work/cases" icon={FileText} label="All cases" />
              <QuickLink to="/me" icon={Users} label="Citizen home" />
              <QuickLink to="/me/intake" icon={Zap} label="AI intake" />
              <QuickLink to="/transparency" icon={Eye} label="Public transparency" external />
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

interface WaveItem { id: string; title: string; what: string }
const WAVES: WaveItem[] = [
  { id: 'A',   title: 'Infrastructure + scaffold + jax.liftori.ai live',
    what: 'Supabase tenant + 33-table schema + React/Vite/Tailwind scaffold + Vercel + Cloudflare DNS. First commit + first deploy.' },
  { id: 'B.1', title: 'Live data, queue, Realtime',
    what: '5 demo agents + 20 realistic cases seeded. Live stats. AI-prioritized top-6 queue. /work/cases with filters. Realtime subscriptions.' },
  { id: 'B.2', title: 'Case detail page (AgentWeb killer)',
    what: 'Split-pane workspace. Status / priority / department / assignee menus. Inline subject editing. Citizen + location cards. Tabs panel.' },
  { id: 'B.3', title: 'Activity feed + agent presence',
    what: 'DB triggers auto-log every status/priority/assignment change. 30s heartbeat RPC. Visibility-tracked away. OnlineAgentsCard.' },
  { id: 'B.4', title: 'Cmd+K fuzzy search palette',
    what: 'Global keyboard shortcut. Fuzzy across cases + people + departments. Arrow keys + Enter navigable. Replaces AgentWeb Last Name match.' },
  { id: 'C.1', title: 'In-case team chat',
    what: 'Per-case channel auto-created. Real-time messages. @mentions. Presence dots. 14 demo messages on 4 cases.' },
  { id: 'C.2', title: 'Department chat page /work/chat',
    what: 'Slack-style 3-column layout. Citywide + per-department channels. Member panel. 17 seeded messages across 7 channels.' },
  { id: 'C.3', title: 'Video huddle (Jitsi embed)',
    what: 'One-click Start huddle from case header. Auto-posts join link to case chat. Floating modal with maximize/minimize/leave. Zero vendor signup.' },
  { id: 'C.4', title: 'AI draft replies',
    what: 'Draft with AI button on Comments tab. draft-reply edge function with Claude (when keyed) or template fallback. Logs ai_suggested activity.' },
  { id: 'C.5', title: 'Similar cases discovery',
    what: 'find_similar_cases() PL/pgSQL composite scoring (pg_trgm + tag overlap + dept + geo). Flags duplicates. Upgrades to embeddings later.' },
  { id: 'D.1', title: 'Citizen AI intake /me/intake',
    what: 'Plain-English narrative -> structured case via intake-case edge function. Subject + summary + dept + priority + tags. Inline editing.' },
  { id: 'D.2', title: 'Citizen home polish',
    what: 'Gradient hero. Live stats pills. Realtime my-requests list. Neighborhood activity widget. KB articles. Quick action tiles.' },
  { id: 'E.1', title: 'Per-case Leaflet + Esri map',
    what: 'CaseMap component. Esri World Street Map tiles (ArcGIS-served). Priority-colored marker. Open-in-maps fallback.' },
  { id: 'E.2', title: 'Public /transparency dashboard',
    what: 'No-auth public page. Live multi-marker map. Per-department breakdown. Recent resolved feed. Anon-safe Supabase views.' },
  { id: 'F.1', title: 'Demo password reset',
    what: 'All 10 demo accounts (5 agents + 4 citizens + 1 super_admin) confirmed with Demo2026! or Citizen2026! passwords.' },
  { id: 'F.2', title: 'Walkthrough script docx',
    what: '8-beat 15-minute demo flow, Q&A contingencies, closing asks, full credentials. In Liftori Ai/ folder.' },
  { id: 'F.3', title: 'Dashboard polish + presence keepalive',
    what: 'Live activity feed + Quick links on /work. Top-queue bug fixed. pg_cron job keeps demo agents fresh every 60s.' },
  { id: 'F.4', title: 'Tenant control panel refresh',
    what: 'This screen. Real wave history. Edge functions. Cron jobs. Live agent counts. Infrastructure summary.' },
]

function CountCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <Icon className="h-4 w-4 text-jax-blue mb-2" />
      <div className="text-[10px] uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
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
