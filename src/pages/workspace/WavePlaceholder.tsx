import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

interface Props {
  badge: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  oneLiner: string
  whatItDoes: string[]
  whyItMatters: string
  shipsWith?: string
}

export function WavePlaceholder({ badge, title, icon: Icon, oneLiner, whatItDoes, whyItMatters, shipsWith }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/work" className="inline-flex items-center gap-1 text-sm text-jax-blue hover:text-jax-sky mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to agent desktop
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-jax-blue/15 text-jax-blue mb-4">
          <Icon className="h-8 w-8" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jax-warn/15 text-jax-warn text-xs font-mono uppercase tracking-widest mb-3">
          <Sparkles className="h-3 w-3" /> Wave {badge} · shipping next
        </div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-base text-jax-gray-4 dark:text-jax-gray-2 mt-2 max-w-xl mx-auto">{oneLiner}</p>
      </div>

      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-6 mb-4">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-jax-blue mb-3">What this will do</h2>
        <ul className="space-y-2">
          {whatItDoes.map(line => (
            <li key={line} className="flex items-start gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-jax-blue mt-0.5 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-jax-blue mb-3">Why it's in the workspace</h2>
        <p className="text-sm leading-relaxed text-jax-gray-4 dark:text-jax-gray-2">{whyItMatters}</p>
        {shipsWith && (
          <div className="mt-4 pt-3 border-t border-jax-gray-1 dark:border-jax-blue/20 text-xs text-jax-gray-3 italic">
            Ships in Wave {shipsWith}.
          </div>
        )}
      </div>
    </div>
  )
}
