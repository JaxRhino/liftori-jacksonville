import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, BarChart3, CheckCircle, Clock, CreditCard, DollarSign,
  Inbox, Loader2, Phone, Receipt, Search, TrendingUp, User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { useLanguage, useT } from '../../lib/i18n'
import {
  type CitizenBill, type CitizenLite, billKindKey, billStatusKey, formatMoney,
  statusTone, kindColor, dueLabel, daysUntil, isPayable,
} from '../../lib/billsHelpers'
import { PaymentDialog } from '../../components/PaymentDialog'

type Tab = 'aging' | 'bills' | 'payments'

interface PaymentRow {
  id: string
  receipt_number: string
  citizen_id: string | null
  operator_id: string | null
  amount_cents: number
  method: string
  card_last4: string | null
  card_brand: string | null
  status: string
  created_at: string
  notes: string | null
}

export function FinancePage() {

  const { lang } = useLanguage()
  const locale = lang === 'es' ? 'es-US' : undefined
  const t = useT()

  const [tab, setTab] = useState<Tab>('aging')
  const [bills, setBills] = useState<CitizenBill[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [citizens, setCitizens] = useState<CitizenLite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phoneCitizen, setPhoneCitizen] = useState<CitizenLite | null>(null)
  const [phonePaying, setPhonePaying] = useState<CitizenBill[] | null>(null)
  const [phoneSelected, setPhoneSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [bR, pR, cR] = await Promise.all([
      supabase.from('citizen_bills').select('*').order('due_at', { ascending: true, nullsFirst: false }).limit(500),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, full_name, display_name, email').eq('role', 'citizen').order('full_name'),
    ])
    setBills((bR.data as CitizenBill[]) ?? [])
    setPayments((pR.data as PaymentRow[]) ?? [])
    setCitizens((cR.data as CitizenLite[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  useRealtime('citizen_bills', load)
  useRealtime('payments', load)

  const citizenById = useMemo(() => {
    const m: Record<string, CitizenLite> = {}
    citizens.forEach(c => { m[c.id] = c })
    return m
  }, [citizens])

  const openBills = useMemo(() => bills.filter(isPayable), [bills])
  const totalOpen   = useMemo(() => openBills.reduce((s, b) => s + (b.total_cents - b.paid_cents), 0), [openBills])
  const totalPaid30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000
    return payments.filter(p => p.status === 'succeeded' && new Date(p.created_at).getTime() >= cutoff).reduce((s, p) => s + p.amount_cents, 0)
  }, [payments])

  // aging buckets
  const aging = useMemo(() => {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0 }
    openBills.forEach(b => {
      const dl = daysUntil(b.due_at) ?? 0
      const owed = b.total_cents - b.paid_cents
      if (dl >= 0) buckets.current += owed
      else if (dl >= -30) buckets.d30 += owed
      else if (dl >= -60) buckets.d60 += owed
      else buckets.d90 += owed
    })
    return buckets
  }, [openBills])

  // aging by kind
  const agingByKind = useMemo(() => {
    const map: Record<string, { count: number; total: number; overdue: number }> = {}
    openBills.forEach(b => {
      const row = map[b.kind] ??= { count: 0, total: 0, overdue: 0 }
      row.count += 1
      row.total += b.total_cents - b.paid_cents
      if (b.status === 'overdue' || b.status === 'in_collections') row.overdue += b.total_cents - b.paid_cents
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [openBills])

  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills
    const q = search.toLowerCase()
    return bills.filter(b => {
      const c = b.citizen_id ? citizenById[b.citizen_id] : null
      return (
        b.subject.toLowerCase().includes(q) ||
        b.ticket_number.toLowerCase().includes(q) ||
        (b.source_ref?.toLowerCase().includes(q)) ||
        (c?.full_name?.toLowerCase().includes(q)) ||
        (c?.email.toLowerCase().includes(q))
      )
    })
  }, [bills, search, citizenById])

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments
    const q = search.toLowerCase()
    return payments.filter(p => {
      const c = p.citizen_id ? citizenById[p.citizen_id] : null
      return (
        p.receipt_number.toLowerCase().includes(q) ||
        (c?.full_name?.toLowerCase().includes(q)) ||
        (c?.email.toLowerCase().includes(q))
      )
    })
  }, [payments, search, citizenById])

  // phone-pay flow
  const phoneCitizenBills = useMemo(
    () => phoneCitizen ? openBills.filter(b => b.citizen_id === phoneCitizen.id) : [],
    [phoneCitizen, openBills],
  )
  const phoneSelectedBills = useMemo(
    () => phoneCitizenBills.filter(b => phoneSelected.has(b.id)),
    [phoneCitizenBills, phoneSelected],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/work" className="inline-flex items-center gap-1 text-xs text-jax-blue hover:text-jax-sky mb-1">
            <ArrowLeft className="h-3 w-3" /> Back to agent desktop
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-jax-blue" /> {t('finance.title')}
          </h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">{t('finance.subtitle')}</p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Inbox}      tone="blue"    label="Open balance"        value={formatMoney(totalOpen, locale)}    sub={`${openBills.length} bills`} />
        <StatCard icon={Clock}      tone="warn"    label="Current (not yet due)" value={formatMoney(aging.current, locale)} sub="due in future" />
        <StatCard icon={AlertTriangle} tone="danger" label="Overdue"          value={formatMoney(aging.d30 + aging.d60 + aging.d90, locale)} sub={`${openBills.filter(b => (daysUntil(b.due_at) ?? 0) < 0).length} late`} />
        <StatCard icon={TrendingUp} tone="success" label="Collected (30d)"     value={formatMoney(totalPaid30, locale)}  sub={`${payments.filter(p => p.status === 'succeeded' && new Date(p.created_at).getTime() >= Date.now() - 30*86400000).length} payments`} />
      </div>

      {/* CSR phone-pay card */}
      <div className="mb-6 rounded-lg p-5 bg-gradient-to-br from-jax-blue/10 via-jax-navy/10 to-jax-navy-deep/10 border border-jax-blue/30">
        <h2 className="font-semibold flex items-center gap-2 mb-2"><Phone className="h-4 w-4 text-jax-blue" /> CSR phone payment</h2>
        <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mb-3">Citizen on the phone? Look them up, pick the bills they want to pay, take the card over the phone. PCI-compliant tokenization.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={phoneCitizen?.id || ''}
            onChange={e => { const c = citizens.find(x => x.id === e.target.value); setPhoneCitizen(c || null); setPhoneSelected(new Set()) }}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
            <option value="">-- pick citizen --</option>
            {citizens.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
          </select>
        </div>
        {phoneCitizen && (
          <div className="mt-3">
            {phoneCitizenBills.length === 0 ? (
              <div className="text-xs text-jax-gray-3 italic px-2">No open bills for this citizen.</div>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1.5">Open bills · pick any to pay</div>
                <ul className="rounded border border-jax-gray-1 dark:border-jax-blue/20 divide-y divide-jax-gray-1 dark:divide-jax-blue/15">
                  {phoneCitizenBills.map(b => (
                    <li key={b.id} className="px-3 py-2 hover:bg-jax-blue/5 transition flex items-center gap-2">
                      <input type="checkbox" checked={phoneSelected.has(b.id)} onChange={() => {
                        const n = new Set(phoneSelected); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); setPhoneSelected(n)
                      }} className="h-4 w-4 rounded" />
                      <span className="w-1 h-5 rounded" style={{ background: kindColor(b.kind) }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{b.subject}</div>
                        <div className="text-[10px] text-jax-gray-3 truncate">
                          <span className={`px-1 rounded ${statusTone(b.status).bg} ${statusTone(b.status).text}`}>{t(billStatusKey(b.status))}</span>
                          {' · '}{t(billKindKey(b.kind))}
                        </div>
                      </div>
                      <div className="font-mono text-sm font-semibold">{formatMoney(b.total_cents - b.paid_cents, locale)}</div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setPhonePaying(phoneSelectedBills.length > 0 ? phoneSelectedBills : phoneCitizenBills)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-blue text-jax-light font-medium hover:bg-jax-sky transition">
                  <CreditCard className="h-4 w-4" /> Take payment {formatMoney((phoneSelectedBills.length > 0 ? phoneSelectedBills : phoneCitizenBills).reduce((s, b) => s + b.total_cents - b.paid_cents, 0), locale)}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-jax-gray-1 dark:border-jax-blue/20">
        <TabBtn active={tab === 'aging'}    onClick={() => setTab('aging')}    icon={BarChart3} label="Aging by kind" />
        <TabBtn active={tab === 'bills'}    onClick={() => setTab('bills')}    icon={Receipt}   label="All bills" />
        <TabBtn active={tab === 'payments'} onClick={() => setTab('payments')} icon={DollarSign} label="Payments" />
      </div>

      {(tab === 'bills' || tab === 'payments') && (
        <div className="mb-3 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jax-gray-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search citizen, subject, receipt..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-white dark:bg-jax-navy-deep/40 focus:border-jax-blue outline-none" />
        </div>
      )}

      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
        {loading && <div className="p-10 text-center text-jax-gray-3"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}

        {!loading && tab === 'aging' && (
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <AgingTile label="Current"  value={aging.current} locale={locale} tone="blue" />
              <AgingTile label="1-30 days" value={aging.d30}    locale={locale} tone="warn" />
              <AgingTile label="31-60 days" value={aging.d60}   locale={locale} tone="danger" />
              <AgingTile label="60+ days"  value={aging.d90}    locale={locale} tone="danger" />
            </div>
            <h3 className="text-xs uppercase tracking-wider text-jax-gray-3 font-semibold mb-2">By bill kind</h3>
            <ul className="divide-y divide-jax-gray-1 dark:divide-jax-blue/15">
              {agingByKind.map(([kind, agg]) => (
                <li key={kind} className="py-2 flex items-center gap-3">
                  <span className="w-1 h-8 rounded shrink-0" style={{ background: kindColor(kind as never) }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t(billKindKey(kind as never))}</div>
                    <div className="text-[10px] text-jax-gray-3">{agg.count} bills · {formatMoney(agg.overdue, locale)} overdue</div>
                  </div>
                  <div className="text-sm font-mono font-bold tabular-nums">{formatMoney(agg.total, locale)}</div>
                </li>
              ))}
              {agingByKind.length === 0 && <li className="py-6 text-center text-xs italic text-jax-gray-3">All caught up</li>}
            </ul>
          </div>
        )}

        {!loading && tab === 'bills' && (
          <ul className="divide-y divide-jax-gray-1 dark:divide-jax-blue/15">
            {filteredBills.slice(0, 100).map(b => {
              const c = b.citizen_id ? citizenById[b.citizen_id] : null
              const tone = statusTone(b.status)
              return (
                <li key={b.id} className="px-4 py-3 flex items-center gap-3 hover:bg-jax-blue/5 transition">
                  <span className="w-1 h-10 rounded" style={{ background: kindColor(b.kind) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${tone.bg} ${tone.text}`}>{t(billStatusKey(b.status))}</span>
                      <span className="text-[11px] font-mono text-jax-gray-3">{b.ticket_number}</span>
                      <span className="text-[10px] text-jax-gray-3">· {t(billKindKey(b.kind))}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{b.subject}</div>
                    {c && (
                      <div className="text-[11px] text-jax-gray-4 dark:text-jax-gray-2 flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" /> {c.full_name || c.email}
                        {b.due_at && <> · {t('bills.due')} {dueLabel(b, locale)}</>}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold tabular-nums shrink-0">{formatMoney(b.total_cents - b.paid_cents, locale)}</div>
                </li>
              )
            })}
            {filteredBills.length === 0 && <li className="py-10 text-center text-xs italic text-jax-gray-3">No bills match</li>}
            {filteredBills.length > 100 && <li className="py-2 text-center text-[10px] italic text-jax-gray-3">+ {filteredBills.length - 100} more — refine search</li>}
          </ul>
        )}

        {!loading && tab === 'payments' && (
          <ul className="divide-y divide-jax-gray-1 dark:divide-jax-blue/15">
            {filteredPayments.map(p => {
              const c = p.citizen_id ? citizenById[p.citizen_id] : null
              return (
                <li key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-jax-blue/5 transition">
                  <CheckCircle className="h-4 w-4 text-jax-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{p.receipt_number}</span>
                      {p.operator_id && <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-blue/15 text-jax-blue inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> phone</span>}
                      <span className="text-[10px] text-jax-gray-3">{p.method} {p.card_brand && p.card_last4 ? `· ${p.card_brand} ${p.card_last4}` : ''}</span>
                    </div>
                    <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5 flex items-center gap-1">
                      {c && <><User className="h-3 w-3" /> {c.full_name || c.email}</>} · {new Date(p.created_at).toLocaleString(locale)}
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold tabular-nums shrink-0">{formatMoney(p.amount_cents, locale)}</div>
                </li>
              )
            })}
            {filteredPayments.length === 0 && <li className="py-10 text-center text-xs italic text-jax-gray-3">No payments yet</li>}
          </ul>
        )}
      </div>

      {phonePaying && (
        <PaymentDialog
          bills={phonePaying}
          operatorMode
          onClose={() => setPhonePaying(null)}
          onPaid={() => { setPhoneSelected(new Set()); setPhonePaying(null); load() }}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition ${
        active ? 'border-jax-blue text-jax-blue' : 'border-transparent text-jax-gray-4 dark:text-jax-gray-2 hover:text-jax-blue'
      }`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone: 'blue' | 'warn' | 'danger' | 'success' }) {
  const colors = { blue: 'text-jax-blue', warn: 'text-jax-warn', danger: 'text-jax-danger', success: 'text-jax-success' }
  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${colors[tone]}`} /> {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${colors[tone]}`}>{value}</div>
      <div className="text-[10px] text-jax-gray-3 mt-0.5">{sub}</div>
    </div>
  )
}

function AgingTile({ label, value, locale, tone }: { label: string; value: number; locale?: string; tone: 'blue' | 'warn' | 'danger' }) {
  const colors = { blue: 'text-jax-blue', warn: 'text-jax-warn', danger: 'text-jax-danger' }
  return (
    <div className="rounded-md p-3 border border-jax-gray-1 dark:border-jax-blue/20">
      <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${colors[tone]}`}>{formatMoney(value, locale)}</div>
    </div>
  )
}
