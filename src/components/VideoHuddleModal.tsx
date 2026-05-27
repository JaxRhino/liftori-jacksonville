import { useEffect, useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, Phone, PhoneOff, Sparkles, Users, X } from 'lucide-react'

interface Props {
  room: string
  displayName: string
  subject?: string
  caseTicket?: string
  onLeave: () => void
}

export function VideoHuddleModal({ room, displayName, subject, caseTicket, onLeave }: Props) {
  const [maximized, setMaximized] = useState(false)
  const url = buildJitsiUrl(room, displayName, subject)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onLeave() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onLeave])

  return (
    <div className={`fixed z-50 ${maximized ? 'inset-0' : 'bottom-4 right-4 w-[640px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-2rem)]'} bg-jax-navy-deep border border-jax-blue/40 rounded-lg shadow-2xl flex flex-col overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-jax-navy text-jax-light border-b border-jax-blue/30">
        <Phone className="h-3.5 w-3.5 text-jax-success animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold flex items-center gap-2">
            Video huddle
            {caseTicket && <span className="font-mono text-jax-sky">{caseTicket}</span>}
          </div>
          {subject && <div className="text-[10px] text-jax-sky truncate">{subject}</div>}
        </div>
        <a href={url} target="_blank" rel="noopener" className="p-1.5 rounded hover:bg-jax-blue/20 transition" title="Open in new tab">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button onClick={() => setMaximized(m => !m)} className="p-1.5 rounded hover:bg-jax-blue/20 transition" title={maximized ? 'Restore' : 'Maximize'}>
          {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button onClick={onLeave} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-jax-red text-white text-xs font-semibold hover:bg-jax-red/80 transition" title="Leave (Esc)">
          <PhoneOff className="h-3 w-3" /> Leave
        </button>
        <button onClick={onLeave} className="p-1.5 rounded hover:bg-jax-blue/20 transition" aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 relative">
        <iframe
          src={url}
          title="Video huddle"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
      <div className="px-3 py-1.5 bg-jax-navy-deep border-t border-jax-blue/30 text-[10px] text-jax-sky/70 flex items-center justify-between">
        <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Powered by Jitsi Meet</span>
        <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> Share the URL above to invite others</span>
      </div>
    </div>
  )
}

function buildJitsiUrl(room: string, displayName: string, subject?: string) {
  const base = `https://meet.jit.si/${encodeURIComponent(room)}`
  const config = ['config.prejoinPageEnabled=false','config.disableDeepLinking=true'].join('&')
  const userInfo = `userInfo.displayName=${encodeURIComponent(displayName)}`
  const subjStr  = subject ? `&subject=${encodeURIComponent(subject)}` : ''
  return `${base}?${userInfo}${subjStr}#${config}`
}
