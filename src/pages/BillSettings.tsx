import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Bell, BellOff, Check, CreditCard, Loader2, Mail,
  RefreshCw, Settings as SettingsIcon, Smartphone, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useT, type StringKey } from '../lib/i18n'
import { type BillKind, billKindKey, kindColor } from '../lib/billsHelpers'

const ALL_KINDS: BillKind[] = [
  'property_tax','business_tax','utility','stormwater','parking_ticket',
  'traffic_citation','red_light_camera','ambulance','code_violation',
  'building_permit','dog_tag','parks_permit','other_fee',
]

interface AutopayRule {
  id: string
  citizen_id: string
  kind: BillKind
  payment_method_id: string | null
  days_before_due: number
  max_amount_cents: number | null
  enabled: boolean
}

interface ReminderSub {
  id: string
  citizen_id: string
  kind: BillKind
  email_enabled: boolean
  sms_enabled: boolean
  days_before_due: number
}

interface PaymentMethod {
  id: string
  citizen_id: string
  kind: string
  brand: string | null
  last4: string | null
  nickname: string | null
  is_default: boolean
}

export function BillSettings() {
  const { user } = useAuth()
  const t = useT()
  const [autopay, setAutopay] = useState<Record<string, AutopayRule>>({})
  const [reminders, setReminders] = useState<Record<string, ReminderSub>>({})
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [activeKinds, setActiveKinds] = useState<Set<BillKind>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingKind, setSavingKind] = useState<BillKind | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const [aR, rR, mR, bR] = await Promise.all([
      supabase.from('autopay_rules').select('*').eq('citizen_id', user.id),
      supabase.from('reminder_subscriptions').select('*').eq('citizen_id', user.id),
      supabase.from('payment_methods').select('*').eq('citizen_id', user.id).order('is_default', { ascending: false }),
      supabase.from('citizen_bills').select('kind').eq('citizen_id', user.id),
    ])
    const aMap: Record<string, AutopayRule> = {}
    ;(aR.data as AutopayRule[] ?? []).forEach(r => { aMap[r.kind] = r })
    const rMap: Record<string, ReminderSub> = {}
    ;(rR.data as ReminderSub[] ?? []).forEach(r => { rMap[r.kind] = r })
    setAutopay(aMap)
    setReminders(rMap)
    setMethods((mR.data as PaymentMethod[]) ?? [])
    setActiveKinds(new Set(((bR.data as Array<{ kind: BillKind }>) ?? []).map(b => b.kind)))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function pushToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  async function upsertAutopay(kind: BillKind, patch: Partial<AutopayRule>) {
    if (!user) return
    setSavingKind(kind)
    try {
      const existing = autopay[kind]
      const row = {
        citizen_id: user.id, kind,
        enabled: patch.enabled ?? existing?.enabled ?? true,
        days_before_due: patch.days_before_due ?? existing?.days_before_due ?? 3,
        payment_method_id: patch.payment_method_id !== undefined ? patch.payment_method_id : (existing?.payment_method_id ?? null),
        max_amount_cents: patch.max_amount_cents ?? existing?.max_amount_cents ?? null,
      }
      const { error } = await supabase.from('autopay_rules').upsert(row, { onConflict: 'citizen_id,kind' })
      if (error) throw error
      pushToast(t('settings.savedToast'))
      await load()
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Save failed')
    } finally { setSavingKind(null) }
  }

  async function upsertReminder(kind: BillKind, patch: Partial<ReminderSub>) {
    if (!user) return
    setSavingKind(kind)
    try {
      const existing = reminders[kind]
      const row = {
        citizen_id: user.id, kind,
        email_enabled: patch.email_enabled ?? existing?.email_enabled ?? true,
        sms_enabled:   patch.sms_enabled   ?? existing?.sms_enabled   ?? false,
        days_before_due: patch.days_before_due ?? existing?.days_before_due ?? 7,
      }
      const { error } = await supabase.from('reminder_subscriptions').upsert(row, { onConflict: 'citizen_id,kind' })
      if (error) throw error
      pushToast(t('settings.savedToast'))
      await load()
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Save failed')
    } finally { setSavingKind(null) }
  }

  const visibleKinds = useMemo(() => {
    if (showAll) return ALL_KINDS
    const a = ALL_KINDS.filter(k => activeKinds.has(k) || autopay[k] || reminders[k])
    return a.length === 0 ? ALL_KINDS : a
  }, [showAll, activeKinds, autopay, reminders])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <Link to="/me/bills" className="inline-flex items-center gap-1 text-sm text-jax-blue hover:text-jax-sky mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('settings.backToBills')}
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-jax-blue" /> {t('settings.title')}
        </h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Payment methods strip */}
      <div className="mb-6 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-jax-blue" /> {t('settings.method')}
        </h2>
        {methods.length === 0 ? (
          <p className="text-xs text-jax-gray-3 italic">{t('settings.noMethods')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {methods.map(m => (
              <li key={m.id} className="px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-blue/30 text-xs flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-jax-blue" />
                <span className="font-medium">{m.brand || 'Card'}</span>
                <span className="font-mono text-jax-gray-3">·{m.last4 || '????'}</span>
                {m.is_default && <span className="text-[10px] uppercase tracking-wider text-jax-success font-semibold">default</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Show-all toggle */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-jax-gray-3 font-semibold">Per bill type</h2>
        <button onClick={() => setShowAll(s => !s)}
          className="text-xs text-jax-blue hover:text-jax-sky inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          {showAll ? t('settings.activeOnly') : t('settings.allKinds')}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-jax-gray-3"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {visibleKinds.map(k => (
            <KindCard
              key={k}
              kind={k}
              autopay={autopay[k]}
              reminder={reminders[k]}
              methods={methods}
              saving={savingKind === k}
              t={t}
              onAutopay={(patch) => upsertAutopay(k, patch)}
              onReminder={(patch) => upsertReminder(k, patch)}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-md bg-jax-success text-white text-sm font-medium shadow-lg inline-flex items-center gap-2">
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}
    </div>
  )
}

function KindCard({
  kind, autopay, reminder, methods, saving, t, onAutopay, onReminder,
}: {
  kind: BillKind
  autopay: AutopayRule | undefined
  reminder: ReminderSub | undefined
  methods: PaymentMethod[]
  saving: boolean
  t: (k: StringKey) => string
  onAutopay: (patch: Partial<AutopayRule>) => void
  onReminder: (patch: Partial<ReminderSub>) => void
}) {
  const apEnabled = autopay?.enabled ?? false
  const rmEmail   = reminder?.email_enabled ?? false
  const rmSms     = reminder?.sms_enabled ?? false
  const apDays = autopay?.days_before_due ?? 3
  const rmDays = reminder?.days_before_due ?? 7

  return (
    <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-jax-gray-1 dark:border-jax-blue/15 bg-jax-light/40 dark:bg-jax-navy-deep/60">
        <span className="w-1 h-6 rounded shrink-0" style={{ background: kindColor(kind) }} />
        <h3 className="text-sm font-semibold flex-1">{t(billKindKey(kind))}</h3>
        <div className="flex gap-1.5">
          {apEnabled && <Chip icon={Zap} label={t('settings.autopayChip')} tone="success" />}
          {(rmEmail || rmSms) && <Chip icon={Bell} label={t('settings.reminderChip')} tone="blue" />}
        </div>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-jax-gray-3" />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-jax-gray-1 dark:divide-jax-blue/15">
        {/* Autopay column */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold flex items-center gap-1.5"><Zap className="h-3 w-3 text-jax-blue" /> {t('settings.autopayHeader')}</div>
              <div className="text-[10px] text-jax-gray-3 mt-0.5 max-w-xs leading-snug">{t('settings.autopaySub')}</div>
            </div>
            <Toggle value={apEnabled} onChange={v => onAutopay({ enabled: v })} />
          </div>
          {apEnabled && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">{t('settings.method')}</div>
                <select
                  value={autopay?.payment_method_id || ''}
                  onChange={e => onAutopay({ payment_method_id: e.target.value || null })}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none">
                  <option value="">-- {t('settings.pickMethod')} --</option>
                  {methods.map(m => (
                    <option key={m.id} value={m.id}>{m.brand || 'Card'} ·{m.last4 || '????'}</option>
                  ))}
                </select>
              </div>
              <DaysSlider value={apDays} onChange={v => onAutopay({ days_before_due: v })} min={1} max={14} t={t} />
            </>
          )}
        </div>

        {/* Reminders column */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold flex items-center gap-1.5"><Bell className="h-3 w-3 text-jax-blue" /> {t('settings.remindersHeader')}</div>
              <div className="text-[10px] text-jax-gray-3 mt-0.5 max-w-xs leading-snug">{t('settings.remindersSub')}</div>
            </div>
            {!rmEmail && !rmSms && <BellOff className="h-3.5 w-3.5 text-jax-gray-3" />}
          </div>
          <div className="space-y-2">
            <Channel icon={Mail}      label={t('settings.email')} value={rmEmail} onChange={v => onReminder({ email_enabled: v })} />
            <Channel icon={Smartphone} label={t('settings.sms')}   value={rmSms}   onChange={v => onReminder({ sms_enabled: v })} />
          </div>
          {(rmEmail || rmSms) && (
            <DaysSlider value={rmDays} onChange={v => onReminder({ days_before_due: v })} min={1} max={30} t={t} />
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="shrink-0">
      {value ? <ToggleRight className="h-6 w-6 text-jax-success" /> : <ToggleLeft className="h-6 w-6 text-jax-gray-3" />}
    </button>
  )
}

function Channel({ icon: Icon, label, value, onChange }: { icon: React.ComponentType<{ className?: string }>; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-full px-3 py-2 rounded-md border text-xs font-medium flex items-center justify-between transition ${
        value ? 'border-jax-success/50 bg-jax-success/10 text-jax-success' : 'border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 text-jax-gray-4 dark:text-jax-gray-2'
      }`}>
      <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="text-[10px] uppercase tracking-wider">{value ? 'on' : 'off'}</span>
    </button>
  )
}

function DaysSlider({ value, onChange, min, max, t }: { value: number; onChange: (v: number) => void; min: number; max: number; t: (k: StringKey) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">{t('settings.daysBeforeDue')}</span>
        <span className="text-xs font-mono font-semibold">{value}d</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-jax-blue" />
    </div>
  )
}

function Chip({ icon: Icon, label, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; tone: 'success' | 'blue' }) {
  const c = tone === 'success' ? 'bg-jax-success/15 text-jax-success' : 'bg-jax-blue/15 text-jax-blue'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${c}`}>
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  )
}
