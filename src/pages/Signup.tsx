import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function Signup() {
  const { signUp, user } = useAuth()
  const nav = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (user) { nav('/', { replace: true }); return null }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signUp(email, password, fullName)
    setSubmitting(false)
    if (error) setError(error)
    else setSuccess(true)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-2">Account created</h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-6">
            Check your email for a confirmation link, then sign in to access your citizen dashboard.
          </p>
          <Link to="/login" className="inline-block px-4 py-2 rounded-md bg-jax-navy text-jax-light font-medium hover:bg-jax-blue transition">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Create citizen account</h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-6">
          City employees: please ask your supervisor for an invite link.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">Full Name</span>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
              placeholder="Jane Doe" />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">Email</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
              placeholder="you@example.com" />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-jax-gray-4 dark:text-jax-gray-2">Password</span>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
              placeholder="At least 8 characters" />
          </label>

          {error && (
            <div className="px-3 py-2 rounded-md bg-jax-danger/10 border border-jax-danger/30 text-jax-danger text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-jax-navy text-jax-light font-medium hover:bg-jax-blue transition disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-jax-gray-1 dark:border-jax-gray-4/30 text-sm text-jax-gray-4 dark:text-jax-gray-2">
          Already have an account?{' '}
          <Link to="/login" className="text-jax-blue hover:underline font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
