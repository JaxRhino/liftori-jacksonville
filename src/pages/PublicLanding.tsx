import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare, Video, Zap, Map, Headphones, ShieldCheck, Search } from 'lucide-react'
import { useT, type StringKey } from '../lib/i18n'

interface Pillar {
  icon: React.ComponentType<{ className?: string }>
  titleKey: StringKey
  bodyKey: StringKey
}

const PILLARS: Pillar[] = [
  { icon: MessageSquare, titleKey: 'landing.pillar1.t', bodyKey: 'landing.pillar1.b' },
  { icon: Video,         titleKey: 'landing.pillar2.t', bodyKey: 'landing.pillar2.b' },
  { icon: Zap,           titleKey: 'landing.pillar3.t', bodyKey: 'landing.pillar3.b' },
  { icon: Search,        titleKey: 'landing.pillar4.t', bodyKey: 'landing.pillar4.b' },
  { icon: Map,           titleKey: 'landing.pillar5.t', bodyKey: 'landing.pillar5.b' },
  { icon: Headphones,    titleKey: 'landing.pillar6.t', bodyKey: 'landing.pillar6.b' },
  { icon: ShieldCheck,   titleKey: 'landing.pillar7.t', bodyKey: 'landing.pillar7.b' },
]

export function PublicLanding() {
  const t = useT()
  return (
    <div className="bg-jax-light dark:bg-jax-ink text-jax-ink dark:text-jax-light">
      <section className="bg-gradient-to-br from-jax-navy via-jax-navy-deep to-jax-ink text-jax-light">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jax-blue/20 border border-jax-blue/40 text-xs uppercase tracking-widest mb-6">
              <span className="h-2 w-2 rounded-full bg-jax-gold animate-pulse" /> {t('landing.demoBadge')}
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-4">
              {t('landing.heroTitle1')} <span className="text-jax-gold">{t('landing.heroTitleHighlight')}</span>{t('landing.heroTitle2')}
            </h1>
            <p className="text-lg sm:text-xl text-jax-sky/90 mb-8 leading-relaxed">
              {t('landing.heroBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-jax-gold text-jax-ink font-semibold hover:bg-jax-gold/90 transition">
                {t('landing.signinDemo')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-jax-sky/50 hover:bg-jax-blue/20 transition">
                {t('landing.createCitizen')}
              </Link>
              <Link to="/transparency" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-jax-sky/50 hover:bg-jax-blue/20 transition">
                {t('landing.viewTransparency')}
              </Link>
            </div>
            <p className="text-xs text-jax-sky/70 mt-6">
              {t('landing.demoNote')}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-3xl mb-12">
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-3">{t('landing.what1')}</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.what2')}</h2>
          <p className="text-lg text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed">
            {t('landing.what3')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="p-6 rounded-lg bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 hover:border-jax-blue/60 transition">
              <Icon className="h-6 w-6 text-jax-blue mb-3" />
              <h3 className="font-semibold mb-2">{t(titleKey)}</h3>
              <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-jax-navy text-jax-light">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="text-xs uppercase tracking-widest text-jax-gold mb-3">{t('landing.quoteLabel')}</div>
          <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug mb-6">
            {t('landing.quote')}
          </blockquote>
          <p className="text-sm text-jax-sky">
            {t('landing.quoteTagline')}
          </p>
        </div>
      </section>
    </div>
  )
}
