import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, CalendarDays, Check, CheckSquare, Circle,
  Clock, Filter, LayoutGrid, List, Loader2, Plus, Trash2, User, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'

type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'cancelled'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Task {
  id: string
  owner_id: string
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_at: string | null
  completed_at: string | null
  parent_id: string | null
  case_id: string | null
  tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

interface Profile { id: string; full_name: string; display_name: string | null; email: string }
interface CaseRef { id: string; ticket_number: string; subject: string }

type ViewMode = 'kanban' | 'list'
type Filter = 'all' | 'mine' | 'assigned' | 'today' | 'overdue' | 'blocked'

const STATUS_COLS: Array<{ id: TaskStatus; label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'todo',      label: 'To do',     tone: 'text-jax-blue',    icon: Circle },
  { id: 'doing',     label: 'In progress', tone: 'text-jax-warn',  icon: Clock },
  { id: 'blocked',   label: 'Blocked',   tone: 'text-jax-danger',  icon: AlertTriangle },
  { id: 'done',      label: 'Done',      tone: 'text-jax-success', icon: Check },
  { id: 'cancelled', label: 'Cancelled', tone: 'text-jax-gray-3',  icon: X },
]

const PRIO_TONE: Record<TaskPriority, string> = {
  urgent: 'bg-jax-red text-white',
  high:   'bg-jax-warn/20 text-jax-warn',
  normal: 'bg-jax-blue/15 text-jax-blue',
  low:    'bg-jax-gray-2/40 text-jax-gray-4',
}

export function TasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [cases, setCases] = useState<CaseRef[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('kanban')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const [t, p, c] = await Promise.all([
      supabase.from('tasks').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name, display_name, email').in('role',['city_employee','super_admin']).order('full_name'),
      supabase.from('service_requests').select('id, ticket_number, subject').order('created_at', { ascending: false }).limit(50),
    ])
    setTasks((t.data as Task[]) ?? [])
    setProfiles((p.data as Profile[]) ?? [])
    setCases((c.data as CaseRef[]) ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])
  useRealtime('tasks', load)

  const filtered = useMemo(() => {
    let out = tasks
    if (filter === 'mine')     out = out.filter(t => t.owner_id === profile?.id)
    if (filter === 'assigned') out = out.filter(t => t.assigned_to === profile?.id)
    if (filter === 'today') {
      const eod = new Date(); eod.setHours(23,59,59,999)
      out = out.filter(t => t.due_at && new Date(t.due_at).getTime() <= eod.getTime() && !['done','cancelled'].includes(t.status))
    }
    if (filter === 'overdue') {
      out = out.filter(t => t.due_at && new Date(t.due_at).getTime() < Date.now() && !['done','cancelled'].includes(t.status))
    }
    if (filter === 'blocked')  out = out.filter(t => t.status === 'blocked')
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) || t.tags.some(g => g.toLowerCase().includes(q)))
    }
    return out
  }, [tasks, filter, search, profile])

  async function moveTask(id: string, to: TaskStatus) {
    const patch: Record<string, unknown> = { status: to }
    if (to === 'done') patch.completed_at = new Date().toISOString()
    if (to !== 'done') patch.completed_at = null
    await supabase.from('tasks').update(patch).eq('id', id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Workspace
          </div>
          <h1 className="text-2xl font-bold">Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 overflow-hidden text-xs">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${view === 'kanban' ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/10'}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button onClick={() => setView('list')}   className={`px-3 py-1.5 inline-flex items-center gap-1 ${view === 'list'   ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/10'}`}>
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-jax-blue" />
        {(['all','mine','assigned','today','overdue','blocked'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
            filter === f ? 'bg-jax-blue text-jax-light' : 'border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10'
          }`}>
            {f === 'all' ? 'All' :
             f === 'mine' ? 'Owned by me' :
             f === 'assigned' ? 'Assigned to me' :
             f === 'today' ? 'Due today' :
             f === 'overdue' ? 'Overdue' :
             'Blocked'}
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="ml-auto px-3 py-1 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition w-48"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-jax-blue" /></div>
      ) : view === 'kanban' ? (
        <Kanban tasks={filtered} profiles={profiles} onMove={moveTask} onEdit={setEditing} />
      ) : (
        <ListView tasks={filtered} profiles={profiles} onEdit={setEditing} />
      )}

      {creating && profile && (
        <TaskModal
          mode="create"
          ownerId={profile.id}
          profiles={profiles}
          cases={cases}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load() }}
        />
      )}
      {editing && profile && (
        <TaskModal
          mode="edit"
          task={editing}
          ownerId={profile.id}
          profiles={profiles}
          cases={cases}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KANBAN
// ─────────────────────────────────────────────────────────────
function Kanban({ tasks, profiles, onMove, onEdit }: { tasks: Task[]; profiles: Profile[]; onMove: (id: string, to: TaskStatus) => void; onEdit: (t: Task) => void }) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDrop(e: React.DragEvent, to: TaskStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setDragOver(null)
    if (id) onMove(id, to)
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {STATUS_COLS.map(col => {
        const list = tasks.filter(t => t.status === col.id)
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(e, col.id)}
            className={`bg-white dark:bg-jax-navy-deep/40 border rounded-lg p-2 min-h-[400px] transition ${
              dragOver === col.id ? 'border-jax-blue ring-2 ring-jax-blue/30' : 'border-jax-gray-1 dark:border-jax-blue/20'
            }`}
          >
            <div className="px-2 py-1.5 mb-2 flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest ${col.tone}`}>
                <col.icon className="h-3 w-3" /> {col.label}
              </div>
              <span className="text-[10px] text-jax-gray-3 font-mono">{list.length}</span>
            </div>
            <div className="space-y-1.5">
              {list.length === 0 && (
                <div className="text-[10px] text-jax-gray-3 italic text-center py-4">empty</div>
              )}
              {list.map(t => (
                <TaskCard
                  key={t.id} t={t} profiles={profiles}
                  draggable onDragStart={(e) => onDragStart(e, t.id)} onClick={() => onEdit(t)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ t, profiles, draggable, onDragStart, onClick }: { t: Task; profiles: Profile[]; draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onClick?: () => void }) {
  const assignee = profiles.find(p => p.id === t.assigned_to)
  const isOverdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && !['done','cancelled'].includes(t.status)
  return (
    <button
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-md bg-jax-light/40 dark:bg-jax-navy-deep/70 border hover:border-jax-blue transition group ${
        isOverdue ? 'border-jax-red/40' : 'border-jax-gray-1/60 dark:border-jax-blue/15'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{t.title}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${PRIO_TONE[t.priority]}`}>{t.priority}</span>
            {t.due_at && (
              <span className={`text-[10px] inline-flex items-center gap-0.5 ${isOverdue ? 'text-jax-danger font-semibold' : 'text-jax-gray-3'}`}>
                <CalendarDays className="h-2.5 w-2.5" /> {fmtDue(t.due_at)}
              </span>
            )}
            {assignee && (
              <span className="text-[10px] inline-flex items-center gap-0.5 text-jax-gray-3">
                <User className="h-2.5 w-2.5" /> {assignee.display_name || assignee.full_name}
              </span>
            )}
          </div>
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {t.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] px-1 rounded bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4 dark:text-jax-gray-2">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function fmtDue(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0)   return `${Math.abs(diffDays)}d ago`
  if (diffDays < 7)   return `${diffDays}d`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────
function ListView({ tasks, profiles, onEdit }: { tasks: Task[]; profiles: Profile[]; onEdit: (t: Task) => void }) {
  const byPriority = useMemo(() => {
    const w: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
    return tasks.slice().sort((a,b) => {
      // Done + cancelled at bottom
      const aDone = ['done','cancelled'].includes(a.status) ? 1 : 0
      const bDone = ['done','cancelled'].includes(b.status) ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      const pw = w[a.priority] - w[b.priority]
      if (pw !== 0) return pw
      const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity
      const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity
      return ad - bd
    })
  }, [tasks])
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
      <ul className="divide-y divide-jax-gray-1/60 dark:divide-jax-blue/10">
        {byPriority.length === 0 && <li className="p-6 text-sm italic text-jax-gray-3 text-center">No tasks match.</li>}
        {byPriority.map(t => {
          const isDone = ['done','cancelled'].includes(t.status)
          const isOverdue = t.due_at && new Date(t.due_at).getTime() < Date.now() && !isDone
          const assignee = profiles.find(p => p.id === t.assigned_to)
          const col = STATUS_COLS.find(c => c.id === t.status)
          return (
            <li key={t.id}>
              <button onClick={() => onEdit(t)} className="w-full text-left px-4 py-2.5 hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition">
                <div className="flex items-center gap-3">
                  {col && <col.icon className={`h-4 w-4 shrink-0 ${col.tone}`} />}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isDone ? 'line-through text-jax-gray-3' : ''}`}>{t.title}</div>
                    <div className="flex items-center gap-3 text-xs text-jax-gray-3 mt-0.5">
                      {t.due_at && (
                        <span className={isOverdue ? 'text-jax-danger font-semibold' : ''}>
                          <CalendarDays className="inline h-3 w-3 mr-0.5" /> {fmtDue(t.due_at)}
                        </span>
                      )}
                      {assignee && <span><User className="inline h-3 w-3 mr-0.5" /> {assignee.display_name || assignee.full_name}</span>}
                      {t.tags.slice(0, 2).map(g => <span key={g} className="px-1 rounded bg-jax-gray-1 dark:bg-jax-navy text-[10px]">#{g}</span>)}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded shrink-0 ${PRIO_TONE[t.priority]}`}>{t.priority}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CREATE / EDIT MODAL
// ─────────────────────────────────────────────────────────────
function TaskModal({ mode, task, ownerId, profiles, cases, onClose, onSaved }: {
  mode: 'create' | 'edit'
  task?: Task
  ownerId: string
  profiles: Profile[]
  cases: CaseRef[]
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle]             = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus]           = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority]       = useState<TaskPriority>(task?.priority ?? 'normal')
  const [assignedTo, setAssignedTo]   = useState<string | null>(task?.assigned_to ?? ownerId)
  const [dueAt, setDueAt]             = useState(task?.due_at ? toLocalInput(new Date(task.due_at)) : '')
  const [tags, setTags]               = useState<string[]>(task?.tags ?? [])
  const [tagInput, setTagInput]       = useState('')
  const [caseId, setCaseId]           = useState<string | null>(task?.case_id ?? null)
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])
  useEffect(() => { function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])

  function addTag(t: string) {
    const clean = t.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-')
    if (!clean || tags.includes(clean)) return
    setTags([...tags, clean])
  }

  async function save() {
    if (!title.trim()) { setErr('Title required'); return }
    setSaving(true); setErr(null)
    const patch: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigned_to: assignedTo,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      tags,
      case_id: caseId,
    }
    if (status === 'done' && !task?.completed_at) patch.completed_at = new Date().toISOString()
    if (status !== 'done') patch.completed_at = null

    const { error } = mode === 'edit' && task
      ? await supabase.from('tasks').update(patch).eq('id', task.id)
      : await supabase.from('tasks').insert({ ...patch, owner_id: ownerId, sort_order: 100 })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  async function del() {
    if (!task || !confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 bg-jax-ink/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
          <h3 className="font-semibold">{mode === 'edit' ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose} aria-label="Close" className="text-jax-gray-3 hover:text-jax-blue"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 text-base font-semibold rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition" placeholder="What needs to happen?" />

          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition resize-none" placeholder="Details, links, context..." />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
                {STATUS_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Due date">
              <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink" />
            </Field>
            <Field label="Assignee">
              <select value={assignedTo ?? ''} onChange={e => setAssignedTo(e.target.value || null)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name || p.full_name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Link to case (optional)">
            <select value={caseId ?? ''} onChange={e => setCaseId(e.target.value || null)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
              <option value="">No case linked</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.ticket_number} — {c.subject.slice(0, 60)}</option>)}
            </select>
          </Field>

          <Field label="Tags">
            <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-jax-blue/15 text-jax-blue">
                  #{t}
                  <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-jax-danger">×</button>
                </span>
              ))}
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput('') }
                  if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(tags.slice(0,-1))
                }}
                placeholder="add tag…" className="flex-1 min-w-[80px] bg-transparent outline-none text-xs placeholder:text-jax-gray-3" />
            </div>
          </Field>

          {err && <div className="px-3 py-2 rounded-md bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-xs">{err}</div>}
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
          {mode === 'edit' ? (
            <button onClick={del} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-jax-danger hover:bg-jax-danger/10 rounded-md transition">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {mode === 'edit' ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">{label}</div>
      {children}
    </div>
  )
}

function toLocalInput(d: Date): string {
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}
