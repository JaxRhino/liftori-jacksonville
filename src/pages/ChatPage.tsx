import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Hash, Lock, Loader2, MessageSquare, Send, Smile, Users, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime } from '../lib/types'

interface Channel {
  id: string
  name: string
  description: string | null
  channel_kind: 'general' | 'department' | 'case' | 'direct'
  department_id: string | null
}

interface ChannelWithDept extends Channel {
  department_name?: string | null
  department_color?: string | null
  unread?: number
}

interface ChatMessage {
  id: string
  channel_id: string
  sender_id: string
  body: string
  mentioned_user_ids: string[]
  created_at: string
}

interface MemberProfile {
  id: string
  full_name: string | null
  display_name: string | null
  title: string | null
  live_status: 'online' | 'away' | 'offline'
}

export function ChatPage() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [channels, setChannels] = useState<ChannelWithDept[]>([])
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senders, setSenders] = useState<Record<string, MemberProfile>>({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [filterCh, setFilterCh] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeId = searchParams.get('c')

  // Load channels (general + department only, not case channels)
  const loadChannels = useCallback(async () => {
    const { data } = await supabase
      .from('agent_chat_channels')
      .select(`
        id, name, description, channel_kind, department_id,
        department:departments(name, color_hex)
      `)
      .in('channel_kind', ['general', 'department'])
      .order('channel_kind')
      .order('name')
    type Raw = Channel & { department?: { name: string; color_hex: string } | null }
    const rows: ChannelWithDept[] = ((data as unknown as Raw[]) ?? []).map(c => ({
      ...c,
      department_name: c.department?.name ?? null,
      department_color: c.department?.color_hex ?? null,
    }))
    setChannels(rows)
    if (!activeId && rows.length > 0) {
      // Default to general
      const general = rows.find(c => c.name === 'general') ?? rows[0]
      setSearchParams({ c: general.id }, { replace: true })
    }
  }, [activeId, setSearchParams])

  // Load members (city employees)
  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('agent_presence')
      .select('id, full_name, display_name, title, live_status')
    const rows = (data as MemberProfile[]) ?? []
    const rank: Record<string, number> = { online: 0, away: 1, offline: 2 }
    rows.sort((a, b) => (rank[a.live_status] - rank[b.live_status]) || (a.full_name || '').localeCompare(b.full_name || ''))
    setMembers(rows)
    const lookup: Record<string, MemberProfile> = {}
    for (const m of rows) lookup[m.id] = m
    setSenders(lookup)
  }, [])

  // Load messages for active channel
  const loadMessages = useCallback(async () => {
    if (!activeId) { setLoading(false); return }
    const { data } = await supabase
      .from('agent_chat_messages')
      .select('id, channel_id, sender_id, body, mentioned_user_ids, created_at')
      .eq('channel_id', activeId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data as ChatMessage[]) ?? [])
    setLoading(false)
  }, [activeId])

  useEffect(() => { loadChannels() }, [loadChannels])
  useEffect(() => { loadMembers() }, [loadMembers])
  useEffect(() => { setLoading(true); loadMessages() }, [loadMessages])

  useRealtime('agent_chat_messages', loadMessages, [activeId])
  useRealtime('profiles', loadMembers)

  useEffect(() => {
    // Auto-scroll on new messages
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, activeId])

  const active = channels.find(c => c.id === activeId)

  async function send() {
    if (!text.trim() || !activeId || !profile || sending) return
    setSending(true)
    const body = text.trim()
    setText('')
    // Resolve @mentions (loose match)
    const mentionMatches = body.match(/@([\w-]+)/g) || []
    let mentionedUserIds: string[] = []
    if (mentionMatches.length > 0) {
      const handles = mentionMatches.map(m => m.slice(1).toLowerCase())
      mentionedUserIds = members
        .filter(m => handles.some(h => (m.display_name || '').toLowerCase() === h || (m.full_name || '').toLowerCase().replace(/\s+/g, '-') === h))
        .map(m => m.id)
    }
    await supabase.from('agent_chat_messages').insert({
      channel_id: activeId,
      sender_id: profile.id,
      body,
      mentioned_user_ids: mentionedUserIds,
    })
    setSending(false)
  }

  const filteredChannels = useMemo(() => {
    if (!filterCh.trim()) return channels
    const n = filterCh.toLowerCase()
    return channels.filter(c => c.name.toLowerCase().includes(n) || (c.description?.toLowerCase().includes(n) ?? false))
  }, [channels, filterCh])

  const generals = filteredChannels.filter(c => c.channel_kind === 'general')
  const depts    = filteredChannels.filter(c => c.channel_kind === 'department')

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-0 lg:gap-4 h-[calc(100vh-160px)]">
        {/* ---- LEFT: channels list ---- */}
        <aside className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-jax-blue" /> Channels
            </h2>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-jax-gray-3" />
              <input
                type="search"
                placeholder="Filter…"
                value={filterCh}
                onChange={e => setFilterCh(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Section title="Citywide">
              {generals.map(c => (
                <ChannelRow key={c.id} c={c} active={c.id === activeId} onSelect={() => setSearchParams({ c: c.id })} />
              ))}
            </Section>
            <Section title="Departments">
              {depts.map(c => (
                <ChannelRow key={c.id} c={c} active={c.id === activeId} onSelect={() => setSearchParams({ c: c.id })} />
              ))}
            </Section>
          </div>
        </aside>

        {/* ---- CENTER: messages ---- */}
        <main className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex flex-col overflow-hidden">
          {/* Channel header */}
          <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
            {active ? (
              <div className="flex items-start gap-2">
                {active.channel_kind === 'department' && active.department_color ? (
                  <span className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ background: active.department_color }} />
                ) : active.channel_kind === 'general' && active.name === 'supervisors' ? (
                  <Lock className="h-4 w-4 text-jax-blue mt-1 shrink-0" />
                ) : (
                  <Hash className="h-4 w-4 text-jax-blue mt-1 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{active.name}</div>
                  {active.description && <div className="text-xs text-jax-gray-4 dark:text-jax-gray-2 truncate">{active.description}</div>}
                </div>
              </div>
            ) : (
              <div className="text-sm text-jax-gray-3">Select a channel</div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-jax-blue" />
              </div>
            )}
            {!loading && messages.length === 0 && active && (
              <div className="text-center text-sm text-jax-gray-3 italic py-12">
                No messages yet in <span className="font-mono">{active.name}</span>. Be the first.
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
                    {s?.live_status === 'online' && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-jax-success border-2 border-white dark:border-jax-navy-deep" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">
                      <span className="font-medium">{name}</span>
                      {s?.title && <span className="text-jax-gray-3 ml-1.5">· {s.title}</span>}
                      <span className="text-jax-gray-3 ml-2">{relativeTime(m.created_at)}</span>
                    </div>
                    <MessageBody body={m.body} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Compose */}
          {active && (
            <div className="border-t border-jax-gray-1 dark:border-jax-blue/20 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Message ${active.name}…`}
                  rows={2}
                  className="flex-1 text-sm bg-transparent resize-none outline-none placeholder:text-jax-gray-3 px-2 py-1.5"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
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
          )}
        </main>

        {/* ---- RIGHT: member panel ---- */}
        <aside className="hidden lg:flex bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-jax-blue" /> Team
              <span className="ml-auto text-xs font-normal text-jax-gray-3">{members.length}</span>
            </h2>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {members.map(m => (
              <li key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-jax-blue/5 transition">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  m.live_status === 'online' ? 'bg-jax-success animate-pulse' :
                  m.live_status === 'away'   ? 'bg-jax-warn' : 'bg-jax-gray-3'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.display_name || m.full_name}</div>
                  {m.title && <div className="text-[10px] text-jax-gray-3 truncate">{m.title}</div>}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-jax-gray-3">{title}</div>
      <ul>{children}</ul>
    </div>
  )
}

function ChannelRow({ c, active, onSelect }: { c: ChannelWithDept; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 transition ${
          active ? 'bg-jax-blue/15 text-jax-blue font-medium' : 'hover:bg-jax-blue/5'
        }`}
      >
        {c.channel_kind === 'department' && c.department_color ? (
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.department_color }} />
        ) : c.name === 'supervisors' ? (
          <Lock className="h-3 w-3 text-jax-gray-3 shrink-0" />
        ) : (
          <Hash className="h-3 w-3 text-jax-gray-3 shrink-0" />
        )}
        <span className="truncate">{c.name}</span>
      </button>
    </li>
  )
}

function MessageBody({ body }: { body: string }) {
  const parts = body.split(/(@[\w-]+)/g)
  return (
    <div className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="bg-jax-warn/20 text-jax-warn px-1 rounded font-medium">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </div>
  )
}
