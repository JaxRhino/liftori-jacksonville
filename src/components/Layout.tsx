import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usePresence } from '../lib/usePresence'
import { DarkModeToggle } from './DarkModeToggle'
import { LanguageToggle } from './LanguageToggle'
import { JaxSeal } from './JaxSeal'
import { CommandPalette } from './CommandPalette'
import { NotificationsBell } from './NotificationsBell'
import { useT } from '../lib/i18n'

export function Layout() {
  const { user, profile, role, signOut } = useAuth()
  const nav = useNavigate()
  const t = useT()
  usePresence()

  async function handleSignOut() {
    await signOut()
    nav('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-jax-navy text-jax-light shadow-md dark:bg-jax-navy-deep dark:border-b dark:border-jax-blue/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <JaxSeal className="h-9 w-9 text-jax-gold group-hover:scale-105 transition-transform" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide uppercase">{t('header.cityOfJacksonville')}</span>
              <span className="text-[11px] text-jax-sky uppercase tracking-widest">{t('header.poweredByLiftori')}</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <DarkModeToggle />
            {user && <NotificationsBell />}
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-jax-navy-deep/50 border border-jax-blue/30">
                  <User className="h-4 w-4 text-jax-sky" />
                  <div className="text-xs leading-tight">
                    <div className="font-medium">{profile?.display_name || profile?.full_name || user.email}</div>
                    <div className="text-jax-sky uppercase tracking-wider text-[10px]">{role || t('header.citizen')}</div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-jax-blue/40 hover:bg-jax-blue/20 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('header.signOut')}</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="px-3 py-1.5 text-xs font-medium rounded-md bg-jax-blue hover:bg-jax-sky transition">
                {t('header.signIn')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-jax-gray-1 dark:border-jax-gray-4/30 py-4 text-center text-xs text-jax-gray-3">
        <div className="max-w-7xl mx-auto px-4">
          {t('footer.tagline')}
        </div>
      </footer>

      <CommandPalette />
    </div>
  )
}
