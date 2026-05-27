import { useCallback, useEffect, useRef, useState } from 'react'
import { Hash, Loader2, Send, Smile, Sparkles, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime } from '../lib/types'

interface ChatMessage {
  id: string
  channel_id: string
  sender_id: string
  body: string
  mentioned_user_ids: string[]
  created_at: string
}

interface SenderProfile {
  id: string
  full_name: string | null
  display_name: string | null
  status: string | null
  title: string | null
}

export function CaseChatTab({ caseId, caseSubject }: { caseId: string; caseSubject: string }) {
  const { profile } = useAuth()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senders, setSenders] = useState<Record<string, SenderProfile>>({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Find or create the channel for this case
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase.rpc('find_or_create_case_channel', { p_case_id: caseId })
      if (!mounted) return
      if (error) {
        console.warn('chat channel error', error.message)
        setLoading(false)
        return
      }
      setChannelId(data as string)
    })()
    return () => { mounted = false }
  }, [caseId])

  // Load messages + sender profiles
  const load = useCallback(async () => {
    if (!channelId) return
    const { data } = await supabase
      .from('agent_chat_messages')
      .select('id, channel_id, sender_id, body, mentioned_user_ids, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200)
    const msgs = (data as ChatMessage[]) ?? []
    setMessages(msgs)

    const senderIds = Array.from(new Set(msgs.map(m => m.sender_id)))
    if (senderIds.length > 0) {
      const { data: sData } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, status, title')
        .in('id', senderIds)
      const lookup: Record<string, SenderProfile> = {}
      for (const s of (sData as SenderProfile[]) ?? []) lookup[s.id] = s
      setSenders(lookup)
    }
    setLoading(false)
  }, [channelId])

  useEffect(() => { load() }, [load])
  useRealtime('agent_chat_messages', load, [channelId])

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  async function send() {
    if (!text.trim() || !channelId || !profile || sending) return
    setSending(true)
    const body = text.trim()
    setText('')
    // Detect @mentions (simple — match @firstname-lastname-style)
    const mentionMatches = body.match(/@([\w-]+)/g) || []
    let mentionedUserIds: string[] = []
    if (mentionMatches.length > 0) {
      // Resolve mentions against profiles (loose match on display_name)
      const handles = mentionMatches.map(m => m.slice(1).toLowerCase())
      const { data: matchData } = await supabase
        .from('profiles')
        .select('id, display_name, full_name')
        .eq('role', 'city_employee')
      const lookup = (matchData as Array<{ id: string; display_name: string | null; full_name: string | null }>) ?? []
      mentionedUserIds = lookup
        .filter(p => handles.some(h => (p.display_name || '').toLowerCase() === h || (p.full_name || '').toLowerCase().replace(/\s+/g, '-') === h))
        .map(p => p.id)
    }
    await supabase.from('agent_chat_messages').insert({
      channel_id: channelId,
      sender_id: profile.id,
      body,
      mentioned_user_ids: mentionedUserIds,
    })
    setSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-jax-blue" />
    </div>
  )

  return (
    <div className="flex flex-col h-full -m-4">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-jax-gray-1 dark:border-jax-blue/20 bg-jax-light/30 dark:bg-jax-navy-deep/60">
        <Hash className="h-3.5 w-3.5 text-jax-blue" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">Case channel</div>
          <div className="text-[10px] text-jax-gray-3 truncate">{caseSubject}</div>
        </div>
        <a
          href={`https://meet.jit.si/${encodeURIComponent(`liftori-jax-case-${caseId}`)}`}
          target="_blank" rel="noopener"
          title="Open the case video huddle in a new tab"
          className="p-1.5 rounded-md hover:bg-jax-blue/10 transition text-jax-success"
        >
          <Video className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-jax-blue mx-auto mb-2" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-jax-gray-3 mt-1">
              Drop a note for the team. They&apos;ll see it in real time, even on the case-list page.
            </p>
            <p className="text-[10px] text-jax-gray-3 mt-3 italic">
              Tip: type <span className="font-mono">@holli</span> to mention a teammate
            </p>
          </div>
        )}
        {messages.map(m => {
          const s = senders[m.sender_id]
          const name = s?.display_name || s?.full_name || 'Unknown'
          const mine = m.sender_id === profile?.id
          return (
            <div key={m.id} className="flex items-start gap-2">
              <div className={`h-7 w-7 rounded-full ${mine ? 'bg-jax-blue text-jax-light' : 'bg-jax-blue/15 text-jax-blue'} flex items-center justify-center text-[10px] font-bold uppercase shrink-0 relative`}>
                {name.slice(0, 2)}
                {s?.status === 'online' && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-jax-success border-2 border-white dark:border-jax-navy-deep" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs">
                  <span className="font-medium">{name}</span>
                  <span className="text-jax-gray-3 ml-2">{relativeTime(m.created_at)}</span>
                </div>
                <MessageBody body={m.body} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Compose */}
      <div className="border-t border-jax-gray-1 dark:border-jax-blue/20 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Drop a note for the team..."
            rows={2}
            className="flex-1 text-sm bg-transparent resize-none outline-none placeholder:text-jax-gray-3 px-2 py-1.5"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="p-2 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition shrink-0"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-3 px-2 mt-1 text-[10px] text-jax-gray-3">
          <span className="flex items-center gap-1"><Smile className="h-3 w-3" /> @mention with @</span>
          <span className="ml-auto">Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  )
}

// Render body with @mention highlighting
function MessageBody({ body }: { body: string }) {
  const parts = body.split(/(@[\w-]+)/g)
  return (
    <div className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return <span key={i} className="bg-jax-warn/20 text-jax-warn px-1 rounded font-medium">{part}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}
