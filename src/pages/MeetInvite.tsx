import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Loader2, MapPin, Sparkles, Users, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { VideoHuddleModal } from '../components/VideoHuddleModal'
import { useLanguage, useT } from '../lib/i18n'

interface Meeting {
  id: string
  title: string
  agenda: string | null
  scheduled_at: string | null
  duration_minutes: number | null
  jitsi_room_slug: string
  external_invite_emails: Array<{ name?: string; email: string }>
  external_invite_token: string
}

export function MeetInvite() {
  const { token } = useParams<{ token: string }>()
  const { lang } = useLanguage()
  const t = useT()
  const [m, setM] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data } = await supabase
        .from('video_meetings')
        .select('id, title, agenda, scheduled_at, duration_minutes, jitsi_room_slug, external_invite_emails, external_invite_token')
        .eq('external_invite_token', token)
        .maybeSingle()
      setM(data as Meeting | null)
      setLoading(false)
    })()
  }, [token])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-jax-blue" /></div>
  if (!m) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">{t('meet.inviteNotFound')}</h1>
      <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-4">{t('meet.inviteInvalid')}</p>
      <Link to="/" className="text-jax-blue hover:underline text-sm">{t('trans.backToCityHall')}</Link>
    </div>
  )

  const when = m.scheduled_at ? new Date(m.scheduled_at) : null
  const dial = when && Math.abs(when.getTime() - Date.now()) < 30 * 60_000

  if (joining) {
    return (
      <VideoHuddleModal
        room={m.jitsi_room_slug}
        displayName={name || 'Guest'}
        subject={m.title}
        onLeave={() => setJoining(false)}
      />
    )
  }

  const locale = lang === 'es' ? 'es-US' : undefined

  return (
    <div className="min-h-screen bg-jax-light dark:bg-jax-ink">
      <header className="bg-jax-navy text-jax-light py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Video className="h-5 w-5 text-jax-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-jax-sky">{t('meet.cityOfJacksonville')}</div>
            <div className="text-sm font-semibold">{t('meet.invite')}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jax-blue/10 text-jax-blue text-xs uppercase tracking-widest mb-3">
            <Sparkles className="h-3 w-3" /> {t('meet.invited')}
          </div>
          <h1 className="text-3xl font-bold mb-2">{m.title}</h1>
          {when && (
            <div className="flex items-center gap-1.5 text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-1">
              <CalendarClock className="h-4 w-4 text-jax-blue" />
              {when.toLocaleString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {m.duration_minutes && ` · ${m.duration_minutes} ${t('meet.minutes')}`}
              {dial && <span className="ml-2 text-jax-success font-semibold uppercase tracking-wider text-[10px]">{t('meet.startsSoon')}</span>}
            </div>
          )}

          {m.agenda && (
            <div className="mt-5 p-4 rounded bg-jax-light/50 dark:bg-jax-navy-deep/60 border border-jax-gray-1 dark:border-jax-blue/20">
              <div className="text-[10px] uppercase tracking-widest text-jax-gray-3 mb-1">{t('meet.agenda')}</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.agenda}</p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2 flex items-center gap-1 mb-1">
                <Users className="h-3 w-3" /> {t('meet.yourName')}
              </div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('meet.namePlaceholder')}
                className="w-full px-3 py-2.5 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none"
              />
            </label>
            <button
              onClick={() => setJoining(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-jax-success text-white font-semibold hover:bg-jax-success/90 transition"
            >
              <Video className="h-4 w-4" /> {t('meet.joinMeeting')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-jax-gray-3">
          <MapPin className="inline h-3 w-3 mr-1" /> {t('meet.hostedBy')}
        </div>
      </main>
    </div>
  )
}
