import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Archive, ArchiveRestore, Eye, EyeOff, Loader2, Pin, Plus, Search, Share2,
  StickyNote, Tag as TagIcon, Trash2, Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'
import { relativeTime } from '../../lib/types'

interface Note {
  id: string
  owner_id: string
  title: string
  body: string
  tags: string[]
  pinned: boolean
  archived: boolean
  shared_with: string[]
  case_id: string | null
  created_at: string
  updated_at: string
}

type FilterMode = 'all' | 'pinned' | 'shared' | 'archived'

export function NotesPage() {
  const { profile } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string; display_name: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    const [{ data: notesData }, { data: agentsData }] = await Promise.all([
      supabase.from('notes').select('*').or(`owner_id.eq.${profile.id},shared_with.cs.{${profile.id}}`).order('updated_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, display_name').in('role', ['city_employee','super_admin']).order('full_name'),
    ])
    setNotes((notesData as Note[]) ?? [])
    setAgents((agentsData as Array<{ id: string; full_name: string; display_name: string | null }>) ?? [])
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])
  useRealtime('notes', load)

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const n of notes) for (const t of n.tags || []) s.add(t)
    return Array.from(s).sort()
  }, [notes])

  const filtered = useMemo(() => {
    let out = notes
    if (filter === 'pinned')   out = out.filter(n => n.pinned && !n.archived)
    if (filter === 'shared')   out = out.filter(n => n.owner_id !== profile?.id)
    if (filter === 'archived') out = out.filter(n => n.archived)
    if (filter === 'all')      out = out.filter(n => !n.archived)
    if (tagFilter) out = out.filter(n => n.tags?.includes(tagFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(n => n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q)))
    }
    // Pinned first, then by updated_at desc
    return out.slice().sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [notes, filter, tagFilter, search, profile])

  const selected = useMemo(() => filtered.find(n => n.id === selectedId) ?? notes.find(n => n.id === selectedId) ?? filtered[0] ?? null, [filtered, notes, selectedId])

  // Keep selectedId tracking the current first item if none picked
  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  async function createNote() {
    if (!profile) return
    const { data, error } = await supabase.from('notes').insert({
      owner_id: profile.id,
      title: 'Untitled',
      body: '',
      tags: [],
    }).select('id').single()
    if (error) { console.warn(error.message); return }
    setSelectedId((data as { id: string }).id)
    setFilter('all')
    setTagFilter(null)
    setSearch('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Workspace
          </div>
          <h1 className="text-2xl font-bold">Notes</h1>
        </div>
        <button onClick={createNote} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> New note
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-jax-blue" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)]">
          {/* LEFT — notes list */}
          <aside className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex flex-col overflow-hidden">
            <div className="p-3 border-b border-jax-gray-1 dark:border-jax-blue/20 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-jax-gray-3" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none transition"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(['all','pinned','shared','archived'] as FilterMode[]).map(f => (
                  <button key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition ${filter === f ? 'bg-jax-blue text-jax-light' : 'border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10'}`}
                  >{f}</button>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  <button onClick={() => setTagFilter(null)} className={`text-[10px] px-1.5 py-0.5 rounded transition ${!tagFilter ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'}`}>
                    all tags
                  </button>
                  {allTags.map(t => (
                    <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition ${tagFilter === t ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'}`}>
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.length === 0 && <li className="p-4 text-xs italic text-jax-gray-3 text-center">No notes match.</li>}
              {filtered.map(n => (
                <li key={n.id}>
                  <button onClick={() => setSelectedId(n.id)} className={`w-full text-left p-3 border-b border-jax-gray-1/60 dark:border-jax-blue/10 transition ${
                    selected?.id === n.id ? 'bg-jax-blue/10' : 'hover:bg-jax-blue/5'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {n.pinned && <Pin className="h-3 w-3 text-jax-warn" />}
                      {n.owner_id !== profile?.id && <Share2 className="h-3 w-3 text-jax-blue" />}
                      <div className="font-medium text-sm truncate flex-1">{n.title || 'Untitled'}</div>
                    </div>
                    <div className="text-[11px] text-jax-gray-3 line-clamp-2 mb-1">
                      {(n.body || '').replace(/[#*_`>-]/g, '').trim().slice(0, 100) || <span className="italic">empty</span>}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-jax-gray-3 flex-wrap">
                      <span>{relativeTime(n.updated_at)}</span>
                      {n.tags.slice(0, 2).map(t => <span key={t} className="px-1 rounded bg-jax-gray-1 dark:bg-jax-navy">#{t}</span>)}
                      {n.tags.length > 2 && <span>+{n.tags.length - 2}</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* RIGHT — editor */}
          <main className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
            {selected ? (
              <NoteEditor key={selected.id} note={selected} agents={agents} ownerId={profile?.id} onDeleted={() => { setSelectedId(null); load() }} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-jax-gray-3 italic">
                Pick a note on the left, or start a new one.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function NoteEditor({ note, agents, ownerId, onDeleted }: {
  note: Note
  agents: Array<{ id: string; full_name: string; display_name: string | null }>
  ownerId?: string
  onDeleted: () => void
}) {
  const canEdit = note.owner_id === ownerId
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [tags, setTags] = useState<string[]>(note.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [pinned, setPinned] = useState(note.pinned)
  const [archived, setArchived] = useState(note.archived)
  const [sharedWith, setSharedWith] = useState<string[]>(note.shared_with || [])
  const [previewMode, setPreviewMode] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setTitle(note.title); setBody(note.body); setTags(note.tags || [])
    setPinned(note.pinned); setArchived(note.archived); setSharedWith(note.shared_with || [])
    setSavedAt(null)
  }, [note.id, note.title, note.body, note.tags, note.pinned, note.archived, note.shared_with])

  // Debounced auto-save on field changes
  useEffect(() => {
    if (!canEdit) return
    if (title === note.title && body === note.body && JSON.stringify(tags) === JSON.stringify(note.tags) &&
        pinned === note.pinned && archived === note.archived && JSON.stringify(sharedWith) === JSON.stringify(note.shared_with)) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setSaving(true)
      await supabase.from('notes').update({ title, body, tags, pinned, archived, shared_with: sharedWith }).eq('id', note.id)
      setSaving(false); setSavedAt(new Date())
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, tags, pinned, archived, sharedWith])

  function addTag(t: string) {
    const clean = t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!clean || tags.includes(clean)) return
    setTags([...tags, clean])
  }

  function removeTag(t: string) {
    setTags(tags.filter(x => x !== t))
  }

  async function del() {
    if (!confirm('Delete this note?')) return
    await supabase.from('notes').delete().eq('id', note.id)
    onDeleted()
  }

  function toggleShare(id: string) {
    setSharedWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20 flex items-center gap-2 flex-wrap">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={!canEdit}
          placeholder="Untitled"
          className="flex-1 text-lg font-bold bg-transparent outline-none disabled:opacity-70"
        />
        {!canEdit && <span className="text-[10px] uppercase tracking-wider text-jax-blue bg-jax-blue/10 px-2 py-0.5 rounded">Read-only · shared with you</span>}
        <button onClick={() => setPreviewMode(p => !p)} className="p-1.5 rounded hover:bg-jax-blue/10 transition" title={previewMode ? 'Edit' : 'Preview'} disabled={!canEdit && !previewMode}>
          {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {canEdit && (
          <>
            <button onClick={() => setPinned(p => !p)} className={`p-1.5 rounded hover:bg-jax-blue/10 transition ${pinned ? 'text-jax-warn' : 'text-jax-gray-3'}`} title={pinned ? 'Unpin' : 'Pin'}>
              <Pin className="h-4 w-4" />
            </button>
            <button onClick={() => setShareOpen(o => !o)} className={`p-1.5 rounded hover:bg-jax-blue/10 transition ${sharedWith.length > 0 ? 'text-jax-blue' : 'text-jax-gray-3'}`} title="Share">
              <Users className="h-4 w-4" />
              {sharedWith.length > 0 && <span className="text-[10px] ml-1">{sharedWith.length}</span>}
            </button>
            <button onClick={() => setArchived(a => !a)} className="p-1.5 rounded hover:bg-jax-blue/10 transition text-jax-gray-3" title={archived ? 'Unarchive' : 'Archive'}>
              {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </button>
            <button onClick={del} className="p-1.5 rounded hover:bg-jax-danger/10 transition text-jax-danger" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {shareOpen && canEdit && (
        <div className="px-5 py-2 border-b border-jax-gray-1 dark:border-jax-blue/20 bg-jax-light/50 dark:bg-jax-navy-deep/60 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-jax-gray-3 self-center mr-1">Share read access:</span>
          {agents.filter(a => a.id !== ownerId).map(a => {
            const shared = sharedWith.includes(a.id)
            return (
              <button key={a.id} onClick={() => toggleShare(a.id)} className={`text-xs px-2 py-0.5 rounded-full border transition ${shared ? 'bg-jax-blue text-jax-light border-jax-blue' : 'border-jax-gray-2 dark:border-jax-gray-4/40 hover:border-jax-blue'}`}>
                {a.display_name || a.full_name}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {previewMode ? (
          <article className="prose prose-sm dark:prose-invert max-w-none px-6 py-4 markdown-body">
            <ReactMarkdown>{body || '*(empty)*'}</ReactMarkdown>
          </article>
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={!canEdit}
            placeholder="Start writing — Markdown supported."
            className="w-full h-full px-6 py-4 text-sm bg-transparent outline-none resize-none font-mono leading-relaxed disabled:opacity-70"
          />
        )}
      </div>

      <div className="px-5 py-2 border-t border-jax-gray-1 dark:border-jax-blue/20 flex items-center gap-2 flex-wrap text-[11px]">
        <TagIcon className="h-3 w-3 text-jax-gray-3" />
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-jax-blue/15 text-jax-blue">
            #{t}
            {canEdit && <button onClick={() => removeTag(t)} className="hover:text-jax-danger">×</button>}
          </span>
        ))}
        {canEdit && (
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput('') }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0) { removeTag(tags[tags.length - 1]) }
            }}
            placeholder="add tag…"
            className="text-xs bg-transparent outline-none placeholder:text-jax-gray-3 w-24"
          />
        )}
        <div className="ml-auto text-[10px] text-jax-gray-3 italic">
          {saving ? 'Saving…' : savedAt ? `Saved ${relativeTime(savedAt.toISOString())}` : `Updated ${relativeTime(note.updated_at)}`}
        </div>
      </div>
    </div>
  )
}
