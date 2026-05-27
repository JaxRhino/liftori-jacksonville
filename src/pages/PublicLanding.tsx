import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare, Video, Zap, Map, Headphones, ShieldCheck, Search } from 'lucide-react'

const PILLARS = [
  { icon: MessageSquare, title: 'Real-time team chat in every case', body: 'No more pivoting to Teams or hallway conversations. Agents @mention coworkers, react with emoji, and resolve cases together inside the case itself.' },
  { icon: Video,         title: 'One-click video calls from any case', body: 'Pull a supervisor into a tricky code-enforcement call. Loop in a field crew on a damaged hydrant. Optional citizen video for visual issues.' },
  { icon: Zap,           title: 'Live updates — no refresh button', body: 'When a field crew updates status from the truck, every agent watching that case sees it within 500 milliseconds. AgentWeb requires manual refresh.' },
  { icon: Search,        title: 'Semantic search across every case', body: '"Flooding on Atlantic Boulevard" finds every related case in milliseconds. Replaces last-name string match with embedding-based intent search.' },
  { icon: Map,           title: 'ArcGIS-native from day one', body: 'Every case geocoded, enriched with council district and service zone, mirrored to maps.coj.net. Public dashboards consume the same feature layer.' },
  { icon: Headphones,    title: 'Mobile agent desktop', body: 'CSRs handle cases from their phone in the field, the break room, or the parking lot. Oracle AgentWeb is desktop-only.' },
  { icon: ShieldCheck,   title: 'Section 508 / WCAG 2.1 AA from day one', body: 'Accessibility isn’t a retrofit. Keyboard navigation, screen-reader labels, color contrast, focus rings — built in.' },
]

export function PublicLanding() {
  return (
    <div className="bg-jax-light dark:bg-jax-ink text-jax-ink dark:text-jax-light">
      <section className="bg-gradient-to-br from-jax-navy via-jax-navy-deep to-jax-ink text-jax-light">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jax-blue/20 border border-jax-blue/40 text-xs uppercase tracking-widest mb-6">
              <span className="h-2 w-2 rounded-full bg-jax-gold animate-pulse" /> Demo Preview · City of Jacksonville
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-4">
              A modern <span className="text-jax-gold">citizen platform</span> — and a desktop your employees will actually thank you for.
            </h1>
            <p className="text-lg sm:text-xl text-jax-sky/90 mb-8 leading-relaxed">
              Liftori is the AI-native alternative to Salesforce Public Sector. Built on the same Azure stack
              Mayor Deegan already champions. Live in six weeks, not six years.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-jax-gold text-jax-ink font-semibold hover:bg-jax-gold/90 transition">
                Sign in to demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-jax-sky/50 hover:bg-jax-blue/20 transition">
                Create a citizen account
              </Link>
              <Link to="/transparency" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-jax-sky/50 hover:bg-jax-blue/20 transition">
                View transparency dashboard
              </Link>
            </div>
            <p className="text-xs text-jax-sky/70 mt-6">
              Demo data only. Not a live City of Jacksonville system. Production deployment pending procurement award.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-3xl mb-12">
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-3">What Oracle AgentWeb doesn’t do</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your employees deserve better tools.</h2>
          <p className="text-lg text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed">
            MyJax citizens see a paginated FAQ. The CSRs working those cases see fourteen empty form fields,
            a "Last Name" customer search, and a "Refresh" button. We built the alternative.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="p-6 rounded-lg bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 hover:border-jax-blue/60 transition">
              <Icon className="h-6 w-6 text-jax-blue mb-3" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-jax-navy text-jax-light">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="text-xs uppercase tracking-widest text-jax-gold mb-3">The Anchor Narrative</div>
          <blockquote className="text-2xl sm:text-3xl font-semibold leading-snug mb-6">
            "Boston tried Salesforce for their 311 system. Four years and four times the cost later, they walked.
            The City of Jacksonville does not have four years to waste."
          </blockquote>
          <p className="text-sm text-jax-sky">
            Liftori is built so this never happens to you.
          </p>
        </div>
      </section>
    </div>
  )
}
