import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Bookmark, Check, ChevronDown,
  Clock, FileText, MapPin, MessageSquare, Phone, Send,
  Sparkles, Tag, User, AlertTriangle, Activity, Lock,
  Mail, Hash, Pencil, Loader2, Building2, Calendar, ShieldAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useRealtime } from '../lib/useRealtime'
import type { ServiceRequestRow, Department, Profile, RequestStatus, RequestPriority } from '../lib/types'
import { priorityTone, statusTone, relativeTime, slaState, STATUS_LABELS, PRIORITY_ORDER } from '../lib/types'

const STATUS_OPTIONS: RequestStatus[] = ['new','triaged','assigned','in_progress','on_hold','awaiting_citizen','resolved','closed']

interface RequestComment {
  id: string
  body: string
  visibility: 'public' | 'internal'
  author_name: string | null
  author_id: string | null
  created_at: string
}

interface RequestActivity {
  id: string
  kind: string
  actor_name: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

type TabKey = 'activity' | 'comments' | 'internal' | 'files'

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [c, setCase] = useState<ServiceRequestRow | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [agents, setAgents] = useState<Profile[]>([])
  const [comments, setComments] = useState<RequestComment[]>([])
  const [activity, setActivity] = useState<RequestActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('activity')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: caseRow }, dRes, aRes, cRes, actRes] = await Promise.all([
      supabase
        .from('service_requests')
        .select(`
          *,
          department:departments(id, slug, name, color_hex, icon),
          assignee:profiles!service_requests_assigned_to_fkey(id, full_name, display_name, avatar_url, status),
          citizen:profiles!service_requests_citizen_id_fkey(id, full_name, display_name, email, phone)
        `)
        .eq('id', id).maybeSingle(),
      supabase.from('departments').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('profiles').select('*').eq('role','city_employee').order('full_name'),
      supabase.from('request_comments').select('*').eq('request_id', id).order('created_at', { ascending: true }),
      supabase.from('request_activity').select('*').eq('request_id', id).order('created_at', { ascending: false }).limit(50),
    ])
    setCase((caseRow as unknown as ServiceRequestRow) ?? null)
    setDepartments(((dRes.data as Department[]) ?? []))
    setAgents(((aRes.data as Profile[]) ?? []))
    setComments(((cRes.data as RequestComment[]) ?? []))
    setActivity(((actRes.data as RequestActivity[]) ?? []))
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  useRealtime('service_requests', load, [id])
  useRealtime('request_comments', load, [id])
  useRealtime('request_activity', load, [id])

  async function logActivity(kind: string, detail: Record<string, unknown>) {
    if (!c || !profile) return
    await supabase.from('request_activity').insert({
      request_id: c.id,
      actor_id: profile.id,
      actor_name: profile.display_name || profile.full_name,
      kind,
      detail,
    })
  }

  async function updateStatus(next: RequestStatus) {
    if (!c) return
    setBusy('status')
    const prev = c.status
    const patch: Record<string, unknown> = { status: next }
    if (next === 'resolved' && !c.resolved_at) patch.resolved_at = new Date().toISOString()
    if (next === 'closed'   && !c.closed_at)   patch.closed_at   = new Date().toISOString()
    const { error } = await supabase.from('service_requests').update(patch).eq('id', c.id)
    if (!error) await logActivity('status_changed', { from: prev, to: next })
    setBusy(null)
  }

  async function updatePriority(next: RequestPriority) {
    if (!c) return
    setBusy('priority')
    const prev = c.priority
    const { error } = await supabase.from('service_requests').update({ priority: next }).eq('id', c.id)
    if (!error) await logActivity('priority_changed', { from: prev, to: next })
    setBusy(null)
  }

  async function updateAssignee(next: string | null) {
    if (!c) return
    setBusy('assignee')
    const prev = c.assigned_to
    const { error } = await supabase.from('service_requests').update({ assigned_to: next }).eq('id', c.id)
    if (!error) await logActivity(next ? 'assigned' : 'unassigned', { from: prev, to: next })
    setBusy(null)
  }

  async function updateDepartment(deptId: string) {
    if (!c) return
    setBusy('dept')
    const prev = c.department_id
    const { error } = await supabase.from('service_requests').update({ department_id: deptId }).eq('id', c.id)
    if (!error) await logActivity('department_changed', { from: prev, to: deptId })
    setBusy(null)
  }

  async function updateSubject(text: string) {
    if (!c) return
    if (text === c.subject) return
    setBusy('subject')
    await supabase.from('service_requests').update({ subject: text }).eq('id', c.id)
    setBusy(null)
  }

  async function postComment(body: string, visibility: 'public' | 'internal') {
    if (!c || !profile) return
    const { error } = await supabase.from('request_comments').insert({
      request_id: c.id,
      author_id: profile.id,
      author_name: profile.display_name || profile.full_name,
      body, visibility,
    })
    if (!error) await logActivity('commented', { visibility })
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-jax-blue" />
    </div>
  )
  if (!c) return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-center">
      <h2 className="text-xl font-bold mb-2">Case not found</h2>
      <Link to="/work/cases" className="text-jax-blue hover:underline">Back to all cases</Link>
    </div>
  )


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/work/cases" className="text-jax-gray-3 hover:text-jax-blue flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> All cases
        </Link>
        <span className="text-jax-gray-3">/</span>
        <span className="font-mono text-jax-gray-3">{c.ticket_number}</span>
      </div>

      {/* Case header */}
      <CaseHeader
        c={c}
        departments={departments}
        agents={agents}
        onStatus={updateStatus} onPriority={updatePriority}
        onAssignee={updateAssignee} onDepartment={updateDepartment}
        onSubject={updateSubject}
        busy={busy}
      />

      {/* Split-pane body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* LEFT — case info */}
        <div className="lg:col-span-2 space-y-4">
          <DescriptionCard c={c} />
          <CitizenCard c={c} />
          <LocationCard c={c} />
          <MetadataCard c={c} />
        </div>

        {/* RIGHT — activity / comments / internal / files */}
        <div className="lg:col-span-1">
          <TabsPanel
            tab={tab} setTab={setTab}
            c={c} comments={comments} activity={activity}
            onComment={postComment}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// CASE HEADER
// ─────────────────────────────────────────────────────────────────────
function CaseHeader({
  c, departments, agents,
  onStatus, onPriority, onAssignee, onDepartment, onSubject, busy,
}: {
  c: ServiceRequestRow
  departments: Department[]
  agents: Profile[]
  onStatus: (s: RequestStatus) => Promise<void>
  onPriority: (p: RequestPriority) => Promise<void>
  onAssignee: (id: string | null) => Promise<void>
  onDepartment: (id: string) => Promise<void>
  onSubject: (s: string) => Promise<void>
  busy: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(c.subject)
  const sla = slaState(c.sla_due_at)

  useEffect(() => { setSubject(c.subject) }, [c.subject])

  async function commit() {
    setEditing(false)
    if (subject.trim() && subject !== c.subject) await onSubject(subject.trim())
  }

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      {/* Pills row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusMenu value={c.status} onChange={onStatus} busy={busy === 'status'} />
        <PriorityMenu value={c.priority} onChange={onPriority} busy={busy === 'priority'} />
        {sla === 'breached' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-jax-red text-white">
            <AlertTriangle className="h-3 w-3" /> SLA breached
          </span>
        )}
        {sla === 'soon' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-jax-warn text-white">
            <Clock className="h-3 w-3" /> Due soon
          </span>
        )}
        <span className="text-xs text-jax-gray-3 ml-auto font-mono">{c.ticket_number}</span>
      </div>

      {/* Subject — inline editable */}
      {editing ? (
        <input
          autoFocus
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setSubject(c.subject); setEditing(false) }
          }}
          className="w-full text-2xl font-bold bg-transparent border-b-2 border-jax-blue outline-none pb-1"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="group text-left w-full">
          <h1 className="text-2xl font-bold inline">{c.subject}</h1>
          <Pencil className="inline h-4 w-4 text-jax-gray-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* AI summary */}
      {c.ai_summary && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-jax-blue/5 dark:bg-jax-blue/10 border border-jax-blue/20">
          <Sparkles className="h-4 w-4 text-jax-blue mt-0.5 shrink-0" />
          <div className="text-sm italic text-jax-gray-4 dark:text-jax-gray-2">{c.ai_summary}</div>
        </div>
      )}

      {/* Routing row */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DepartmentMenu value={c.department?.id ?? null} departments={departments} onChange={onDepartment} busy={busy === 'dept'} />
        <AssigneeMenu  value={c.assigned_to} agents={agents} onChange={onAssignee} busy={busy === 'assignee'} />
        <div className="flex items-center gap-2 text-sm text-jax-gray-4 dark:text-jax-gray-2 px-3 py-2.5 rounded-md border border-jax-gray-1 dark:border-jax-gray-4/40">
          <Calendar className="h-4 w-4 text-jax-blue" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">SLA due</div>
            <div className="text-xs font-medium truncate">
              {c.sla_due_at ? `${new Date(c.sla_due_at).toLocaleString()}` : 'No SLA'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusMenu({ value, onChange, busy }: { value: RequestStatus; onChange: (s: RequestStatus) => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('click', close); return () => document.removeEventListener('click', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded hover:opacity-80 transition ${statusTone(value)}`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
        {STATUS_LABELS[value]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-48 bg-white dark:bg-jax-navy-deep border border-jax-gray-2 dark:border-jax-blue/30 rounded-md shadow-lg py-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setOpen(false); if (s !== value) onChange(s) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-jax-blue/10 flex items-center justify-between"
            >
              <span className="capitalize">{STATUS_LABELS[s]}</span>
              {value === s && <Check className="h-3.5 w-3.5 text-jax-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityMenu({ value, onChange, busy }: { value: RequestPriority; onChange: (p: RequestPriority) => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('click', close); return () => document.removeEventListener('click', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded hover:opacity-80 transition ${priorityTone(value)}`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldAlert className="h-3 w-3" />}
        {value}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-40 bg-white dark:bg-jax-navy-deep border border-jax-gray-2 dark:border-jax-blue/30 rounded-md shadow-lg py-1">
          {PRIORITY_ORDER.map(p => (
            <button
              key={p}
              onClick={() => { setOpen(false); if (p !== value) onChange(p) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-jax-blue/10 flex items-center justify-between capitalize"
            >
              <span>{p}</span>
              {value === p && <Check className="h-3.5 w-3.5 text-jax-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DepartmentMenu({ value, departments, onChange, busy }: { value: string | null; departments: Department[]; onChange: (id: string) => void; busy: boolean }) {
  const current = departments.find(d => d.id === value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('click', close); return () => document.removeEventListener('click', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className="w-full inline-flex items-center gap-2 text-sm px-3 py-2.5 rounded-md border border-jax-gray-1 dark:border-jax-gray-4/40 hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition"
      >
        <Building2 className="h-4 w-4 text-jax-blue" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">Department</div>
          <div className="text-xs font-medium truncate flex items-center gap-1.5">
            {current ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: current.color_hex }} />
                {current.name}
              </>
            ) : 'Unassigned'}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-jax-gray-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-80 overflow-y-auto bg-white dark:bg-jax-navy-deep border border-jax-gray-2 dark:border-jax-blue/30 rounded-md shadow-lg py-1">
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => { setOpen(false); if (d.id !== value) onChange(d.id) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-jax-blue/10 flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: d.color_hex }} />
              <span className="flex-1 truncate">{d.name}</span>
              {value === d.id && <Check className="h-3.5 w-3.5 text-jax-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AssigneeMenu({ value, agents, onChange, busy }: { value: string | null; agents: Profile[]; onChange: (id: string | null) => void; busy: boolean }) {
  const current = agents.find(a => a.id === value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('click', close); return () => document.removeEventListener('click', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className="w-full inline-flex items-center gap-2 text-sm px-3 py-2.5 rounded-md border border-jax-gray-1 dark:border-jax-gray-4/40 hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition"
      >
        <User className="h-4 w-4 text-jax-blue" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">Assigned to</div>
          <div className="text-xs font-medium truncate flex items-center gap-1.5">
            {current ? (
              <>
                <PresenceDot status={current.status || 'offline'} />
                {current.display_name || current.full_name}
              </>
            ) : <span className="italic text-jax-warn">Unassigned</span>}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-jax-gray-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-80 overflow-y-auto bg-white dark:bg-jax-navy-deep border border-jax-gray-2 dark:border-jax-blue/30 rounded-md shadow-lg py-1">
          <button
            onClick={() => { setOpen(false); onChange(null) }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-jax-blue/10 italic text-jax-warn"
          >
            Unassign
          </button>
          <div className="h-px bg-jax-gray-1 dark:bg-jax-blue/20 my-1" />
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => { setOpen(false); if (a.id !== value) onChange(a.id) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-jax-blue/10 flex items-center gap-2"
            >
              <PresenceDot status={a.status || 'offline'} />
              <span className="flex-1 truncate">{a.display_name || a.full_name}{a.title ? <span className="text-jax-gray-3"> · {a.title}</span> : null}</span>
              {value === a.id && <Check className="h-3.5 w-3.5 text-jax-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PresenceDot({ status }: { status: string }) {
  const color = status === 'online' ? 'bg-jax-success' : status === 'away' ? 'bg-jax-warn' : 'bg-jax-gray-3'
  return <span className={`h-1.5 w-1.5 rounded-full ${color} ${status === 'online' ? 'animate-pulse' : ''}`} />
}

// ─────────────────────────────────────────────────────────────────────
// LEFT-COLUMN CARDS
// ─────────────────────────────────────────────────────────────────────
function DescriptionCard({ c }: { c: ServiceRequestRow }) {
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-jax-blue" /> Description
      </h3>
      {c.description ? (
        <p className="text-sm leading-relaxed text-jax-gray-4 dark:text-jax-gray-2 whitespace-pre-wrap">{c.description}</p>
      ) : (
        <p className="text-sm italic text-jax-gray-3">No description provided.</p>
      )}
      {c.tags && c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {c.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4 dark:text-jax-gray-2">
              <Tag className="h-3 w-3" /> {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-jax-gray-1 dark:border-jax-blue/20 grid grid-cols-2 gap-3 text-xs">
        <Field label="Source" value={c.source ? c.source.replace('_',' ') : '—'} icon={Bookmark} />
        <Field label="Created" value={`${relativeTime(c.created_at)}`} icon={Clock} />
      </div>
    </div>
  )
}

function CitizenCard({ c }: { c: ServiceRequestRow }) {
  const cit = c.citizen
  const name = cit?.full_name || c.citizen_name || 'Anonymous citizen'
  const email = cit?.email || c.citizen_email
  const phone = cit?.phone || c.citizen_phone
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <User className="h-4 w-4 text-jax-blue" /> Citizen
      </h3>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-jax-blue/15 text-jax-blue flex items-center justify-center text-sm font-bold uppercase shrink-0">
          {name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="space-y-1 mt-1.5 text-xs">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-jax-blue hover:underline truncate">
                <Mail className="h-3 w-3 shrink-0" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-jax-blue hover:underline">
                <Phone className="h-3 w-3 shrink-0" /> {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationCard({ c }: { c: ServiceRequestRow }) {
  if (!c.service_address && !c.lat && !c.council_district) return null
  const mapUrl = c.lat && c.lng
    ? `https://www.google.com/maps?q=${c.lat},${c.lng}`
    : c.service_address ? `https://www.google.com/maps?q=${encodeURIComponent(c.service_address + ' Jacksonville FL')}` : null
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-jax-blue" /> Location
      </h3>
      {c.service_address && (
        <div className="text-sm mb-2">{c.service_address}{c.apt_unit ? ` ${c.apt_unit}` : ''}</div>
      )}
      {c.landmark && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 italic mb-3">Near {c.landmark}</div>}
      <div className="grid grid-cols-3 gap-3 text-xs">
        {c.council_district && <Field label="Council" value={`District ${c.council_district}`} icon={Hash} />}
        {c.evac_zone && <Field label="Evac" value={c.evac_zone} icon={ShieldAlert} />}
        {c.re_number && <Field label="RE #" value={c.re_number} icon={Hash} />}
      </div>
      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1 text-xs text-jax-blue hover:underline">
          Open in maps <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
      {/* ArcGIS embed placeholder for Wave E */}
      <div className="mt-3 h-32 rounded bg-gradient-to-br from-jax-blue/10 to-jax-navy/10 dark:from-jax-blue/20 dark:to-jax-navy/30 border border-dashed border-jax-blue/30 flex items-center justify-center text-xs text-jax-gray-3 italic">
        ArcGIS feature layer embed — Wave E
      </div>
    </div>
  )
}

function MetadataCard({ c }: { c: ServiceRequestRow }) {
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-jax-blue" /> Timeline & metadata
      </h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Field label="Created"     value={new Date(c.created_at).toLocaleString()} icon={Clock} />
        <Field label="Updated"     value={new Date(c.updated_at).toLocaleString()} icon={Clock} />
        {c.appointment_at  && <Field label="Appointment" value={new Date(c.appointment_at).toLocaleString()} icon={Calendar} />}
        {c.est_completion_at && <Field label="ETA" value={new Date(c.est_completion_at).toLocaleString()} icon={Calendar} />}
        {c.resolved_at     && <Field label="Resolved" value={new Date(c.resolved_at).toLocaleString()} icon={Check} />}
        {c.closed_at       && <Field label="Closed" value={new Date(c.closed_at).toLocaleString()} icon={Check} />}
      </div>
    </div>
  )
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// RIGHT-COLUMN TABS PANEL
// ─────────────────────────────────────────────────────────────────────
function TabsPanel({
  tab, setTab, c, comments, activity, onComment,
}: {
  tab: TabKey; setTab: (t: TabKey) => void
  c: ServiceRequestRow
  comments: RequestComment[]; activity: RequestActivity[]
  onComment: (body: string, visibility: 'public' | 'internal') => Promise<void>
}) {
  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count: number }> = [
    { key: 'activity', label: 'Activity', icon: Activity,      count: activity.length },
    { key: 'comments', label: 'Comments', icon: MessageSquare, count: comments.filter(c => c.visibility === 'public').length },
    { key: 'internal', label: 'Internal', icon: Lock,          count: comments.filter(c => c.visibility === 'internal').length },
    { key: 'files',    label: 'Files',    icon: FileText,      count: 0 },
  ]

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden flex flex-col h-[640px]">
      <div className="flex border-b border-jax-gray-1 dark:border-jax-blue/20">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              tab === t.key
                ? 'bg-jax-blue/10 text-jax-blue border-b-2 border-jax-blue'
                : 'hover:bg-jax-blue/5 text-jax-gray-4 dark:text-jax-gray-2'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            {t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4 dark:text-jax-gray-2">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'activity' && <ActivityList activity={activity} />}
        {tab === 'comments' && <CommentList comments={comments.filter(co => co.visibility === 'public')} empty="No public comments yet. Reply to the citizen below." />}
        {tab === 'internal' && <CommentList comments={comments.filter(co => co.visibility === 'internal')} empty="No internal notes yet. Add staff-only context below." />}
        {tab === 'files'    && <FilesPlaceholder />}
      </div>

      {(tab === 'comments' || tab === 'internal') && (
        <ComposeBox
          key={tab}
          placeholder={tab === 'comments' ? `Reply to ${c.citizen?.display_name || 'the citizen'}…` : 'Internal note (staff only)…'}
          onSubmit={(body) => onComment(body, tab === 'comments' ? 'public' : 'internal')}
          tone={tab === 'comments' ? 'public' : 'internal'}
        />
      )}
    </div>
  )
}

function ActivityList({ activity }: { activity: RequestActivity[] }) {
  if (activity.length === 0) return (
    <div className="text-sm italic text-jax-gray-3 text-center py-12">
      No activity recorded yet. Status changes, comments, and assignments will appear here in real time.
    </div>
  )
  return (
    <ul className="space-y-3">
      {activity.map(a => (
        <li key={a.id} className="flex items-start gap-2 text-sm">
          <span className="h-1.5 w-1.5 mt-2 rounded-full bg-jax-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-jax-gray-4 dark:text-jax-gray-2">
              <span className="font-medium">{a.actor_name || 'System'}</span>
              {' '}
              <span className="text-jax-gray-3">{activityVerb(a.kind, a.detail)}</span>
            </div>
            <div className="text-[11px] text-jax-gray-3 mt-0.5">{relativeTime(a.created_at)}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function activityVerb(kind: string, detail: Record<string, unknown> | null): string {
  switch (kind) {
    case 'created':            return 'created the case'
    case 'status_changed':     return `changed status from ${String(detail?.from)} to ${String(detail?.to)}`
    case 'priority_changed':   return `changed priority from ${String(detail?.from)} to ${String(detail?.to)}`
    case 'assigned':           return 'assigned the case'
    case 'unassigned':         return 'unassigned the case'
    case 'department_changed': return 'routed the case to a different department'
    case 'commented':          return `added a ${detail?.visibility === 'internal' ? 'private note' : 'public reply'}`
    case 'video_started':      return 'started a video huddle'
    case 'ai_suggested':       return 'received an AI suggestion'
    default:                   return kind.replace('_', ' ')
  }
}

function CommentList({ comments, empty }: { comments: RequestComment[]; empty: string }) {
  if (comments.length === 0) return <div className="text-sm italic text-jax-gray-3 text-center py-12">{empty}</div>
  return (
    <ul className="space-y-3">
      {comments.map(c => (
        <li key={c.id} className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-full bg-jax-blue/15 text-jax-blue flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
            {(c.author_name || '?').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs">
              <span className="font-medium">{c.author_name || 'Unknown'}</span>
              <span className="text-jax-gray-3 ml-2">{relativeTime(c.created_at)}</span>
              {c.visibility === 'internal' && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-jax-warn/15 text-jax-warn text-[10px] uppercase tracking-wider font-semibold">Internal</span>
              )}
            </div>
            <div className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">{c.body}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ComposeBox({ placeholder, onSubmit, tone }: { placeholder: string; onSubmit: (body: string) => Promise<void>; tone: 'public' | 'internal' }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  async function send() {
    if (!text.trim() || sending) return
    setSending(true); await onSubmit(text.trim()); setText(''); setSending(false)
  }
  return (
    <div className={`border-t border-jax-gray-1 dark:border-jax-blue/20 p-3 ${tone === 'internal' ? 'bg-jax-warn/5' : ''}`}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm bg-transparent resize-none outline-none placeholder:text-jax-gray-3"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] text-jax-gray-3">
          {tone === 'internal' ? 'Staff-only · not visible to citizen' : 'Public · visible in citizen portal'}
          <span className="ml-2">⌘+Enter to send</span>
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send
        </button>
      </div>
    </div>
  )
}

function FilesPlaceholder() {
  return (
    <div className="text-center py-12">
      <FileText className="h-10 w-10 text-jax-gray-3 mx-auto mb-2" />
      <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2">Attachments arrive in Wave C.</p>
      <p className="text-xs text-jax-gray-3 mt-1 italic">Photo uploads from citizens · field-crew evidence · permit docs.</p>
    </div>
  )
}
