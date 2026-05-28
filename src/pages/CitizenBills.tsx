import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, CheckCircle, ChevronRight, Clock,
  CreditCard, FileText, Filter, Loader2, MapPin, Receipt, Settings as SettingsIcon, Sparkles, Zap,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { useLanguage, useT } from '../lib/i18n'
import {
  type CitizenBill, billKindKey, billStatusKey, formatMoney,
  statusTone, kindColor, dueLabel, daysUntil, isPayable, SOURCE_LABELS,
} from '../lib/billsHelpers'
import { PaymentDialog } from '../components/PaymentDialog'

type Filter = 'all' | 'open' | 'paid'

export function CitizenBills() {
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const t = useT()
  const locale = lang === 'es' ? 'es-US' : undefined

  const [bills, setBills] = useState<CitizenBill[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState<CitizenBill[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [autopayKinds, setAutopayKinds] = useState<Set<string>>(new Set())
  const [reminderKinds, setReminderKinds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) return
    const [bR, aR, rR] = await Promise.all([
      supabase.from('citizen_bills').select('*').eq('citizen_id', user.id)
        .order('status', { ascending: true }).order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('autopay_rules').select('kind, enabled').eq('citizen_id', user.id).eq('enabled', true),
      supabase.from('reminder_subscriptions').select('kind, email_enabled, sms_enabled').eq('citizen_id', user.id),
    ])
    setBills((bR.data as CitizenBill[]) ?? [])
    setAutopayKinds(new Set(((aR.data as Array<{ kind: string }>) ?? []).map(r => r.kind)))
    setReminderKinds(new Set(((rR.data as Array<{ kind: string; email_enabled: boolean; sms_enabled: boolean }>) ?? [])
      .filter(r => r.email_enabled || r.sms_enabled).map(r => r.kind)))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])
  useRealtime('citizen_bills', load)

  const filtered = useMemo(() => {
    if (filter === 'paid') return bills.filter(b => b.status === 'paid' || b.status === 'cancelled')
    if (filter === 'open') return bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled')
    return bills
  }, [bills, filter])

  const openBills = useMemo(() => bills.filter(isPayable), [bills])
  const totalOwed = useMemo(() => openBills.reduce((s, b) => s + (b.total_cents - b.paid_cents), 0), [openBills])
  const overdueCount = useMemo(() => bills.filter(b => b.status === 'overdue' || b.status === 'in_collections').length, [bills])

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  const selectedBills = useMemo(() => openBills.filter(b => selected.has(b.id)), [openBills, selected])
  const selectedTotal = useMemo(() => selectedBills.reduce((s, b) => s + b.total_cents, 0), [selectedBills])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/me" className="inline-flex items-center gap-1 text-sm text-jax-blue hover:text-jax-sky mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('intake.back')}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-jax-blue" /> {t('bills.title')}
            </h1>
            <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">{t('bills.subtitle')}</p>
          </div>
          <Link to="/me/bills/settings"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 transition text-xs font-medium">
            <SettingsIcon className="h-3.5 w-3.5" /> {t('bills.settings')}
          </Link>
        </div>
      </div>

      {/* Hero — total owed */}
      <div className="rounded-lg p-5 sm:p-6 mb-6 bg-gradient-to-br from-jax-navy via-jax-navy-deep to-jax-ink text-jax-light relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-jax-gold mb-1">{t('bills.totalOwed')}</div>
            <div className="text-5xl font-bold tracking-tight">{formatMoney(totalOwed, locale)}</div>
            <div className="text-sm text-jax-sky/90 mt-1">
              {openBills.length} {t('bills.openCount')}
              {overdueCount > 0 && <> · <span className="text-jax-red font-semibold">{overdueCount} {t('bills.overdueCount')}</span></>}
            </div>
          </div>
          {openBills.length > 0 && (
            <button onClick={() => setPaying(openBills)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-jax-gold text-jax-ink font-semibold hover:bg-jax-gold/90 transition shadow-lg">
              <Sparkles className="h-4 w-4" /> {t('bills.payAll')} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <Receipt className="absolute top-2 right-2 h-44 w-44 text-jax-blue/15" />
      </div>

      {/* Selection actions */}
      {selectedBills.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-md bg-jax-blue/10 border border-jax-blue/30 flex items-center justify-between text-sm">
          <span className="text-jax-blue font-medium">
            {selectedBills.length} {t('bills.openCount')} · {formatMoney(selectedTotal, locale)}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 rounded border border-jax-blue/30 hover:bg-jax-blue/10 transition">
              {t('pay.cancel')}
            </button>
            <button onClick={() => setPaying(selectedBills)}
              className="text-xs px-3 py-1.5 rounded bg-jax-blue text-jax-light hover:bg-jax-sky transition inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> {t('bills.paySelected')}
            </button>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden">
          {(['open','all','paid'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                filter === f ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/5 text-jax-gray-4 dark:text-jax-gray-2'
              }`}>
              {t(`bills.filter.${f}` as never)}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-jax-gray-3 italic flex items-center gap-1">
          <Filter className="h-3 w-3" /> {filtered.length} {t('bills.openCount')}
        </div>
      </div>

      {/* Bills list */}
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-jax-gray-3"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-jax-success/60 mx-auto mb-3" />
            <p className="text-base font-semibold">{t('bills.allCaughtUp')}</p>
            <p className="text-sm text-jax-gray-3 mt-1">{t('bills.allCaughtUpSub')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-jax-gray-1 dark:divide-jax-blue/15">
            {filtered.map(b => {
              const tone = statusTone(b.status)
              const days = daysUntil(b.due_at)
              const isOpen = isPayable(b)
              const isExpanded = expanded === b.id
              const src = b.source_system ? SOURCE_LABELS[b.source_system] : undefined
              return (
                <li key={b.id} className="hover:bg-jax-light/40 dark:hover:bg-jax-navy-deep/30 transition">
                  <div className="px-4 py-4 sm:px-5 flex items-start gap-3">
                    {/* color strip */}
                    <span className="w-1 self-stretch rounded shrink-0" style={{ background: kindColor(b.kind) }} />

                    {/* checkbox */}
                    {isOpen && (
                      <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleOne(b.id)}
                        className="mt-1.5 h-4 w-4 rounded border-jax-gray-2" />
                    )}

                    {/* primary */}
                    <button onClick={() => setExpanded(isExpanded ? null : b.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${tone.bg} ${tone.text}`}>
                          {t(billStatusKey(b.status))}
                        </span>
                        <span className="text-[11px] font-mono text-jax-gray-3">{b.ticket_number}</span>
                        {autopayKinds.has(b.kind) && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-success/15 text-jax-success inline-flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" /> autopay
                          </span>
                        )}
                        {reminderKinds.has(b.kind) && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-blue/15 text-jax-blue inline-flex items-center gap-0.5">
                            <Bell className="h-2.5 w-2.5" /> reminder
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-[15px] mt-0.5 leading-snug">{b.subject}</div>
                      <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t(billKindKey(b.kind))}</span>
                        {src && <>· <span className="truncate">{src.label}</span></>}
                        {b.due_at && (
                          <>· <Clock className="h-3 w-3 inline" />
                            <span>{t('bills.due')} {dueLabel(b, locale)}</span>
                            {days !== null && isOpen && (
                              <span className={days < 0 ? 'text-jax-red font-semibold' : days <= 7 ? 'text-jax-warn font-semibold' : ''}>
                                ({days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `in ${days}d`})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </button>

                    {/* amount + actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-base font-bold tabular-nums">{formatMoney(b.total_cents - b.paid_cents, locale)}</div>
                      {isOpen ? (
                        <button onClick={() => setPaying([b])}
                          className="text-[11px] font-medium px-3 py-1 rounded-md bg-jax-success text-white hover:bg-jax-success/90 transition inline-flex items-center gap-1">
                          <CreditCard className="h-3 w-3" /> {t('pay.payNow')}
                        </button>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-jax-success font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" /> {t('bills.status.paid')}
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`h-4 w-4 text-jax-gray-3 mt-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pl-12 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {b.description && (
                        <div className="sm:col-span-2 rounded p-3 bg-jax-light/50 dark:bg-jax-navy-deep/50 border border-jax-gray-1 dark:border-jax-blue/15">
                          <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Detail
                          </div>
                          <p className="leading-relaxed text-jax-gray-4 dark:text-jax-gray-2">{b.description}</p>
                        </div>
                      )}
                      <DetailRow label={t('bills.from')} value={src?.label || b.source_system || 'City of Jacksonville'} />
                      <DetailRow label={t('bills.notice')} value={b.source_ref || '—'} mono />
                      <DetailRow label={t('bills.amount')} value={formatMoney(b.amount_cents, locale)} />
                      {b.fee_cents > 0 && <DetailRow label={t('bills.fee')} value={formatMoney(b.fee_cents, locale)} />}
                      {b.service_address && <DetailRow label={<MapPin className="h-3 w-3 inline" />} value={b.service_address} />}
                      {src && (
                        <div className="sm:col-span-2 text-[10px] text-jax-gray-3 italic">
                          Aggregated from <code className="font-mono">{src ? src.replaces : ''}</code> — pay here, no separate login required.
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Stat strip — replaces 12 systems */}
      <div className="mt-6 rounded-lg p-4 bg-jax-success/5 dark:bg-jax-success/10 border border-jax-success/30 text-xs text-jax-gray-4 dark:text-jax-gray-2 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-jax-success mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-jax-success mb-0.5">{profile?.full_name?.split(' ')[0] || 'Citizen'}, this replaces 12 separate payment systems.</div>
          <div>Property tax (Duval Tax Collector), JEA, parking, traffic, ambulance, business tax, building permits, code violations, dog tags, parks permits, red-light camera, and city fees — all in one place. No multiple logins. One receipt. EN/ES.</div>
        </div>
      </div>
      {overdueCount > 0 && (
        <div className="mt-3 rounded-md p-3 bg-jax-warn/5 border border-jax-warn/30 text-xs flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-jax-warn mt-0.5 shrink-0" />
          <span className="text-jax-gray-4 dark:text-jax-gray-2"><strong className="text-jax-warn">Heads up.</strong> Overdue bills accrue late fees. Parking citations route to Penn Credit collections at day 90.</span>
        </div>
      )}

      {paying && (
        <PaymentDialog
          bills={paying}
          onClose={() => setPaying(null)}
          onPaid={() => { setSelected(new Set()); setPaying(null); load() }}
        />
      )}
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: React.ReactNode; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">{label}</div>
      <div className={mono ? 'font-mono' : 'font-medium'}>{value}</div>
    </div>
  )
}
