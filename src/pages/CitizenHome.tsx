import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight, BookOpen, Calendar, CreditCard, FileText, MapPin,
  Phone, Recycle, Sparkles, Trash2, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime, statusTone } from '../lib/types'
import { useT } from '../lib/i18n'

interface ServiceRequest {
  id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  created_at: string
}

interface KnowledgeArticle {
  id: string
  slug: string
  title: string
  excerpt: string | null
  tags: string[]
}

interface NeighborhoodCase {
  id: string
  subject: string
  status: string
  council_district: number | null
  service_address: string | null
  created_at: string
}

export function CitizenHome() {
  const { profile } = useAuth()
  const t = useT()
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([])
  const [neighborhood, setNeighborhood] = useState<NeighborhoodCase[]>([])
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [stats, setStats] = useState({ open: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    const [mineR, nbR, kbR] = await Promise.all([
      supabase.from('service_requests')
        .select('id, ticket_number, subject, status, priority, created_at')
        .eq('citizen_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(8),
      profile.council_district
        ? supabase.from('service_requests')
            .select('id, subject, status, council_district, service_address, created_at')
            .eq('council_district', profile.council_district)
            .neq('citizen_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as unknown }),
      supabase.from('knowledge_articles')
        .select('id, slug, title, excerpt, tags')
        .eq('is_public', true)
        .order('view_count', { ascending: false })
        .limit(4),
    ])
    const mine = (mineR.data as ServiceRequest[]) ?? []
    setMyRequests(mine)
    setNeighborhood((nbR.data as NeighborhoodCase[]) ?? [])
    setArticles((kbR.data as KnowledgeArticle[]) ?? [])
    setStats({
      open: mine.filter(r => ['new','triaged','assigned','in_progress'].includes(r.status)).length,
      resolved: mine.filter(r => ['resolved','closed'].includes(r.status)).length,
    })
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])
  useRealtime('service_requests', load)

  const displayName = profile?.display_name || profile?.full_name || t('citizen.resident')
  const firstName = displayName.split(' ')[0]
  const district = profile?.council_district ?? '-'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Welcome + stats strip */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1">{t('citizen.dashboard')}</div>
          <h1 className="text-3xl font-bold">{t('citizen.hi')}, {firstName}.</h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
            {t('citizen.welcomeSub')}
          </p>
        </div>
        <div className="flex gap-2">
          <Pill label={t('citizen.open')} value={stats.open} tone="blue" />
          <Pill label={t('citizen.resolved')} value={stats.resolved} tone="success" />
        </div>
      </div>

      {/* Hero CTA + My Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 relative overflow-hidden rounded-lg bg-gradient-to-br from-jax-blue via-jax-navy to-jax-navy-deep text-jax-light p-6">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-jax-gold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> {t('citizen.aiAssistant')}
            </div>
            <h2 className="text-2xl font-bold mb-1">{t('citizen.reportSomething')}</h2>
            <p className="text-sm text-jax-sky/90 mb-5 max-w-md">
              {t('citizen.reportBody')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/me/intake" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-jax-gold text-jax-ink font-semibold hover:bg-jax-gold/90 transition">
                {t('citizen.newRequest')} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="tel:9046302489" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-jax-sky/50 text-jax-light hover:bg-jax-blue/20 transition text-sm">
                <Phone className="h-4 w-4" /> {t('citizen.orCall')}
              </a>
            </div>
          </div>
          <Sparkles className="absolute top-4 right-4 h-32 w-32 text-jax-blue/20" />
        </div>

        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-jax-blue" /> {t('citizen.yourAddress')}
          </h3>
          <div className="space-y-2 text-sm">
            <Field label={profile?.street_address || t('citizen.noAddress')} sub={`Jacksonville, FL ${profile?.zip ?? ''}`} />
            <Field icon={MapPin}   label={t('citizen.councilDistrict')} sub={String(district)} />
            <Field icon={Calendar} label={t('citizen.evacZone')}        sub={profile?.evac_zone || t('citizen.notSet')} />
            <Field icon={Trash2}   label={t('citizen.hauler')}          sub={profile?.hauler || t('citizen.notAssigned')} />
          </div>
        </div>
      </div>

      {/* My requests + neighborhood + KB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My service requests */}
        <div className="lg:col-span-2 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-jax-blue" /> {t('citizen.myRequests')}</h3>
              <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2">{t('citizen.myRequestsSub')}</p>
            </div>
            <Link to="/me/intake" className="text-xs px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky transition">
              {t('citizen.newReqShort')}
            </Link>
          </div>
          <div className="divide-y divide-jax-gray-1 dark:divide-jax-blue/10">
            {loading && <div className="p-6 text-center text-sm text-jax-gray-3">{t('citizen.loading')}</div>}
            {!loading && myRequests.length === 0 && (
              <div className="p-10 text-center">
                <Sparkles className="h-10 w-10 text-jax-blue/40 mx-auto mb-3" />
                <p className="text-sm font-medium">{t('citizen.noneYet')}</p>
                <p className="text-xs text-jax-gray-3 mt-1 mb-3">{t('citizen.noneYetSub')}</p>
                <Link to="/me/intake" className="inline-flex items-center gap-1 text-xs text-jax-blue hover:text-jax-sky">
                  {t('citizen.startNow')} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
            {myRequests.map(req => (
              <div key={req.id} className="px-5 py-4 hover:bg-jax-light dark:hover:bg-jax-navy-deep/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{req.subject}</div>
                    <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5 font-mono">
                      {req.ticket_number} · {relativeTime(req.created_at)}
                    </div>
                  </div>
                  <StatusPill status={req.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: neighborhood + KB */}
        <div className="space-y-4">
          {/* Neighborhood activity */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-jax-blue" /> {t('citizen.neighborhood')}
            </h3>
            {neighborhood.length === 0 ? (
              <p className="text-xs text-jax-gray-3 italic">{t('citizen.neighborhoodNone')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {neighborhood.map(n => (
                  <li key={n.id} className="flex items-start gap-2">
                    <StatusDot status={n.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{n.subject}</div>
                      <div className="text-[10px] text-jax-gray-3 truncate">
                        {n.service_address ? n.service_address.split(',')[0] : `${t('citizen.councilDistrict')} ${n.council_district}`} · {relativeTime(n.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-[10px] text-jax-gray-3 italic">
              {t('citizen.neighborhoodFooter1')} {district}.
            </div>
          </div>

          {/* Knowledge / FAQs */}
          <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-jax-blue" /> {t('citizen.helpfulArticles')}
            </h3>
            <ul className="space-y-2">
              {articles.map(a => (
                <li key={a.id}>
                  <button className="w-full text-left p-2 -mx-2 rounded hover:bg-jax-blue/5 transition">
                    <div className="text-sm font-medium">{a.title}</div>
                    {a.excerpt && <div className="text-[11px] text-jax-gray-3 line-clamp-2 mt-0.5">{a.excerpt}</div>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick action tiles */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickTile icon={Trash2}        title={t('citizen.tile.waste')}    sub={t('citizen.tile.wasteSub')} />
        <QuickTile icon={Recycle}       title={t('citizen.tile.dumping')}  sub={t('citizen.tile.dumpingSub')} />
        <QuickTile icon={CreditCard}    title={t('citizen.tile.bills')}    sub={t('citizen.tile.billsSub')} href="/me/bills" />
        <QuickTile icon={Phone}         title={t('citizen.tile.call')}     sub={t('citizen.tile.callSub')} href="tel:9046302489" />
      </div>
    </div>
  )
}

function Pill({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'success' }) {
  const c = tone === 'success' ? 'bg-jax-success/15 text-jax-success' : 'bg-jax-blue/15 text-jax-blue'
  return (
    <div className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${c}`}>
      <span className="text-base font-bold">{value}</span>
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
    </div>
  )
}

function Field({ icon: Icon, label, sub }: { icon?: React.ComponentType<{ className?: string }>; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-jax-blue mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{label}</div>
        {sub && <div className="text-[11px] text-jax-gray-3 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 ${statusTone(status as never)}`}>{status.replace('_',' ')}</span>
}

function StatusDot({ status }: { status: string }) {
  const c = ['resolved','closed'].includes(status) ? 'bg-jax-success' :
            ['assigned','in_progress'].includes(status) ? 'bg-jax-warn' :
            'bg-jax-blue'
  return <span className={`h-1.5 w-1.5 mt-1.5 rounded-full ${c} shrink-0`} />
}

function QuickTile({ icon: Icon, title, sub, href }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string; href?: string }) {
  const inner = (
    <>
      <Icon className="h-5 w-5 text-jax-blue mb-2 group-hover:scale-110 transition-transform" />
      <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: title }} />
      <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">{sub}</div>
    </>
  )
  const cls = "w-full text-left p-4 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg hover:border-jax-blue/60 transition group block"
  return href
    ? <a href={href} className={cls}>{inner}</a>
    : <button className={cls}>{inner}</button>
}
