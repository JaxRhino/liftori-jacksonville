import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Mail, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

export function Login() {
  const { signIn, user } = useAuth()
  const nav = useNavigate()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    nav('/', { replace: true })
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
    } else {
      nav('/', { replace: true })
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">{t('login.title')}</h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-6">
          {t('login.subtitle')}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">{t('login.email')}</span>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jax-gray-3" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">{t('login.password')}</span>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-jax-gray-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
                placeholder="********"
              />
            </div>
          </label>

          {error && (
            <div className="px-3 py-2 rounded-md bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-navy text-jax-light font-medium hover:bg-jax-blue transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('login.submit')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-jax-gray-1 dark:border-jax-gray-4/30 text-sm text-jax-gray-4 dark:text-jax-gray-2">
          {t('login.noAccount')}{' '}
          <Link to="/signup" className="text-jax-blue hover:underline font-medium">{t('login.createOne')}</Link>
        </div>
      </div>
    </div>
  )
}
