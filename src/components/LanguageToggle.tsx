import { Globe } from 'lucide-react'
import { useLanguage } from '../lib/i18n'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  const next = lang === 'en' ? 'es' : 'en'
  return (
    <button
      onClick={() => setLang(next)}
      title={lang === 'en' ? 'Cambiar a Espanol' : 'Switch to English'}
      aria-label={lang === 'en' ? 'Cambiar a Espanol' : 'Switch to English'}
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-jax-blue/40 hover:bg-jax-blue/20 transition text-xs font-medium"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="font-mono uppercase">{lang}</span>
    </button>
  )
}
