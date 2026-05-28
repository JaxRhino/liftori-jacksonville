import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, ExternalLink,
  Loader2, MapPin, Palette, Plus, Trash2, Users, Video, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'
import { useLanguage } from '../../lib/i18n'
import {
  addDays, addMonths, defaultMeetingRoom, endOfWeek, formatDayOfMonth,
  formatMonthYear, formatTime, formatTimeRange, formatWeekday, fromDatetimeLocal,
  isSameDay, isSameMonth, monthGrid, startOfDay, startOfWeek,
  toDatetimeLocal, weekGrid,
} from '../../lib/calendar'
import { VideoHuddleModal } from '../../components/VideoHuddleModal'

interface CalEvent {
  id: string
  owner_id: string
  title: string
  description: string | null
  location: string | null
  meeting_url: string | null
  start_at: string
  end_at: string
  all_day: boolean | null
  color_hex: string | null
  attendees: Array<{ id?: string; name?: string; email?: string }> | null
  case_id: string | null
}

interface CaseLite { id: string; ticket_number: string; subject: string }

interface ProfileLite { id: string; full_name: string | null; display_name: string | null; email: string }

type View = 'month' | 'week' | 'day'

const COLOR_PRESETS: Array<{ label: string; hex: string; tone: string }> = [
  { label: 'CSR / Internal',  hex: '#0B2D55', tone: 'navy' },
  { label: 'Ops review',      hex: '#1E5BC6', tone: 'blue' },
  { label: 'Inspection',      hex: '#B91C1C', tone: 'red' },
  { label: 'Training',        hex: '#D4A437', tone: 'gold' },
  { label: 'Case follow-up',  hex: '#7E22CE', tone: 'violet' },
  { label: 'Field / animal',  hex: '#7C2D12', tone: 'amber' },
  { label: 'Holiday / off',   hex: '#047857', tone: 'emerald' },
]

const VIEW_OPTIONS: Array<{ value: View; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week',  label: 'Week' },
  { value: 'day',   label: 'Day' },
]

export function CalendarPage() {
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const locale = lang === 'es' ? 'es-US' : undefined

  const [reference, setReference] = useState(() => startOfDay(new Date()))
  const [view, setView] = useState<View>('month')
  const [events, setEvents] = useState<CalEvent[]>([])
  const [cases, setCases] = useState<CaseLite[]>([])
  const [agents, setAgents] = useState<ProfileLite[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [joining, setJoining] = useState<CalEvent | null>(null)

  const range = useMemo(() => {
    if (view === 'month') {
      const grid = monthGrid(reference)
      return { from: grid[0], to: grid[41] }
    }
    if (view === 'week') {
      return { from: startOfWeek(reference), to: endOfWeek(reference) }
    }
    return { from: startOfDay(reference), to: addDays(startOfDay(reference), 1) }
  }, [reference, view])

  const load = useCallback(async () => {
    if (!user) return
    const fromIso = range.from.toISOString()
    const toIso = range.to.toISOString()
    const [evR, csR, agR] = await Promise.all([
      supabase.from('calendar_events')
        .select('id, owner_id, title, description, location, meeting_url, start_at, end_at, all_day, color_hex, attendees, case_id')
        .gte('start_at', fromIso)
        .lte('start_at', toIso)
        .order('start_at', { ascending: true }),
      supabase.from('service_requests')
        .select('id, ticket_number, subject')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles')
        .select('id, full_name, display_name, email')
        .eq('role', 'city_employee')
        .order('full_name'),
    ])
    setEvents((evR.data as CalEvent[]) ?? [])
    setCases((csR.data as CaseLite[]) ?? [])
    setAgents((agR.data as ProfileLite[]) ?? [])
    setLoading(false)
  }, [user, range.from, range.to])

  useEffect(() => { load() }, [load])
  useRealtime('calendar_events', load)

  function shift(delta: number) {
    if (view === 'month') setReference(addMonths(reference, delta))
    else if (view === 'week') setReference(addDays(reference, 7 * delta))
    else setReference(addDays(reference, delta))
  }
  function today() { setReference(startOfDay(new Date())) }

  function openNew(day?: Date) {
    const base = day ?? new Date()
    const start = new Date(base); start.setHours(9, 0, 0, 0)
    const end = new Date(base); end.setHours(10, 0, 0, 0)
    setEditing({
      mode: 'new',
      data: {
        id: '', owner_id: user?.id ?? '', title: '', description: '', location: '',
        meeting_url: '', start_at: start.toISOString(), end_at: end.toISOString(),
        all_day: false, color_hex: COLOR_PRESETS[0].hex, attendees: [], case_id: null,
      },
    })
  }

  const headerLabel = useMemo(() => {
    if (view === 'month') return formatMonthYear(reference, locale)
    if (view === 'week') {
      const wk = weekGrid(reference)
      const a = wk[0], b = wk[6]
      const same = a.getMonth() === b.getMonth()
      const aFmt = a.toLocaleString(locale, { month: 'short', day: 'numeric' })
      const bFmt = same
        ? b.toLocaleString(locale, { day: 'numeric', year: 'numeric' })
        : b.toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
      return `${aFmt} - ${bFmt}`
    }
    return reference.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }, [view, reference, locale])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-64px)]">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/work" className="inline-flex items-center gap-1 text-xs text-jax-blue hover:text-jax-sky mb-1">
            <ChevronLeft className="h-3 w-3" /> Back to agent desktop
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-jax-blue" /> Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky transition">
            <Plus className="h-3.5 w-3.5" /> New event
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="p-1.5 rounded hover:bg-jax-blue/10 transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={today} className="px-3 py-1 text-xs font-medium rounded-md border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 transition">
            Today
          </button>
          <button onClick={() => shift(1)} className="p-1.5 rounded hover:bg-jax-blue/10 transition">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-3 text-lg font-semibold">{headerLabel}</h2>
        </div>

        <div className="inline-flex rounded-md border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === v.value
                  ? 'bg-jax-blue text-jax-light'
                  : 'hover:bg-jax-blue/10 text-jax-gray-4 dark:text-jax-gray-2'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-jax-gray-1 dark:border-jax-blue/20 bg-white dark:bg-jax-navy-deep/40 overflow-hidden">
        {loading
          ? <div className="h-full flex items-center justify-center text-jax-gray-3"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : view === 'month' ? <MonthView reference={reference} events={events} locale={locale} onNew={openNew} onOpen={(e) => setEditing({ mode: 'edit', data: e })} />
          : view === 'week'  ? <WeekView  reference={reference} events={events} locale={locale} onNew={openNew} onOpen={(e) => setEditing({ mode: 'edit', data: e })} />
          : <DayView day={reference} events={events} locale={locale} onNew={openNew} onOpen={(e) => setEditing({ mode: 'edit', data: e })} onJoin={(e) => setJoining(e)} />
        }
      </div>

      {editing && (
        <EventEditor
          state={editing}
          cases={cases}
          agents={agents}

          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          onJoin={(e) => { setEditing(null); setJoining(e) }}
        />
      )}

      {joining && (
        <VideoHuddleModal
          room={extractJitsiRoom(joining.meeting_url) || defaultMeetingRoom(joining.id)}
          displayName={profile?.display_name || profile?.full_name || profile?.email || 'Guest'}
          subject={joining.title}
          onLeave={() => setJoining(null)}
        />
      )}
    </div>
  )
}

/* ---------- views ------------------------------------------------------- */

function MonthView({
  reference, events, locale, onNew, onOpen,
}: { reference: Date; events: CalEvent[]; locale?: string; onNew: (d: Date) => void; onOpen: (e: CalEvent) => void }) {
  const grid = monthGrid(reference)
  const today = new Date()

  const dayHeaders = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => formatWeekday(addDays(startOfWeek(reference), i), locale, true))
  , [reference, locale])

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-jax-gray-1 dark:border-jax-blue/20 bg-jax-light/40 dark:bg-jax-navy-deep/60">
        {dayHeaders.map(h => (
          <div key={h} className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-jax-gray-3">{h}</div>
        ))}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-jax-gray-1 dark:divide-jax-blue/15 overflow-auto">
        {grid.map(d => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.start_at), d))
          const inMonth = isSameMonth(d, reference)
          const isToday = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={`relative min-h-[90px] p-1 group cursor-pointer transition ${
                inMonth ? 'bg-white dark:bg-transparent' : 'bg-jax-light/30 dark:bg-jax-ink/40 text-jax-gray-3'
              } hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10`}
              onClick={() => onNew(d)}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-medium ${isToday ? 'h-5 w-5 inline-flex items-center justify-center rounded-full bg-jax-blue text-jax-light font-bold' : ''}`}>
                  {formatDayOfMonth(d)}
                </span>
                <Plus className="h-3 w-3 text-jax-gray-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(e => (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onOpen(e) }}
                    className="block w-full text-left truncate text-[10px] px-1.5 py-0.5 rounded text-white"
                    style={{ background: e.color_hex || '#1E5BC6' }}
                    title={`${e.title} - ${formatTime(new Date(e.start_at), locale)}`}
                  >
                    {!e.all_day && <span className="font-mono mr-1">{formatTime(new Date(e.start_at), locale)}</span>}
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-jax-gray-3 italic px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  reference, events, locale, onNew, onOpen,
}: { reference: Date; events: CalEvent[]; locale?: string; onNew: (d: Date) => void; onOpen: (e: CalEvent) => void }) {
  const days = weekGrid(reference)
  const today = new Date()
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-jax-gray-1 dark:border-jax-blue/20 bg-jax-light/40 dark:bg-jax-navy-deep/60">
        {days.map(d => {
          const isToday = isSameDay(d, today)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onNew(d)}
              className="text-left px-2 py-2 hover:bg-jax-blue/5 transition border-r border-jax-gray-1 dark:border-jax-blue/15 last:border-r-0"
            >
              <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{formatWeekday(d, locale, true)}</div>
              <div className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-jax-blue' : ''}`}>{formatDayOfMonth(d)}</div>
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-jax-gray-1 dark:divide-jax-blue/15 overflow-auto">
        {days.map(d => {
          const dayEv = events.filter(e => isSameDay(new Date(e.start_at), d)).sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
          return (
            <div key={d.toISOString()} className="p-2 space-y-1.5 min-h-full hover:bg-jax-blue/5 cursor-pointer transition" onClick={() => onNew(d)}>
              {dayEv.length === 0 && <div className="text-[10px] italic text-jax-gray-3">No events</div>}
              {dayEv.map(e => (
                <button
                  key={e.id}
                  onClick={(ev) => { ev.stopPropagation(); onOpen(e) }}
                  className="block w-full text-left rounded-md p-2 text-[11px] text-white shadow-sm hover:shadow-md transition"
                  style={{ background: e.color_hex || '#1E5BC6' }}
                >
                  {!e.all_day && (
                    <div className="font-mono text-[10px] opacity-90 mb-0.5">{formatTimeRange(new Date(e.start_at), new Date(e.end_at), false, locale)}</div>
                  )}
                  <div className="font-medium leading-snug">{e.title}</div>
                  {e.location && <div className="mt-0.5 text-[10px] opacity-85 truncate">{e.location}</div>}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({
  day, events, locale, onNew, onOpen, onJoin,
}: { day: Date; events: CalEvent[]; locale?: string; onNew: (d: Date) => void; onOpen: (e: CalEvent) => void; onJoin: (e: CalEvent) => void }) {
  const dayEv = events.filter(e => isSameDay(new Date(e.start_at), day)).sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-jax-gray-4 dark:text-jax-gray-2">
          {dayEv.length} {dayEv.length === 1 ? 'event' : 'events'}
        </h3>
        <button onClick={() => onNew(day)}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {dayEv.length === 0 ? (
        <div className="text-center py-16 text-jax-gray-3">
          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nothing scheduled. Click to add.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEv.map(e => (
            <div
              key={e.id}
              className="rounded-lg border border-jax-gray-1 dark:border-jax-blue/20 bg-white dark:bg-jax-navy-deep/30 overflow-hidden hover:border-jax-blue/60 transition"
            >
              <div className="flex">
                <span className="w-1.5 shrink-0" style={{ background: e.color_hex || '#1E5BC6' }} />
                <div className="flex-1 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <button onClick={() => onOpen(e)} className="text-left">
                        <div className="font-semibold">{e.title}</div>
                        <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatTimeRange(new Date(e.start_at), new Date(e.end_at), !!e.all_day, locale)}
                          {e.location && (<> <MapPin className="inline h-3 w-3 ml-2 mr-1" /> {e.location}</>)}
                        </div>
                        {e.description && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-1 line-clamp-2">{e.description}</div>}
                      </button>
                    </div>
                    {(e.meeting_url || e.case_id) && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {e.meeting_url && (
                          <button onClick={() => onJoin(e)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-jax-success text-white hover:bg-jax-success/90">
                            <Video className="h-3 w-3" /> Join
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- editor modal ------------------------------------------------ */

interface EditState { mode: 'new' | 'edit'; data: CalEvent }

function EventEditor({
  state, cases, agents, onClose, onSaved, onJoin,
}: {
  state: EditState
  cases: CaseLite[]
  agents: ProfileLite[]
  
  onClose: () => void
  onSaved: () => void
  onJoin: (e: CalEvent) => void
}) {
  const [form, setForm] = useState<CalEvent>(state.data)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch<K extends keyof CalEvent>(k: K, v: CalEvent[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (new Date(form.end_at) <= new Date(form.start_at)) { setError('End time must be after start.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        location: form.location?.trim() || null,
        meeting_url: form.meeting_url?.trim() || null,
        start_at: form.start_at,
        end_at: form.end_at,
        all_day: !!form.all_day,
        color_hex: form.color_hex,
        attendees: form.attendees,
        case_id: form.case_id,
      }
      if (state.mode === 'new') {
        const { error } = await supabase.from('calendar_events').insert({ ...payload, owner_id: form.owner_id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('calendar_events').update(payload).eq('id', form.id)
        if (error) throw error
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this event?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', form.id)
      if (error) throw error
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function toggleAttendee(a: ProfileLite) {
    const list = form.attendees ?? []
    const idx = list.findIndex(x => x.id === a.id)
    if (idx >= 0) {
      const next = list.slice(); next.splice(idx, 1); patch('attendees', next)
    } else {
      patch('attendees', [...list, { id: a.id, name: a.full_name || a.email, email: a.email }])
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20 sticky top-0 bg-white dark:bg-jax-navy-deep z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-jax-blue" />
            {state.mode === 'new' ? 'New event' : 'Edit event'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-jax-blue/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">Title</span>
            <input
              autoFocus
              value={form.title}
              onChange={e => patch('title', e.target.value)}
              placeholder="What's this event?"
              className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">Start</span>
              <input
                type="datetime-local"
                value={toDatetimeLocal(new Date(form.start_at))}
                onChange={e => patch('start_at', fromDatetimeLocal(e.target.value).toISOString())}
                className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">End</span>
              <input
                type="datetime-local"
                value={toDatetimeLocal(new Date(form.end_at))}
                onChange={e => patch('end_at', fromDatetimeLocal(e.target.value).toISOString())}
                className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.all_day} onChange={e => patch('all_day', e.target.checked)} />
            All day
          </label>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold flex items-center gap-1"><Palette className="h-3 w-3" /> Color</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => patch('color_hex', c.hex)}
                  title={c.label}
                  className={`h-7 w-7 rounded-md border-2 transition ${
                    form.color_hex === c.hex ? 'border-jax-blue scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            <div className="mt-1 text-[10px] text-jax-gray-3 italic">{COLOR_PRESETS.find(c => c.hex === form.color_hex)?.label || 'Custom'}</div>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</span>
            <input
              value={form.location ?? ''}
              onChange={e => patch('location', e.target.value)}
              placeholder="117 W Duval St, conference room B"
              className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold flex items-center gap-1"><Video className="h-3 w-3" /> Meeting URL (Jitsi auto if blank)</span>
            <div className="mt-1 flex gap-2">
              <input
                value={form.meeting_url ?? ''}
                onChange={e => patch('meeting_url', e.target.value)}
                placeholder="https://meet.jit.si/coj-..."
                className="flex-1 px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
              />
              {state.mode === 'edit' && (
                <button
                  onClick={() => onJoin(form)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-jax-success text-white text-xs font-medium hover:bg-jax-success/90 transition"
                >
                  <Video className="h-3.5 w-3.5" /> Join
                </button>
              )}
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">Description</span>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={e => patch('description', e.target.value)}
              placeholder="Agenda, prep notes, attendees notes..."
              className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm resize-none"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">Link to case (optional)</span>
            <select
              value={form.case_id ?? ''}
              onChange={e => patch('case_id', e.target.value || null)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition text-sm"
            >
              <option value="">-- none --</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.ticket_number} - {c.subject}</option>
              ))}
            </select>
            {form.case_id && (
              <Link
                to={`/work/cases/${form.case_id}`}
                target="_blank"
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-jax-blue hover:text-jax-sky"
              >
                Open case <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </label>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold flex items-center gap-1"><Users className="h-3 w-3" /> Attendees</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {agents.map(a => {
                const picked = (form.attendees ?? []).some(x => x.id === a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAttendee(a)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition ${
                      picked
                        ? 'border-jax-blue bg-jax-blue/10 text-jax-blue font-medium'
                        : 'border-jax-gray-2 dark:border-jax-blue/30 text-jax-gray-4 dark:text-jax-gray-2 hover:bg-jax-blue/5'
                    }`}
                  >
                    {a.full_name || a.email}
                  </button>
                )
              })}
              {agents.length === 0 && <span className="text-[11px] italic text-jax-gray-3">No teammates loaded</span>}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-md bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-jax-gray-1 dark:border-jax-blue/20 sticky bottom-0 bg-white dark:bg-jax-navy-deep">
          {state.mode === 'edit' ? (
            <button onClick={remove} disabled={saving}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md text-jax-danger hover:bg-jax-danger/10 transition disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 transition">Cancel</button>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded-md bg-jax-navy text-jax-light hover:bg-jax-blue transition disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {state.mode === 'new' ? 'Create event' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers ----------------------------------------------------- */

function extractJitsiRoom(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('jit.si') || u.hostname.includes('meet.jit.si')) {
      const parts = u.pathname.split('/').filter(Boolean)
      return parts[parts.length - 1] || null
    }
    return null
  } catch { return null }
}
