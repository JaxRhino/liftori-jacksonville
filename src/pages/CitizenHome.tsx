import { useEffect, useState } from 'react'
import { Calendar, Trash2, Recycle, MapPin, Phone, FileText, MessageSquare, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface ServiceRequest {
  id: string
  ticket_number: string
  subject: string
  status: string
  priority: string
  created_at: string
}

export function CitizenHome() {
  const { profile } = useAuth()
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('id, ticket_number, subject, status, priority, created_at')
        .eq('citizen_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setMyRequests((data as ServiceRequest[]) ?? [])
      setLoading(false)
    })()
  }, [profile])

  const displayName = profile?.display_name || profile?.full_name || 'Resident'
  const district = profile?.council_district ?? '—'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-jax-blue mb-1">Citizen Dashboard</div>
        <h1 className="text-3xl font-bold">Welcome back, {displayName}.</h1>
        <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
          One place for everything you need from the City of Jacksonville.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-jax-blue to-jax-navy text-jax-light rounded-lg p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-jax-sky mb-2">
            <Sparkles className="h-3.5 w-3.5" /> AI Assistant
          </div>
          <h3 className="text-xl font-semibold mb-1">Need to report something?</h3>
          <p className="text-sm text-jax-sky/90 mb-4">
            Tell me what's going on — a pothole, a missed pickup, a stray animal — and I'll route it to the right department.
          </p>
          <button className="px-4 py-2 rounded-md bg-jax-gold text-jax-ink font-semibold hover:bg-jax-gold/90 transition text-sm">
            Open AI assistant
          </button>
        </div>

        <div className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-5">
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-2">My Address</div>
          <div className="space-y-2 text-sm">
            <Row icon={MapPin} label={profile?.street_address || 'No address on file'} sub={`Jacksonville, FL ${profile?.zip ?? ''}`} />
            <Row icon={MapPin} label="Council District" sub={String(district)} />
            <Row icon={Calendar} label="Evac Zone" sub={profile?.evac_zone || 'Not set'} />
            <Row icon={Trash2} label="Hauler" sub={profile?.hauler || 'Not assigned'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-jax-gray-1 dark:border-jax-blue/20">
            <div>
              <h3 className="font-semibold">My service requests</h3>
              <p className="text-xs text-jax-gray-4 dark:text-jax-gray-2">Track every interaction you've had with the city.</p>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky transition">
              + New request
            </button>
          </div>
          <div className="divide-y divide-jax-gray-1 dark:divide-jax-blue/10">
            {loading && <div className="p-6 text-center text-sm text-jax-gray-3">Loading…</div>}
            {!loading && myRequests.length === 0 && (
              <div className="p-8 text-center">
                <FileText className="h-10 w-10 text-jax-gray-3 mx-auto mb-2" />
                <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2">No requests yet.</p>
                <p className="text-xs text-jax-gray-3 mt-1">Use the AI assistant above to report something.</p>
              </div>
            )}
            {myRequests.map(req => (
              <div key={req.id} className="px-5 py-4 hover:bg-jax-light dark:hover:bg-jax-navy-deep/30 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{req.subject}</div>
                    <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">
                      <span className="font-mono">{req.ticket_number}</span> · {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusPill status={req.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Tile icon={Trash2}   title="Waste & Recycling"   sub="Schedule, bulk pickup, missed routes" />
          <Tile icon={Recycle}  title="Report illegal dumping" sub="Send a photo and location" />
          <Tile icon={Phone}    title="Call 630-CITY"       sub="(904) 630-2489 · Mon-Sat" />
          <Tile icon={MessageSquare} title="Browse FAQs"    sub="10+ articles on city services" />
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-jax-blue mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{label}</div>
        {sub && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 truncate">{sub}</div>}
      </div>
    </div>
  )
}

function Tile({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <button className="w-full text-left p-4 bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg hover:border-jax-blue/60 transition group">
      <Icon className="h-5 w-5 text-jax-blue mb-2 group-hover:scale-110 transition-transform" />
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 mt-0.5">{sub}</div>
    </button>
  )
}

function StatusPill({ status }: { status: string }) {
  const color = {
    new: 'bg-jax-blue/15 text-jax-blue',
    triaged: 'bg-jax-blue/15 text-jax-blue',
    assigned: 'bg-jax-warn/15 text-jax-warn',
    in_progress: 'bg-jax-warn/15 text-jax-warn',
    resolved: 'bg-jax-success/15 text-jax-success',
    closed: 'bg-jax-gray-2/40 text-jax-gray-4',
  }[status] || 'bg-jax-gray-2/40 text-jax-gray-4'
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${color}`}>{status.replace('_',' ')}</span>
}
