import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle, Archive, Cloud, Inbox, Loader2, Mail, MailPlus, Paperclip,
  Reply, Send, Settings, Sparkles, Star, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'
import { relativeTime } from '../../lib/types'

interface EmailAccount {
  id: string
  owner_id: string
  provider: 'microsoft365' | 'google' | 'imap'
  email: string
  display_name: string | null
  active: boolean
  last_sync_at: string | null
  connected_at: string
}

interface EmailThread {
  id: string
  account_id: string
  subject: string | null
  snippet: string | null
  from_email: string | null
  from_name: string | null
  unread_count: number
  message_count: number
  important: boolean
  starred: boolean
  last_message_at: string | null
  archived: boolean
}

interface EmailMessage {
  id: string
  thread_id: string
  account_id: string
  from_email: string | null
  from_name: string | null
  to_addrs: Array<{ email: string; name?: string }>
  cc_addrs: Array<{ email: string; name?: string }>
  subject: string | null
  body_text: string | null
  body_html: string | null
  has_attachments: boolean
  sent_at: string | null
  received_at: string | null
  is_inbound: boolean
  is_draft: boolean
  is_sent: boolean
  created_at: string
}

type Folder = 'inbox' | 'starred' | 'important' | 'archived' | 'sent'

export function EmailPage() {
  const { profile } = useAuth()
  const [account, setAccount] = useState<EmailAccount | null>(null)
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [folder, setFolder] = useState<Folder>('inbox')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [composing, setComposing] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    const { data: acctRows } = await supabase.from('email_accounts').select('*').eq('owner_id', profile.id).order('connected_at', { ascending: false }).limit(1)
    const acct = (acctRows as EmailAccount[])?.[0] ?? null
    setAccount(acct)
    if (!acct) { setThreads([]); setMessages([]); setLoading(false); return }
    const { data: tRows } = await supabase.from('email_threads').select('*').eq('account_id', acct.id).order('last_message_at', { ascending: false })
    setThreads((tRows as EmailThread[]) ?? [])
    setLoading(false)
  }, [profile])

  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase.from('email_messages').select('*').eq('thread_id', threadId).order('received_at', { ascending: true, nullsFirst: false })
    setMessages((data as EmailMessage[]) ?? [])
    // Mark thread read
    await supabase.from('email_threads').update({ unread_count: 0 }).eq('id', threadId)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('email_threads', load)
  useRealtime('email_messages', () => { if (selectedThreadId) loadMessages(selectedThreadId) })

  useEffect(() => {
    if (selectedThreadId) loadMessages(selectedThreadId)
    else setMessages([])
  }, [selectedThreadId, loadMessages])

  // When threads load, auto-select first one if nothing is picked
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) setSelectedThreadId(threads[0].id)
  }, [threads, selectedThreadId])

  const filtered = useMemo(() => {
    let out = threads
    if (folder === 'starred')   out = out.filter(t => t.starred)
    if (folder === 'important') out = out.filter(t => t.important)
    if (folder === 'archived')  out = out.filter(t => t.archived)
    if (folder === 'inbox')     out = out.filter(t => !t.archived)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(t =>
        (t.subject || '').toLowerCase().includes(q) ||
        (t.snippet || '').toLowerCase().includes(q) ||
        (t.from_name || '').toLowerCase().includes(q) ||
        (t.from_email || '').toLowerCase().includes(q)
      )
    }
    return out
  }, [threads, folder, search])

  const selected = useMemo(() => threads.find(t => t.id === selectedThreadId) ?? null, [threads, selectedThreadId])

  async function toggleStar(threadId: string, val: boolean) {
    await supabase.from('email_threads').update({ starred: val }).eq('id', threadId)
  }
  async function archive(threadId: string) {
    await supabase.from('email_threads').update({ archived: true }).eq('id', threadId)
    setSelectedThreadId(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Workspace
          </div>
          <h1 className="text-2xl font-bold">Email</h1>
          {account && (
            <div className="text-xs text-jax-gray-3 mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Cloud className="h-3 w-3 text-jax-blue" /> {account.email}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-jax-warn/15 text-jax-warn font-semibold">Demo inbox</span>
              <span>· last sync {relativeTime(account.last_sync_at || account.connected_at)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSetup(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 text-xs">
            <Settings className="h-3.5 w-3.5" /> Connect real M365
          </button>
          <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky text-xs font-semibold">
            <MailPlus className="h-3.5 w-3.5" /> Compose
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-jax-blue" /></div>
      ) : !account ? (
        <ConnectPrompt onConnect={() => setShowSetup(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-200px)]">
          {/* LEFT — folder tabs + thread list */}
          <aside className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex flex-col overflow-hidden">
            <div className="p-2 border-b border-jax-gray-1 dark:border-jax-blue/20">
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inbox..." className="w-full px-2 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {([
                  { id: 'inbox',     icon: Inbox,       label: 'Inbox' },
                  { id: 'starred',   icon: Star,        label: 'Starred' },
                  { id: 'important', icon: AlertCircle, label: 'Important' },
                  { id: 'archived',  icon: Archive,     label: 'Archived' },
                ] as Array<{ id: Folder; icon: React.ComponentType<{ className?: string }>; label: string }>).map(f => (
                  <button key={f.id} onClick={() => setFolder(f.id)} className={`px-2 py-1 text-[10px] rounded inline-flex items-center gap-1 uppercase tracking-wider transition ${
                    folder === f.id ? 'bg-jax-blue text-jax-light' : 'hover:bg-jax-blue/10'
                  }`}>
                    <f.icon className="h-3 w-3" /> {f.label}
                  </button>
                ))}
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.length === 0 && <li className="p-4 text-xs italic text-jax-gray-3 text-center">Inbox is empty in this folder.</li>}
              {filtered.map(t => (
                <li key={t.id}>
                  <button onClick={() => setSelectedThreadId(t.id)} className={`w-full text-left px-3 py-2.5 border-b border-jax-gray-1/60 dark:border-jax-blue/10 transition ${
                    selectedThreadId === t.id ? 'bg-jax-blue/10' : 'hover:bg-jax-blue/5'
                  }`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {t.starred && <Star className="h-3 w-3 text-jax-gold fill-jax-gold" />}
                      {t.important && <span className="h-1.5 w-1.5 rounded-full bg-jax-red" />}
                      <div className={`text-xs flex-1 truncate ${t.unread_count > 0 ? 'font-bold' : 'text-jax-gray-4 dark:text-jax-gray-2'}`}>
                        {t.from_name || t.from_email || '(unknown)'}
                      </div>
                      <div className="text-[10px] text-jax-gray-3 shrink-0">{t.last_message_at ? relativeTime(t.last_message_at) : ''}</div>
                    </div>
                    <div className={`text-sm truncate ${t.unread_count > 0 ? 'font-semibold' : ''}`}>{t.subject || '(no subject)'}</div>
                    <div className="text-[11px] text-jax-gray-3 line-clamp-2 mt-0.5">{t.snippet}</div>
                    {t.message_count > 1 && (
                      <div className="text-[10px] text-jax-gray-3 mt-1">{t.message_count} messages</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* RIGHT — thread detail */}
          <main className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden flex flex-col">
            {selected ? (
              <ThreadView
                thread={selected}
                messages={messages}
                myEmail={account.email}
                onToggleStar={(v) => toggleStar(selected.id, v)}
                onArchive={() => archive(selected.id)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-jax-gray-3 italic">
                Select a thread to read.
              </div>
            )}
          </main>
        </div>
      )}

      {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
      {composing && account && <ComposeModal accountId={account.id} myEmail={account.email} myName={profile?.display_name || profile?.full_name || ''} onClose={() => setComposing(false)} onSent={() => setComposing(false)} />}
    </div>
  )
}

function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="max-w-md mx-auto bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg p-8 text-center">
      <Mail className="h-12 w-12 mx-auto text-jax-blue mb-3" />
      <h2 className="font-bold text-lg mb-2">Connect your work email</h2>
      <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mb-4">
        Sign in with your Microsoft 365 account to read and send city email inside Liftori.
      </p>
      <button onClick={onConnect} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky">
        <Settings className="h-4 w-4" /> Connect Microsoft 365
      </button>
    </div>
  )
}

function ThreadView({ thread, messages, myEmail, onToggleStar, onArchive }: {
  thread: EmailThread
  messages: EmailMessage[]
  myEmail: string
  onToggleStar: (val: boolean) => void
  onArchive: () => void
}) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  async function sendReply() {
    if (!reply.trim() || sending) return
    setSending(true)
    const lastInbound = messages.slice().reverse().find(m => m.is_inbound)
    const toAddrs = lastInbound
      ? [{ email: lastInbound.from_email!, name: lastInbound.from_name || '' }]
      : (messages[0]?.to_addrs || [])

    await supabase.from('email_messages').insert({
      thread_id: thread.id,
      account_id: thread.account_id,
      from_email: myEmail,
      from_name: 'You',
      to_addrs: toAddrs,
      subject: thread.subject?.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      body_text: reply.trim(),
      is_inbound: false,
      is_sent: true,
      sent_at: new Date().toISOString(),
    })
    await supabase.from('email_threads').update({
      message_count: thread.message_count + 1,
      last_message_at: new Date().toISOString(),
      snippet: reply.trim().slice(0, 200),
    }).eq('id', thread.id)
    setReply('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
        <div className="flex items-start gap-2">
          <h2 className="text-base font-bold flex-1 leading-snug">{thread.subject || '(no subject)'}</h2>
          <button onClick={() => onToggleStar(!thread.starred)} className="p-1.5 rounded hover:bg-jax-blue/10 transition" title={thread.starred ? 'Unstar' : 'Star'}>
            <Star className={`h-4 w-4 ${thread.starred ? 'text-jax-gold fill-jax-gold' : 'text-jax-gray-3'}`} />
          </button>
          <button onClick={onArchive} className="p-1.5 rounded hover:bg-jax-blue/10 transition" title="Archive">
            <Archive className="h-4 w-4 text-jax-gray-3" />
          </button>
        </div>
        <div className="text-[11px] text-jax-gray-3 mt-1">{thread.message_count} {thread.message_count === 1 ? 'message' : 'messages'}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`p-4 rounded-lg border ${m.is_inbound ? 'bg-white dark:bg-jax-navy-deep/60 border-jax-gray-1 dark:border-jax-blue/20' : 'bg-jax-blue/5 dark:bg-jax-blue/10 border-jax-blue/30'}`}>
            <div className="flex items-start gap-3 mb-2">
              <div className={`h-8 w-8 rounded-full ${m.is_inbound ? 'bg-jax-blue/15 text-jax-blue' : 'bg-jax-blue text-jax-light'} flex items-center justify-center text-[10px] font-bold uppercase shrink-0`}>
                {(m.from_name || m.from_email || '?').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{m.from_name || m.from_email || '(unknown)'}</div>
                <div className="text-[10px] text-jax-gray-3">
                  to {m.to_addrs.map(a => a.name || a.email).join(', ')}
                  {m.cc_addrs && m.cc_addrs.length > 0 && <> · cc {m.cc_addrs.map(a => a.name || a.email).join(', ')}</>}
                </div>
              </div>
              <div className="text-[10px] text-jax-gray-3 shrink-0">{m.received_at ? relativeTime(m.received_at) : m.sent_at ? relativeTime(m.sent_at) : ''}</div>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.body_text}</div>
            {m.has_attachments && (
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-jax-blue">
                <Paperclip className="h-3 w-3" /> Attachment available
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="border-t border-jax-gray-1 dark:border-jax-blue/20 p-3">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Reply className="h-3.5 w-3.5 text-jax-blue" />
          <span className="text-jax-gray-3">Reply to {messages.slice(-1)[0]?.from_name || 'thread'}</span>
        </div>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-jax-light dark:bg-jax-ink rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 focus:border-jax-blue outline-none transition resize-none"
        />
        <div className="flex items-center justify-end mt-2 gap-2">
          <button className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-jax-blue hover:bg-jax-blue/10 rounded-md transition" title="Draft with AI (Wave H)" disabled>
            <Sparkles className="h-3 w-3" /> Draft with AI
          </button>
          <button onClick={sendReply} disabled={!reply.trim() || sending} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition">
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send reply
          </button>
        </div>
      </div>
    </div>
  )
}

function ComposeModal({ accountId, myEmail, myName, onClose, onSent }: { accountId: string; myEmail: string; myName: string; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!to.trim() || !subject.trim() || sending) return
    setSending(true)
    const threadId = crypto.randomUUID()
    await supabase.from('email_threads').insert({
      id: threadId,
      account_id: accountId,
      subject,
      snippet: body.slice(0, 200),
      from_email: myEmail,
      from_name: myName,
      unread_count: 0,
      message_count: 1,
      last_message_at: new Date().toISOString(),
    })
    await supabase.from('email_messages').insert({
      thread_id: threadId,
      account_id: accountId,
      from_email: myEmail,
      from_name: myName,
      to_addrs: [{ email: to.trim() }],
      subject,
      body_text: body,
      is_inbound: false,
      is_sent: true,
      sent_at: new Date().toISOString(),
    })
    setSending(false)
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 bg-jax-ink/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
          <h3 className="font-semibold flex items-center gap-2"><MailPlus className="h-4 w-4 text-jax-blue" /> New message</h3>
          <button onClick={onClose} aria-label="Close" className="text-jax-gray-3 hover:text-jax-blue"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="To: email@example.com" className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full px-3 py-2 text-sm rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Your message..." className="w-full px-3 py-2 text-sm bg-jax-light dark:bg-jax-ink rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 focus:border-jax-blue outline-none transition resize-none" />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10 transition">Cancel</button>
          <button onClick={send} disabled={!to.trim() || !subject.trim() || sending} className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky disabled:opacity-50 transition">
            {sending && <Loader2 className="h-3 w-3 animate-spin" />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function SetupModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 bg-jax-ink/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-jax-navy-deep rounded-lg shadow-2xl border border-jax-gray-2 dark:border-jax-blue/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20">
          <h3 className="font-semibold flex items-center gap-2"><Cloud className="h-4 w-4 text-jax-blue" /> Connect Microsoft 365</h3>
          <button onClick={onClose} aria-label="Close" className="text-jax-gray-3 hover:text-jax-blue"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="rounded-md p-3 bg-jax-warn/10 border border-jax-warn/30 text-jax-warn text-xs">
            Real Microsoft 365 OAuth requires a one-time Azure App Registration. Until that ships, this Email view operates as a demo inbox with seeded threads so the workflow is fully demonstrable.
          </div>

          <h4 className="font-semibold">Setup steps (about 15 min)</h4>
          <ol className="space-y-2 list-decimal list-inside text-jax-gray-4 dark:text-jax-gray-2 text-xs">
            <li>Sign in to <a href="https://portal.azure.com" target="_blank" rel="noopener" className="text-jax-blue underline">portal.azure.com</a> with a city tenant admin account.</li>
            <li>Microsoft Entra ID → App registrations → New registration.</li>
            <li>Name: <code className="font-mono">Liftori Jacksonville</code>. Supported account types: Single tenant. Redirect URI (Web): <code className="font-mono">https://jax.liftori.ai/work/email/callback</code></li>
            <li>After creation: copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong>.</li>
            <li>API permissions → Add → Microsoft Graph → Delegated: <code className="font-mono">Mail.Read</code>, <code className="font-mono">Mail.Send</code>, <code className="font-mono">offline_access</code>. Grant admin consent.</li>
            <li>Certificates &amp; secrets → New client secret. Copy the value.</li>
            <li>Email those three values (client ID, tenant ID, client secret) to ryan@liftori.ai. Liftori adds them to Supabase secrets, deploys the OAuth callback edge function, and the &quot;Connect Microsoft 365&quot; button starts working for every city employee.</li>
          </ol>

          <p className="text-[11px] italic text-jax-gray-3">
            Why this matters: agents stop tab-switching to Outlook. Drag an inbound citizen email into the cases queue to create a new ticket. Attach any email to a case or note in one click.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-jax-gray-1 dark:border-jax-blue/20">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky">Got it</button>
        </div>
      </div>
    </div>
  )
}
