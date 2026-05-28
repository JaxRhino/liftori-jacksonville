import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Building2, CheckCircle, Clock, Inbox, MapPin,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime, statusTone } from '../lib/types'
import { useT } from '../lib/i18n'

interface PublicCase {
  id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  lat: number | null
  lng: number | null
  council_district: number | null
  tags: string[] | null
  created_at: string
  resolved_at: string | null
  closed_at: string | null
  department_id: string | null
  department_slug: string | null
  department_name: string | null
  department_color: string | null
}

interface DeptStat {
  id: string
  slug: string
  name: string
  color_hex: string
  open_count: number
  resolved_count: number
  closed_count: number
  urgent_open: number
}

export function Transparency() {
  const t = useT()
  const [cases, setCases] = useState<PublicCase[]>([])
  const [stats, setStats] = useState<DeptStat[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [casesR, statsR] = await Promise.all([
      supabase.from('public_service_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('public_department_stats').select('*'),
    ])
    setCases((casesR.data as PublicCase[]) ?? [])
    setStats((statsR.data as DeptStat[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('service_requests', load)

  const openCases     = cases.filter(c => ['new','triaged','assigned','in_progress'].includes(c.status))
  const resolved      = cases.filter(c => ['resolved','closed'].includes(c.status))
  const urgentOpen    = openCases.filter(c => ['urgent','emergency'].includes(c.priority))

  const totalOpen      = stats.reduce((s, x) => s + (x.open_count     || 0), 0)
  const totalResolved  = stats.reduce((s, x) => s + (x.resolved_count || 0), 0) +
                         stats.reduce((s, x) => s + (x.closed_count   || 0), 0)
  const totalUrgent    = stats.reduce((s, x) => s + (x.urgent_open    || 0), 0)

  return (
    <div className="bg-jax-light dark:bg-jax-ink">
      {/* Hero */}
      <section className="bg-gradient-to-br from-jax-navy via-jax-navy-deep to-jax-ink text-jax-light">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jax-blue/20 border border-jax-blue/40 text-xs uppercase tracking-widest mb-4">
            <span className="h-2 w-2 rounded-full bg-jax-success animate-pulse" /> {t('trans.liveBadge')}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-3">
            {t('trans.heroTitle1')} <span className="text-jax-gold">{t('trans.heroTitle2')}</span>
          </h1>
          <p className="text-lg text-jax-sky/90 max-w-2xl">
            {t('trans.heroBody')}
          </p>
        </div>
      </section>

      {/* Stat strip */}
      <section className="max-w-7xl mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Inbox}         tone="blue"     label={t('trans.statOpen')}     value={totalOpen}      sub={`${urgentOpen.length} ${t('trans.statOpenSub')}`} />
          <StatCard icon={Clock}         tone="warn"     label={t('trans.statActive')}   value={openCases.filter(c => Date.now() - new Date(c.created_at).getTime() < 86_400_000).length} sub={t('trans.statActiveSub')} />
          <StatCard icon={CheckCircle}   tone="success"  label={t('trans.statResolved')} value={totalResolved} sub={t('trans.statResolvedSub')} />
          <StatCard icon={AlertTriangle} tone="danger"   label={t('trans.statUrgent')}   value={totalUrgent} sub={t('trans.statUrgentSub')} />
        </div>
      </section>

      {/* Map */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-jax-blue" /> {t('trans.activeRequests')}</h2>
            <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2">
              {openCases.length} {t('trans.openCount')} · {urgentOpen.length} {t('trans.urgentCount')}
            </div>
          </div>
          <TransparencyMap cases={openCases} height="420px" legendLabel={t('trans.legendPriority')} />
        </div>
      </section>

      {/* Department breakdown */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-jax-blue" /> {t('trans.byDepartment')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map(d => (
            <div key={d.id} className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color_hex }} />
                <div className="font-semibold text-sm">{d.name}</div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-lg font-bold text-jax-blue">{d.open_count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{t('trans.statOpen')}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-jax-warn">{d.urgent_open}</div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{t('priority.urgent')}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-jax-success">{d.resolved_count + d.closed_count}</div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3">{t('trans.statResolved')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent resolved */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-jax-success" /> {t('trans.recentlyResolved')}</h2>
        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg divide-y divide-jax-gray-1 dark:divide-jax-blue/10">
          {loading && <div className="p-6 text-center text-sm text-jax-gray-3">{t('citizen.loading')}</div>}
          {!loading && resolved.length === 0 && (
            <div className="p-6 text-center text-sm text-jax-gray-3 italic">{t('trans.noResolved')}</div>
          )}
          {resolved.slice(0, 6).map(c => (
            <div key={c.id} className="px-5 py-3 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-jax-success shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{c.subject}</div>
                <div className="text-xs text-jax-gray-3 truncate">
                  <span className="font-mono">{c.ticket_number}</span>
                  {c.department_name && <> · {c.department_name}</>}
                  {' · '}{relativeTime(c.resolved_at || c.closed_at || c.created_at)}
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${statusTone(c.status as never)}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-jax-navy text-jax-light">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-jax-sky/80 mb-3">
            {t('trans.poweredFooter')}
          </p>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-jax-gold hover:text-jax-gold/80">
            {t('trans.backToCityHall')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; sub: string; tone: 'blue' | 'warn' | 'danger' | 'success' }) {
  const colors = { blue: 'text-jax-blue', warn: 'text-jax-warn', danger: 'text-jax-danger', success: 'text-jax-success' }
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 flex items-center gap-1.5"><Icon className={`h-3.5 w-3.5 ${colors[tone]}`} />{label}</span>
      </div>
      <div className={`text-3xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="text-[11px] text-jax-gray-3 mt-0.5">{sub}</div>
    </div>
  )
}

function TransparencyMap({ cases, height, legendLabel }: { cases: PublicCase[]; height: string; legendLabel: string }) {
  const [containerId] = useState(() => `tmap-${Math.random().toString(36).slice(2, 9)}`)
  const pointed = useMemo(() => cases.filter(c => c.lat != null && c.lng != null), [cases])

  useEffect(() => {
    let mounted = true
    let map: any = null
    let layer: any = null
    ;(async () => {
      const L = (await import('leaflet')).default
      if (!mounted) return
      const el = document.getElementById(containerId)
      if (!el || el.children.length > 0) return
      map = L.map(el, { zoomControl: true, attributionControl: false }).setView([30.3322, -81.6557], 11)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
      }).addTo(map)
      layer = L.layerGroup().addTo(map)
      for (const c of pointed) {
        if (c.lat == null || c.lng == null) continue
        const color = priorityColor(c.priority)
        const m = L.circleMarker([c.lat, c.lng], {
          radius: c.priority === 'urgent' || c.priority === 'emergency' ? 9 : 6,
          color: '#ffffff', weight: 1.5, fillColor: color, fillOpacity: 0.9,
        })
        m.bindPopup(`<strong>${c.subject}</strong><br/><span style="font-family:monospace;color:#888">${c.ticket_number}</span><br/>${c.department_name || ''} - ${c.priority}`)
        m.addTo(layer)
      }
    })()
    return () => {
      mounted = false
      if (layer) layer.remove()
      if (map) map.remove()
    }
  }, [pointed, containerId])

  return (
    <div className="relative">
      <div id={containerId} style={{ height }} />
      <div className="absolute top-2 left-2 z-10 p-2 bg-white/95 dark:bg-jax-navy-deep/95 rounded shadow-sm border border-jax-gray-1 dark:border-jax-blue/20">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5">{legendLabel}</div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <LegendDot color="#7F1D1D" label="Emergency" />
          <LegendDot color="#B91C1C" label="Urgent" />
          <LegendDot color="#D97706" label="High" />
          <LegendDot color="#1E5BC6" label="Normal" />
          <LegendDot color="#697586" label="Low" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 z-10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider bg-white/95 dark:bg-jax-navy-deep/95 text-jax-gray-3 rounded">
        Esri World Street Map
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function priorityColor(p?: string): string {
  switch (p) {
    case 'emergency': return '#7F1D1D'
    case 'urgent':    return '#B91C1C'
    case 'high':      return '#D97706'
    case 'normal':    return '#1E5BC6'
    case 'low':       return '#697586'
    default:          return '#1E5BC6'
  }
}
