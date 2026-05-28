import { useMemo, useState } from 'react'
import {
  Check, CreditCard, Loader2, Printer, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLanguage, useT } from '../lib/i18n'
import {
  type CitizenBill, type BillKind, formatMoney, SOURCE_LABELS,
} from '../lib/billsHelpers'

interface Props {
  bills: CitizenBill[]
  /** When set, payment is taken on behalf of a citizen (CSR phone payment). */
  operatorMode?: boolean
  onClose: () => void
  onPaid: () => void
}

type Phase = 'form' | 'processing' | 'success'

export function PaymentDialog({ bills, operatorMode, onClose, onPaid }: Props) {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const locale = lang === 'es' ? 'es-US' : undefined
  const t = useT()
  const [phase, setPhase] = useState<Phase>('form')
  const [number, setNumber] = useState('4242 4242 4242 4242')
  const [exp, setExp] = useState('12 / 30')
  const [cvc, setCvc] = useState('123')
  const [zip, setZip] = useState('32202')
  const [receipt, setReceipt] = useState<{ receipt_number: string; payment_id: string; amount_cents: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subtotal = useMemo(() => bills.reduce((s, b) => s + (b.amount_cents), 0), [bills])
  const fees     = useMemo(() => bills.reduce((s, b) => s + (b.fee_cents),    0), [bills])
  const total    = subtotal + fees
  const last4    = number.replace(/\D/g, '').slice(-4)

  async function pay() {
    setPhase('processing')
    setError(null)
    try {
      // Faux Stripe-style latency for realism
      await new Promise(r => setTimeout(r, 1100))
      const { data, error } = await supabase.rpc('citypay_pay_bills', {
        p_bill_ids: bills.map(b => b.id),
        p_method: 'card',
        p_card_last4: last4 || '4242',
        p_card_brand: 'visa',
        p_operator_id: operatorMode ? (user?.id ?? null) : null,
        p_notes: operatorMode ? 'Phone payment via CityPay operator console' : null,
      })
      if (error) throw error
      const d = data as { receipt_number: string; payment_id: string; amount_cents: number }
      setReceipt(d)
      setPhase('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
      setPhase('form')
    }
  }

  function printReceipt() { window.print() }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 print:bg-white print:p-0" onClick={phase !== 'processing' ? onClose : undefined}>
      <div className="bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto print:max-w-none print:shadow-none print:rounded-none print:max-h-none" onClick={e => e.stopPropagation()}>

        {phase !== 'success' && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20 sticky top-0 bg-white dark:bg-jax-navy-deep z-10 print:hidden">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-jax-blue" /> {t('pay.title')}
            </h2>
            <button onClick={onClose} disabled={phase === 'processing'}
              className="p-1 rounded hover:bg-jax-blue/10 disabled:opacity-50"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-6 print:block">
          {/* SUMMARY pane */}
          <section className="md:col-span-3 space-y-3">
            <h3 className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">{t('pay.summary')}</h3>
            <ul className="divide-y divide-jax-gray-1 dark:divide-jax-blue/15 rounded border border-jax-gray-1 dark:border-jax-blue/20 overflow-hidden">
              {bills.map(b => {
                const src = b.source_system && SOURCE_LABELS[b.source_system]
                return (
                  <li key={b.id} className="px-4 py-3 bg-white dark:bg-jax-navy-deep/40">
                    <div className="flex items-start gap-3">
                      <KindChip kind={b.kind} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{b.subject}</div>
                        <div className="text-[11px] text-jax-gray-3 mt-0.5 truncate">
                          {src ? src.label : (b.source_system || 'City of Jacksonville')}
                          {b.source_ref && <> · <code className="font-mono">{b.source_ref}</code></>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold">{formatMoney(b.total_cents, locale)}</div>
                        {b.fee_cents > 0 && <div className="text-[10px] text-jax-gray-3">+{formatMoney(b.fee_cents, locale)} fee</div>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-1 text-sm pt-2 border-t border-jax-gray-1 dark:border-jax-blue/15">
              <Row label={t('pay.subtotal')}    value={formatMoney(subtotal, locale)} />
              <Row label={t('pay.serviceFee')}  value={formatMoney(fees, locale)} />
              <Row label={t('bills.total')}     value={formatMoney(total, locale)} bold />
            </div>

            <div className="rounded p-2.5 bg-jax-success/10 border border-jax-success/30 text-jax-success text-[11px] font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('pay.replaces')}
            </div>
          </section>

          {/* PAYMENT pane */}
          {phase !== 'success' ? (
            <section className="md:col-span-2 space-y-3 print:hidden">
              <h3 className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold">{t('pay.cardNumber')}</h3>
              <input value={number} onChange={e => setNumber(e.target.value)}
                className="w-full px-3 py-2.5 text-base font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">{t('pay.expiry')}</div>
                  <input value={exp} onChange={e => setExp(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">{t('pay.cvc')}</div>
                  <input value={cvc} onChange={e => setCvc(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-jax-gray-3 font-semibold mb-1">{t('pay.zip')}</div>
                  <input value={zip} onChange={e => setZip(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
                </div>
              </div>
              <div className="text-[10px] text-jax-gray-3 italic">{t('pay.demoNotice')}</div>

              {error && <div className="px-3 py-2 rounded bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-xs">{error}</div>}

              <button onClick={pay} disabled={phase === 'processing'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-md bg-jax-success text-white font-semibold hover:bg-jax-success/90 transition disabled:opacity-50">
                {phase === 'processing' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t('pay.processing')}</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> {t('pay.payNow')} · {formatMoney(total, locale)}</>
                )}
              </button>
              <button onClick={onClose} disabled={phase === 'processing'}
                className="w-full px-4 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-blue/30 hover:bg-jax-blue/5 transition disabled:opacity-50">
                {t('pay.cancel')}
              </button>
            </section>
          ) : (
            /* Success / receipt */
            <section className="md:col-span-2 space-y-3">
              <div className="rounded-lg p-4 bg-gradient-to-br from-jax-success/15 to-jax-blue/15 border border-jax-success/40 text-center">
                <div className="h-12 w-12 mx-auto rounded-full bg-jax-success text-white flex items-center justify-center mb-2">
                  <Check className="h-7 w-7" />
                </div>
                <div className="text-base font-bold">{t('pay.success')}</div>
                <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-1">{t('pay.thanks')}</div>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label={t('pay.receiptNumber')} value={receipt!.receipt_number} />
                <Row label={t('pay.cardLast4')}     value={`Visa · ${last4 || '4242'}`} />
                <Row label={t('bills.total')}       value={formatMoney(receipt!.amount_cents, locale)} bold />
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={printReceipt}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-jax-gray-2 dark:border-jax-blue/30 text-xs font-medium hover:bg-jax-blue/5 transition">
                  <Printer className="h-3.5 w-3.5" /> {t('pay.printReceipt')}
                </button>
                <button onClick={() => { onPaid(); onClose() }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-jax-navy text-jax-light text-xs font-medium hover:bg-jax-blue transition">
                  <Sparkles className="h-3.5 w-3.5" /> {t('pay.done')}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Printable footer */}
        {phase === 'success' && (
          <div className="hidden print:block px-6 py-4 text-xs text-jax-gray-4 border-t border-jax-gray-1">
            City of Jacksonville · Powered by Liftori CityPay · {t('pay.replaces')}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'pt-1.5 border-t border-jax-gray-1 dark:border-jax-blue/15' : ''}`}>
      <span className={`text-xs ${bold ? 'font-semibold text-jax-ink dark:text-jax-light' : 'text-jax-gray-4 dark:text-jax-gray-2'}`}>{label}</span>
      <span className={`font-mono ${bold ? 'text-sm font-bold' : 'text-xs'}`}>{value}</span>
    </div>
  )
}

function KindChip({ kind }: { kind: BillKind }) {
  return (
    <span className="inline-flex items-center justify-center h-7 w-1.5 rounded-sm shrink-0"
      style={{ background: kindColorMap[kind] }} />
  )
}
const kindColorMap: Record<BillKind, string> = {
  property_tax:'#0B2D55', business_tax:'#1E5BC6', utility:'#047857', stormwater:'#0E7490',
  parking_ticket:'#B91C1C', traffic_citation:'#B91C1C', red_light_camera:'#7E22CE',
  ambulance:'#7F1D1D', code_violation:'#D97706', building_permit:'#0B2D55',
  dog_tag:'#D4A437', parks_permit:'#047857', other_fee:'#697586',
}

// satisfy ts
export type { BillKind as _Reexport }
