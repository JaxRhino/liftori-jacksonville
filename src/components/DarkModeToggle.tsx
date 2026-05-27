import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export function DarkModeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      className="p-2 rounded-md border border-jax-blue/40 hover:bg-jax-blue/20 transition"
    >
      {theme === 'dark'
        ? <Sun className="h-4 w-4 text-jax-gold" />
        : <Moon className="h-4 w-4 text-jax-sky" />}
    </button>
  )
}
