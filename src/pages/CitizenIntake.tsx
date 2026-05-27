import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, Edit3, Loader2,
  MapPin, MessageSquare, Phone, Send, ShieldAlert, Sparkles, Tag,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface IntakeResult {
  subject: string
  summary: string
  description: string
  department_slug: string
  department_id: string | null
  department_name: string
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency'
  tags: string[]
  follow_up_questions: string[]
  default_sla_hours: number
  source: 'claude' | 'keyword'
}

const PRIORITY_INFO: Record<IntakeResult['priority'], { color: string; label: string }> = {
  emergency: { color: 'bg-red-700 text-white',          label: 'Emergency' },
  urgent:    { color: 'bg-jax-red text-white',          label: 'Urgent' },
  high:      { color: 'bg-jax-warn text-white',         label: 'High' },
  normal:    { color: 'bg-jax-blue/15 text-jax-blue',   label: 'Normal' },
  low:       { color: 'bg-jax-gray-2/40 text-jax-gray-4', label: 'Low' },
}

export function CitizenIntake() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [narrative, setNarrative] = useState('')
  const [address, setAddress]     = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult]       = useState<IntakeResult | null>(null)
  const [editing, setEditing]     = useState<'subject' | 'description' | null>(null)
  const [editingSubject, setEditingSubject] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  // Pre-fill address from profile
  useEffect(() => {
    if (profile?.street_address && !address) setAddress(profile.street_address)
  }, [profile, address])

  async function analyze() {
    if (!narrative.trim()) return
    setAnalyzing(true)
    setSubmitError(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      const resp = await fetch('https://gnacmyygtmefgojwngpx.supabase.co/functions/v1/intake-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ narrative: narrative.trim(), address: address.trim() }),
      })
      if (!resp.ok) throw new Error(`intake error ${resp.status}`)
      const out = (await resp.json()) as IntakeResult
      setResult(out)
      setEditingSubject(out.subject)
      setEditingDescription(out.description)
    } catch (e) {
      console.warn('intake error', e)
      setSubmitError('We had trouble processing that. Please try rephrasing or contact 630-CITY directly.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function submitCase() {
    if (!result || !user) return
    setSubmitting(true); setSubmitError(null)
    try {
      const sla_due_at = new Date(Date.now() + result.default_sla_hours * 3600 * 1000).toISOString()
      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          subject:        editingSubject || result.subject,
          description:    editingDescription || result.description,
          ai_summary:     result.summary,
          status:         'new',
          priority:       result.priority,
          source:         'chat_ai',
          department_id:  result.department_id,
          citizen_id:     user.id,
          service_address: address.trim() || null,
          council_district: profile?.council_district ?? null,
          tags:           result.tags,
          sla_due_at,
        })
        .select('id, ticket_number')
        .single()
      if (error) throw error
      const r = data as { id: string; ticket_number: string }
      setTicketNumber(r.ticket_number)
      // After 1.5s redirect to citizen home
      setTimeout(() => nav('/me', { replace: true }), 1500)
    } catch (e) {
      console.warn('submit error', e)
      setSubmitError(e instanceof Error ? e.message : 'Could not submit your request.')
    } finally {
      setSubmitting(false)
    }
  }

  const exampleNarratives = useMemo(() => ([
    "There's a deep pothole on Atlantic Boulevard near 9A in the right lane. Almost blew my tire this morning.",
    "Garbage wasn't picked up on my Thursday route. Cart is still at the curb.",
    "A friendly stray dog has been wandering near my kids' elementary school for two days.",
    "Tree limb came down across Edgewood Avenue and is blocking the right lane.",
  ]), [])

  // Success state
  if (ticketNumber) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-jax-success/15 text-jax-success flex items-center justify-center mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request submitted</h2>
          <p className="text-jax-gray-4 dark:text-jax-gray-2 mb-4">
            Your ticket number is <span className="font-mono font-semibold">{ticketNumber}</span>
          </p>
          <p className="text-sm text-jax-gray-3">Redirecting to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/me" className="inline-flex items-center gap-1 text-sm text-jax-blue hover:text-jax-sky mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-jax-blue" /> Report an issue
        </h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
          Tell me what's going on in plain English. I'll route it to the right department and let you track it.
        </p>
      </div>

      {!result && (
        <div className="space-y-4">
          {/* Narrative */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-3.5 w-3.5 text-jax-blue" /> What's going on?
              </span>
              <textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                rows={5}
                placeholder="Describe the issue — when, where, what's happening. Add as much detail as you'd like."
                className="w-full px-3 py-2.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition resize-none"
              />
            </label>
            <label className="block mt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-jax-blue" /> Where? (optional)
              </span>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Address or cross-streets in Jacksonville"
                className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
              />
            </label>
            {submitError && (
              <div className="mt-3 px-3 py-2 rounded bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-sm">
                {submitError}
              </div>
            )}
            <button
              onClick={analyze}
              disabled={!narrative.trim() || analyzing}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-jax-navy text-jax-light font-medium hover:bg-jax-blue disabled:opacity-50 transition"
            >
              {analyzing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Routing your request…</>
                : <><Sparkles className="h-4 w-4" /> Process with AI <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>

          {/* Examples */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-jax-gray-3 mb-2">Or try one of these</div>
            <ul className="space-y-1.5">
              {exampleNarratives.map(ex => (
                <li key={ex}>
                  <button
                    onClick={() => setNarrative(ex)}
                    className="w-full text-left text-sm p-2.5 rounded-md hover:bg-jax-blue/5 dark:hover:bg-jax-blue/10 transition border border-transparent hover:border-jax-blue/30"
                  >
                    "{ex}"
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust footer */}
          <div className="text-xs text-jax-gray-3 px-2">
            Need to talk to someone live? Call 630-CITY (904-630-2489), Mon-Thu 8a-5p, Fri 8a-7p, Sat 8a-12p. Emergencies: 911.
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* AI banner */}
          <div className="rounded-lg p-4 bg-gradient-to-br from-jax-blue/15 to-jax-navy/15 dark:from-jax-blue/20 dark:to-jax-navy/30 border border-jax-blue/30 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-jax-blue mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                Routed for review
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-jax-blue/20 text-jax-blue">
                  {result.source === 'claude' ? 'AI · Claude' : 'AI · keyword classifier'}
                </span>
              </div>
              <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
                Review the details below. You can edit anything before submitting.
              </p>
            </div>
          </div>

          {/* Preview card */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5 space-y-4">
            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-jax-gray-3">Subject</span>
                <button onClick={() => setEditing(editing === 'subject' ? null : 'subject')} className="text-[10px] text-jax-blue hover:text-jax-sky inline-flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> {editing === 'subject' ? 'Done' : 'Edit'}
                </button>
              </div>
              {editing === 'subject' ? (
                <input
                  autoFocus
                  type="text"
                  value={editingSubject}
                  onChange={e => setEditingSubject(e.target.value)}
                  className="w-full px-2 py-1.5 text-base font-semibold rounded border border-jax-blue bg-transparent outline-none"
                />
              ) : (
                <h2 className="text-base font-semibold">{editingSubject}</h2>
              )}
            </div>

            {/* Routing row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row icon={Building2} label="Department" value={result.department_name} />
              <Row icon={ShieldAlert} label="Priority"  valueElem={
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PRIORITY_INFO[result.priority].color}`}>
                  {PRIORITY_INFO[result.priority].label}
                </span>
              } />
              <Row icon={MapPin} label="Address" value={address || 'Not provided'} />
              <Row icon={Phone} label="ETA window" value={`Within ${result.default_sla_hours} hours`} />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-jax-gray-3">Description</span>
                <button onClick={() => setEditing(editing === 'description' ? null : 'description')} className="text-[10px] text-jax-blue hover:text-jax-sky inline-flex items-center gap-1">
                  <Edit3 className="h-3 w-3" /> {editing === 'description' ? 'Done' : 'Edit'}
                </button>
              </div>
              {editing === 'description' ? (
                <textarea
                  autoFocus
                  rows={4}
                  value={editingDescription}
                  onChange={e => setEditingDescription(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border border-jax-blue bg-transparent outline-none resize-none"
                />
              ) : (
                <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed">{editingDescription}</p>
              )}
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-jax-gray-1 dark:bg-jax-navy text-jax-gray-4 dark:text-jax-gray-2">
                    <Tag className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
            )}

            {/* Follow-up questions */}
            {result.follow_up_questions.length > 0 && (
              <div className="rounded p-3 bg-jax-warn/5 border border-jax-warn/30 text-sm">
                <div className="flex items-center gap-1.5 mb-1.5 text-jax-warn font-semibold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-3.5 w-3.5" /> A few quick clarifications would help
                </div>
                <ul className="space-y-1 text-sm text-jax-gray-4 dark:text-jax-gray-2">
                  {result.follow_up_questions.map((q, i) => <li key={i}>· {q}</li>)}
                </ul>
                <p className="text-[10px] text-jax-gray-3 mt-2 italic">
                  Not required — but answering in the description gets it resolved faster.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {submitError && (
            <div className="px-3 py-2 rounded bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-sm">
              {submitError}
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch gap-2">
            <button
              onClick={() => { setResult(null); setEditing(null) }}
              className="sm:flex-1 px-4 py-2.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/5 transition"
            >
              <ArrowLeft className="inline h-3.5 w-3.5 mr-1" /> Rewrite
            </button>
            <button
              onClick={submitCase}
              disabled={submitting}
              className="sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-jax-navy text-jax-light hover:bg-jax-blue disabled:opacity-50 transition"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, value, valueElem }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string; valueElem?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-jax-blue mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{label}</div>
        <div className="text-sm font-medium truncate">{valueElem ?? value}</div>
      </div>
    </div>
  )
}
