import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock, Check, Copy, ExternalLink, Loader2, Mail, Plus, Sparkles,
  Trash2, Users, Video, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'
import { VideoHuddleModal } from '../../components/VideoHuddleModal'

interface VideoMeeting {
  id: string
  owner_id: string
  title: string
  agenda: string | null
  scheduled_at: string | null
  duration_minutes: number | null
  jitsi_room_slug: string
  invited_user_ids: string[]
  external_invite_emails: Array<{ name?: string; email: string; joined_at?: string }>
  external_invite_token: string | null
  recurrence: string | null
  case_id: string | null
  created_at: string
  updated_at: string
}

interface Profile { id: string; full_name: string; display_name: string | null; email: string }

export function MeetPage() {
  const { profile } = useAuth()
  const [meetings, setMeetings] = useState<VideoMeeting[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VideoMeeting | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<VideoMeeting | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const [m, p] = await Promise.all([
      supabase.from('video_meetings').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }),
      supabase.from('profiles').select('id, full_name, display_name, email').in('role',['city_employee','super_admin']).order('full_name'),
    ])
    setMeetings((m.data as VideoMeeting[]) ?? [])
    setProfiles((p.data as Profile[]) ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])
  useRealtime('video_meetings', load)

  const upcoming = useMemo(() => meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at).getTime() >= Date.now() - 30*60_000), [meetings])
  const past     = useMemo(() => meetings.filter(m => m.scheduled_at && new Date(m.scheduled_at).getTime() <  Date.now() - 30*60_000), [meetings])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" /> Workspace
          </div>
          <h1 className="text-2xl font-bold">Meet</h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
            Schedule video meetings with shareable links. Powered by Jitsi -- no vendor signup required.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> Schedule meeting
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-jax-blue" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-6">
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.length === 0 ? (
                <Empty text="No upcoming meetings. Click Schedule to plan one." />
              ) : (
                <ul className="space-y-2">
                  {upcoming.map(m => <MeetingRow key={m.id} meeting={m} profiles={profiles} onOpen={() => setSelected(m)} onJoin={() => setJoining(m)} />)}
                </ul>
              )}
            </Section>

            {past.length > 0 && (
              <Section title="Past" count={past.length}>
                <ul className="space-y-2">
                  {past.map(m => <MeetingRow key={m.id} meeting={m} profiles={profiles} onOpen={() => setSelected(m)} onJoin={() => setJoining(m)} past />)}
                </ul>
              </Section>
            )}
          </div>

          {/* Right rail: detail / start */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {selected ? (
              <MeetingDetail
                meeting={selected}
                profiles={profiles}
                onClose={() => setSelected(null)}
                onJoin={() => setJoining(selected)}
                onUpdated={load}
              />
            ) : (
              <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5 text-center text-sm text-jax-gray-3">
                <Sparkles className="h-5 w-5 text-jax-blue mx-auto mb-2" />
                Select a meeting to see invite links + start call.
              </div>
            )}
          </aside>
        </div>
      )}

      {creating && profile && (
        <CreateMeetingModal
          ownerId={profile.id}
          profiles={profiles}
          onClose={() => setCreating(false)}
          onCreated={(m) => { setCreating(false); setSelected(m); load() }}
        />
      )}

      {joining && profile && (
        <VideoHuddleModal
          room={joining.jitsi_room_slug}
          displayName={profile.display_name || profile.full_name || 'Agent'}
          subject={joining.title}
          caseTicket={joining.scheduled_at ? new Date(joining.scheduled_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : undefined}
          onLeave={() => setJoining(null)}
        />
      )}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-jax-gray-3 mb-2">
        {title} <span className="text-jax-gray-3">· {count}</span>
      </h2>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-6 text-center text-sm text-jax-gray-3 italic">{text}</div>
}

function MeetingRow({ meeting, profiles, onOpen, onJoin, past }: { meeting: VideoMeeting; profiles: Profile[]; onOpen: () => void; onJoin: () => void; past?: boolean }) {
  const attendees = (meeting.invited_user_ids ?? []).map(id => profiles.find(p => p.id === id)).filter(Boolean) as Profile[]
  const externals = meeting.external_invite_emails ?? []
  const total = attendees.length + externals.length
  const when = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null
  const inProgress = when && Math.abs(when.getTime() - Date.now()) < 30 * 60_000
  return (
    <li>
      <div className={`bg-white dark:bg-jax-navy-deep/40 border rounded-lg p-4 hover:border-jax-blue/60 transition ${
        inProgress ? 'border-jax-success ring-1 ring-jax-success/30' : 'border-jax-gray-1 dark:border-jax-blue/20'
      } ${past ? 'opacity-70' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-md ${inProgress ? 'bg-jax-success/15 text-jax-success' : 'bg-jax-blue/15 text-jax-blue'}`}>
            <Video className="h-5 w-5" />
          </div>
          <button onClick={onOpen} className="flex-1 text-left min-w-0">
            <div className="font-semibold truncate">{meeting.title}</div>
            <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
              {when ? (
                <>
                  <CalendarClock className="inline h-3 w-3 mr-1" />
                  {when.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {meeting.duration_minutes && ` · ${meeting.duration_minutes}m`}
                  {inProgress && <span className="ml-2 text-jax-success font-semibold uppercase tracking-wider text-[10px]">starts soon</span>}
                </>
              ) : 'Unscheduled'}
            </div>
            {total > 0 && (
              <div className="text-[11px] text-jax-gray-3 mt-1.5 truncate">
                <Users className="inline h-3 w-3 mr-1" />
                {[
                  attendees.length > 0 ? `${attendees.length} on staff` : null,
                  externals.length > 0 ? `${externals.length} external` : null,
                ].filter(Boolean).join(' · ')}
              </div>
            )}
          </button>
          <button onClick={onJoin} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-jax-success/15 text-jax-success hover:bg-jax-success/25 text-xs font-semibold">
            <Video className="h-3 w-3" /> Join
          </button>
        </div>
      </div>
    </li>
  )
}

function MeetingDetail({ meeting, profiles, onClose, onJoin, onUpdated }: { meeting: VideoMeeting; profiles: Profile[]; onClose: () => void; onJoin: () => void; onUpdated: () => void }) {
  const externalUrl = meeting.external_invite_token
    ? `${window.location.origin}/meet/${meeting.external_invite_token}`
    : null
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(meeting.jitsi_room_slug)}`
  const [copied, setCopied] = useState<'external' | 'jitsi' | null>(null)
  const attendees = (meeting.invited_user_ids ?? []).map(id => profiles.find(p => p.id === id)).filter(Boolean) as Profile[]
  const externals = meeting.external_invite_emails ?? []

  async function copy(text: string, which: 'external' | 'jitsi') {
    await navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  async function del() {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('video_meetings').delete().eq('id', meeting.id)
    onClose(); onUpdated()
  }

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20 flex items-start gap-2">
        <Video className="h-4 w-4 text-jax-blue mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-snug">{meeting.title}</h3>
          {meeting.scheduled_at && (
            <div className="text-[11px] text-jax-gray-3">
              {new Date(meeting.scheduled_at).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {meeting.duration_minutes && ` · ${meeting.duration_minutes}m`}
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close" className="text-jax-gray-3 hover:text-jax-blue"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="p-5 space-y-4">
        <button onClick={onJoin} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-success text-white hover:bg-jax-success/90 font-semibold transition">
          <Video className="h-4 w-4" /> Join meeting
        </button>

        {meeting.agenda && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Agenda</div>
            <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed whitespace-pre-wrap">{meeting.agenda}</p>
          </div>
        )}

        {externalUrl && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Shareable external link</div>
            <div className="flex items-center gap-1">
              <input readOnly value={externalUrl} className="flex-1 px-2 py-1.5 text-xs font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink truncate" />
              <button onClick={() => copy(externalUrl, 'external')} className="p-1.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition" title="Copy">
                {copied === 'external' ? <Check className="h-3.5 w-3.5 text-jax-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a href={externalUrl} target="_blank" rel="noopener" className="p-1.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition" title="Preview">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="text-[10px] text-jax-gray-3 italic mt-1">For citizens, contractors, press -- shows a branded landing page with the Join button.</div>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Jitsi room</div>
          <div className="flex items-center gap-1">
            <input readOnly value={jitsiUrl} className="flex-1 px-2 py-1.5 text-xs font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink truncate" />
            <button onClick={() => copy(jitsiUrl, 'jitsi')} className="p-1.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition" title="Copy">
              {copied === 'jitsi' ? <Check className="h-3.5 w-3.5 text-jax-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {(attendees.length > 0 || externals.length > 0) && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1.5">
              Invitees · {attendees.length + externals.length}
            </div>
            <ul className="space-y-1 text-xs">
              {attendees.map(a => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-jax-success" />
                  {a.display_name || a.full_name}
                  <span className="text-jax-gray-3 ml-auto text-[10px]">staff</span>
                </li>
              ))}
              {externals.map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-jax-gray-3" />
                  <span className="truncate">{e.name || e.email}</span>
                  <span className="text-jax-gray-3 ml-auto text-[10px]">external</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={del} className="w-full text-xs text-jax-danger hover:bg-jax-danger/10 rounded-md py-1.5 transition inline-flex items-center justify-center gap-1">
          <Trash2 className="h-3 w-3" /> Delete meeting
        </button>
      </div>
    </div>
  )
}

function CreateMeetingModal({ ownerId, profiles, onClose, onCreated }: { ownerId: string; profiles: Profile[]; onClose: () => void; onCreated: (m: VideoMeeting) => void }) {
  const [title, setTitle] = useState('')
  const [agenda, setAgenda] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(); d.setMinutes(0,0,0); d.setHours(d.getHours()+1)
    const tz = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tz).toISOString().slice(0,16)
  })
  const [duration, setDuration] = useState(30)
  const [invited, setInvited] = useState<string[]>([])
  const [externalsRaw, setExternalsRaw] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleInvite(id: string) {
    setInvited(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const ext = externalsRaw.split(/[\n,]/).map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/^(.+?)\s*<(.+@.+)>$/)
      if (m) return { name: m[1].trim(), email: m[2].trim() }
      return { email: s }
    })
    const { data, error } = await supabase.from('video_meetings').insert({
      owner_id: ownerId,
      title: title.trim(),
      agenda: agenda.trim() || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      duration_minutes: duration,
      invited_user_ids: invited,
      external_invite_emails: ext,
    }).select('*').single()
    setSaving(false)
    if (error || !data) return
    onCreated(data as VideoMeeting)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 bg-jax-ink/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
          <h3 className="font-semibold flex items-center gap-2"><Video className="h-4 w-4 text-jax-blue" /> Schedule meeting</h3>
          <button onClick={onClose} aria-label="Close" className="text-jax-gray-3 hover:text-jax-blue"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What is this meeting about?" className="w-full px-3 py-2.5 text-base font-semibold rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
          <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={3} placeholder="Agenda, notes, links..." className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none resize-none" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Date &amp; time</div>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Duration</div>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">Invite teammates</div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink max-h-32 overflow-y-auto">
              {profiles.map(p => {
                const sel = invited.includes(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleInvite(p.id)} className={`text-xs px-2 py-0.5 rounded-full border transition ${sel ? 'bg-jax-blue text-jax-light border-jax-blue' : 'border-jax-gray-2 dark:border-jax-gray-4/40 hover:border-jax-blue'}`}>
                    {p.display_name || p.full_name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">External invitees (one per line: Name &lt;email@example.com&gt; or just email)</div>
            <textarea value={externalsRaw} onChange={e => setExternalsRaw(e.target.value)} rows={3} placeholder="Mike Weinstein <mike.weinstein@coj.gov>&#10;sarah@vendor.com" className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none resize-none font-mono" />
            <div className="text-[10px] text-jax-gray-3 italic mt-1">They'll get a shareable link to a public landing page with the Join button.</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition">Cancel</button>
          <button onClick={save} disabled={!title.trim() || saving} className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
