import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, FileText, Loader2, Search, User, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { priorityTone } from '../lib/types'

type Group = 'case' | 'person' | 'department'

interface Hit {
  group: Group
  id: string
  primary: string
  secondary?: string
  meta?: string
  href: string
  // Style hints
  pill?: { text: string; tone: string }
  color?: string
}

interface OpenContext {
  open: boolean
  setOpen: (b: boolean) => void
}

const PaletteContext = (typeof window !== 'undefined' ? { current: null as OpenContext | null } : { current: null })

export function useCommandPalette() {
  // Lightweight signal so any button (the header "Search any case" button etc.)
  // can open the palette without prop-drilling.
  return {
    open: () => PaletteContext.current?.setOpen(true),
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  PaletteContext.current = { open, setOpen }

  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const nav = useNavigate()

  // ⌘K / Ctrl+K toggles open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdKey = isMac ? e.metaKey : e.ctrlKey
      if (cmdKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQ('')
      setHits([])
      setActive(0)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!open) return
    const needle = q.trim()
    if (!needle) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(async () => {
      const like = `%${needle}%`
      const [casesR, peopleR, deptR] = await Promise.all([
        supabase
          .from('service_requests')
          .select('id, ticket_number, subject, status, priority, service_address, council_district')
          .or(`subject.ilike.${like},ticket_number.ilike.${like},description.ilike.${like},service_address.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('profiles')
          .select('id, full_name, email, role, title, status')
          .or(`full_name.ilike.${like},email.ilike.${like},display_name.ilike.${like}`)
          .limit(6),
        supabase
          .from('departments')
          .select('id, slug, name, color_hex')
          .ilike('name', like)
          .limit(4),
      ])

      const out: Hit[] = []

      for (const c of (casesR.data ?? [])) {
        const cc = c as { id: string; ticket_number: string; subject: string; status: string; priority: string; service_address: string | null; council_district: number | null }
        out.push({
          group: 'case',
          id: cc.id,
          primary: cc.subject,
          secondary: `${cc.ticket_number}${cc.service_address ? ` · ${cc.service_address}` : ''}`,
          meta: cc.council_district ? `District ${cc.council_district}` : undefined,
          href: `/work/cases/${cc.id}`,
          pill: { text: cc.priority.toUpperCase(), tone: priorityTone(cc.priority as never) },
        })
      }

      for (const p of (peopleR.data ?? [])) {
        const pp = p as { id: string; full_name: string | null; email: string; role: string; title: string | null }
        out.push({
          group: 'person',
          id: pp.id,
          primary: pp.full_name || pp.email,
          secondary: pp.title || pp.role,
          meta: pp.email,
          href: `/work/cases?q=${encodeURIComponent(pp.full_name || pp.email)}`,
        })
      }

      for (const d of (deptR.data ?? [])) {
        const dd = d as { id: string; slug: string; name: string; color_hex: string }
        out.push({
          group: 'department',
          id: dd.id,
          primary: dd.name,
          secondary: `${dd.slug} department`,
          href: `/work/cases?dept=${dd.slug}`,
          color: dd.color_hex,
        })
      }

      setHits(out)
      setLoading(false)
      setActive(0)
    }, 180)
    return () => clearTimeout(handle)
  }, [q, open])

  const grouped = useMemo(() => {
    return {
      cases: hits.filter(h => h.group === 'case'),
      people: hits.filter(h => h.group === 'person'),
      depts: hits.filter(h => h.group === 'department'),
    }
  }, [hits])

  const flatList = useMemo(
    () => [...grouped.cases, ...grouped.people, ...grouped.depts],
    [grouped]
  )

  function go(h: Hit) {
    setOpen(false)
    nav(h.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, Math.max(flatList.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = flatList[active]
      if (hit) go(hit)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-jax-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
          <Search className="h-4 w-4 text-jax-blue shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search cases, people, departments..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-jax-gray-3"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-jax-gray-3" />}
          <button onClick={() => setOpen(false)} className="text-jax-gray-3 hover:text-jax-blue" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!q.trim() && (
            <div className="p-8 text-center text-sm text-jax-gray-4 dark:text-jax-gray-2">
              <div className="text-jax-gray-3 mb-2">Start typing to search</div>
              <div className="text-xs">
                Subject, ticket number, citizen name, address, agent, department — all fuzzy-matched in real time.
              </div>
              <div className="text-[11px] text-jax-gray-3 mt-4">
                <kbd className="px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy">↑↓</kbd> navigate
                <span className="mx-2">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy">Enter</kbd> open
                <span className="mx-2">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy">Esc</kbd> close
              </div>
            </div>
          )}

          {q.trim() && !loading && flatList.length === 0 && (
            <div className="p-8 text-center text-sm text-jax-gray-4 dark:text-jax-gray-2">
              No matches for <span className="font-mono italic">"{q}"</span>
            </div>
          )}

          {grouped.cases.length > 0 && (
            <Section title="Cases" count={grouped.cases.length}>
              {grouped.cases.map((h, i) => (
                <Row key={h.id} hit={h} active={active === i} onSelect={() => go(h)} onHover={() => setActive(i)} />
              ))}
            </Section>
          )}

          {grouped.people.length > 0 && (
            <Section title="People" count={grouped.people.length}>
              {grouped.people.map((h, i) => {
                const flatIdx = grouped.cases.length + i
                return (
                  <Row key={h.id} hit={h} active={active === flatIdx} onSelect={() => go(h)} onHover={() => setActive(flatIdx)} />
                )
              })}
            </Section>
          )}

          {grouped.depts.length > 0 && (
            <Section title="Departments" count={grouped.depts.length}>
              {grouped.depts.map((h, i) => {
                const flatIdx = grouped.cases.length + grouped.people.length + i
                return (
                  <Row key={h.id} hit={h} active={active === flatIdx} onSelect={() => go(h)} onHover={() => setActive(flatIdx)} />
                )
              })}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-jax-gray-1 dark:border-jax-blue/20 flex items-center justify-between text-[11px] text-jax-gray-3">
          <div>
            Fuzzy search across {flatList.length > 0 ? `${flatList.length} matches` : 'all records'} · powered by Liftori
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy">⌘K</kbd>
        </div>
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-jax-gray-3 bg-jax-light/50 dark:bg-jax-navy-deep/60 border-b border-jax-gray-1 dark:border-jax-blue/10">
        {title} <span className="text-jax-gray-3">· {count}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ hit, active, onSelect, onHover }: { hit: Hit; active: boolean; onSelect: () => void; onHover: () => void }) {
  const Icon = hit.group === 'case' ? FileText : hit.group === 'person' ? User : Building2
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition ${
        active ? 'bg-jax-blue/10' : 'hover:bg-jax-blue/5'
      }`}
    >
      {hit.color ? (
        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: hit.color }} />
      ) : (
        <Icon className="h-4 w-4 text-jax-blue shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{hit.primary}</div>
        {hit.secondary && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 truncate">{hit.secondary}</div>}
      </div>
      {hit.pill && (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${hit.pill.tone}`}>
          {hit.pill.text}
        </span>
      )}
      {hit.meta && <span className="text-[10px] text-jax-gray-3 shrink-0 hidden sm:inline">{hit.meta}</span>}
      {active && <ArrowRight className="h-4 w-4 text-jax-blue shrink-0" />}
    </button>
  )
}
