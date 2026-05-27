import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Filter, Search, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import type { ServiceRequestRow, Department, RequestStatus } from '../lib/types'
import { priorityTone, statusTone, relativeTime, slaState, STATUS_LABELS } from '../lib/types'

const STATUS_FILTERS: Array<{ value: 'open' | RequestStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_citizen', label: 'Awaiting Citizen' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export function CasesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cases, setCases] = useState<ServiceRequestRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(searchParams.get('q') ?? '')

  const statusFilter = (searchParams.get('status') ?? 'open') as 'open' | RequestStatus
  const deptFilter = searchParams.get('dept')

  const load = useCallback(async () => {
    let query = supabase
      .from('service_requests')
      .select(`
        id, ticket_number, subject, status, priority, source, citizen_name,
        service_address, council_district, sla_due_at, created_at, updated_at, tags, ai_summary,
        department:departments(id, slug, name, color_hex, icon),
        assignee:profiles!service_requests_assigned_to_fkey(id, full_name, display_name, avatar_url, status),
        citizen:profiles!service_requests_citizen_id_fkey(id, full_name, display_name, email, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter === 'open') {
      query = query.in('status', ['new','triaged','assigned','in_progress'])
    } else {
      query = query.eq('status', statusFilter)
    }

    if (deptFilter) {
      const { data: d } = await supabase.from('departments').select('id').eq('slug', deptFilter).maybeSingle()
      if (d) query = query.eq('department_id', (d as { id: string }).id)
    }

    const [{ data }, depts] = await Promise.all([
      query,
      supabase.from('departments').select('*').eq('is_active', true).order('sort_order'),
    ])
    setCases(((data as unknown as ServiceRequestRow[]) ?? []))
    setDepartments(((depts.data as Department[]) ?? []))
    setLoading(false)
  }, [statusFilter, deptFilter])

  useEffect(() => { load() }, [load])

  // Live updates
  useRealtime('service_requests', load)

  const filtered = useMemo(() => {
    if (!q.trim()) return cases
    const needle = q.toLowerCase()
    return cases.filter(c =>
      c.subject.toLowerCase().includes(needle) ||
      (c.description?.toLowerCase().includes(needle)) ||
      c.ticket_number.toLowerCase().includes(needle) ||
      (c.service_address?.toLowerCase().includes(needle)) ||
      (c.assignee?.full_name?.toLowerCase().includes(needle)) ||
      (c.citizen?.full_name?.toLowerCase().includes(needle)) ||
      c.tags.some(t => t.toLowerCase().includes(needle))
    )
  }, [cases, q])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key); else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/work" className="p-1.5 rounded-md hover:bg-jax-blue/10 transition" aria-label="Back">
          <ArrowLeft className="h-4 w-4 text-jax-gray-3" />
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue">Agent Desktop</div>
          <h1 className="text-2xl font-bold">All cases</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-jax-gray-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-jax-success animate-pulse" />
          Live · {filtered.length} of {cases.length} shown
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jax-gray-3" />
            <input
              type="search"
              autoFocus
              placeholder="Search subject, ticket #, address, citizen, agent, tag..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setParam('status', f.value === 'open' ? null : f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition ${
                  (statusFilter === f.value || (statusFilter === 'open' && f.value === 'open'))
                    ? 'bg-jax-blue text-jax-light'
                    : 'border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Department row */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-jax-gray-3 shrink-0" />
          <button
            onClick={() => setParam('dept', null)}
            className={`text-xs px-2.5 py-1 rounded whitespace-nowrap transition ${
              !deptFilter ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'
            }`}
          >
            All departments
          </button>
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => setParam('dept', deptFilter === d.slug ? null : d.slug)}
              className={`text-xs px-2.5 py-1 rounded whitespace-nowrap transition flex items-center gap-1.5 ${
                deptFilter === d.slug ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color_hex }} />
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Case list */}
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
        <div className="divide-y divide-jax-gray-1 dark:divide-jax-blue/10">
          {loading && <div className="p-12 text-center text-sm text-jax-gray-3">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center">
              <Sparkles className="h-10 w-10 text-jax-gray-3 mx-auto mb-2" />
              <p className="text-sm font-medium text-jax-gray-4 dark:text-jax-gray-2">No cases match these filters.</p>
              <p className="text-xs text-jax-gray-3 mt-1">Try clearing the search or switching status.</p>
            </div>
          )}
          {filtered.map(c => <CaseRow key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  )
}

function CaseRow({ c }: { c: ServiceRequestRow }) {
  const sla = slaState(c.sla_due_at)
  return (
    <Link to={`/work/cases/${c.id}`} className="block px-5 py-4 hover:bg-jax-light dark:hover:bg-jax-navy-deep/30 transition">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityTone(c.priority)}`}>{c.priority}</span>
            {sla === 'breached' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-jax-red text-white">SLA BREACHED</span>}
            {sla === 'soon' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-jax-warn text-white">DUE SOON</span>}
            <span className="font-mono text-xs text-jax-gray-3">{c.ticket_number}</span>
            {c.source && <span className="text-[10px] uppercase tracking-wider text-jax-gray-3">via {c.source.replace('_',' ')}</span>}
          </div>
          <div className="font-medium">{c.subject}</div>
          {c.ai_summary && (
            <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-1 italic flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 text-jax-blue mt-0.5 shrink-0" /> {c.ai_summary}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-1.5 flex-wrap">
            {c.department && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.department.color_hex }} />
                {c.department.name}
              </span>
            )}
            {c.service_address && <span>· {c.service_address}{c.council_district ? ` (D${c.council_district})` : ''}</span>}
            {c.assignee && <span>· {c.assignee.display_name || c.assignee.full_name}</span>}
            {!c.assignee && <span className="italic text-jax-warn">· Unassigned</span>}
            <span>· {relativeTime(c.created_at)}</span>
            {c.tags.length > 0 && c.tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-jax-gray-1 dark:bg-jax-navy text-[10px]">#{t}</span>
            ))}
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 ${statusTone(c.status)}`} title={STATUS_LABELS[c.status]}>
          {c.status.replace('_',' ')}
        </span>
      </div>
    </Link>
  )
}
