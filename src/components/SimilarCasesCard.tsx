import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { priorityTone, statusTone, relativeTime } from '../lib/types'

interface SimilarCase {
  id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  service_address: string | null
  created_at: string
  department_name: string | null
  department_color: string | null
  similarity: number
  shared_tags: string[] | null
  reason: string
}

export function SimilarCasesCard({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<SimilarCase[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('find_similar_cases', { p_case_id: caseId, p_limit: 5 })
    if (error) console.warn('similar cases error', error.message)
    setItems((data as SimilarCase[]) ?? [])
    setLoading(false)
  }, [caseId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-jax-blue" /> Similar cases
        </h3>
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-jax-gray-3" />
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  const topMatch = items[0]
  const isDupCandidate = topMatch.similarity >= 0.5

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-jax-blue" /> Similar cases
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-jax-gray-3">{items.length} found</span>
      </div>

      {isDupCandidate && (
        <div className="mb-3 p-2 rounded bg-jax-warn/10 border border-jax-warn/30 text-xs">
          <span className="font-semibold text-jax-warn">Possible duplicate.</span>
          {' '}
          <span className="text-jax-gray-4 dark:text-jax-gray-2">
            Top match scored {(topMatch.similarity * 100).toFixed(0)}% similar — verify before resolving.
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.id}>
            <Link
              to={`/work/cases/${it.id}`}
              className="block p-2.5 rounded-md border border-jax-gray-1 dark:border-jax-blue/15 hover:border-jax-blue/40 hover:bg-jax-blue/5 transition"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="font-mono text-[10px] text-jax-gray-3">{it.ticket_number}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${priorityTone(it.priority as never)}`}>
                      {it.priority}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${statusTone(it.status as never)}`}>
                      {it.status.replace('_',' ')}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate">{it.subject}</div>
                  <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 mt-0.5 truncate">
                    {it.department_name && (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: it.department_color || '#999' }} />
                          {it.department_name}
                        </span>
                        {' · '}
                      </>
                    )}
                    {relativeTime(it.created_at)}
                  </div>
                  <div className="text-[10px] text-jax-blue/80 italic mt-1">
                    {it.reason} · {(it.similarity * 100).toFixed(0)}% match
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-jax-gray-3 mt-1 shrink-0" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3 text-[10px] text-jax-gray-3 italic">
        Ranked by subject similarity, shared tags, department, and geography. Upgrades to true semantic embeddings (Claude / Voyage) when an API key is set.
      </div>
    </div>
  )
}
