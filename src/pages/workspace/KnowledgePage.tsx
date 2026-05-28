import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  BookOpen, Building2, Check, Eye, EyeOff, Globe, Lock, Loader2, Plus,
  Search, Tag as TagIcon, Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useRealtime } from '../../lib/useRealtime'
import { relativeTime } from '../../lib/types'

interface Article {
  id: string
  slug: string
  title: string
  body: string
  excerpt: string | null
  department_id: string | null
  tags: string[]
  is_public: boolean
  view_count: number
  helpful_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Dept { id: string; slug: string; name: string; color_hex: string }

type Visibility = 'all' | 'public' | 'internal'

export function KnowledgePage() {
  const { profile } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [depts, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<Visibility>('all')

  const load = useCallback(async () => {
    const [a, d] = await Promise.all([
      supabase.from('knowledge_articles').select('id, slug, title, body, excerpt, department_id, tags, is_public, view_count, helpful_count, created_by, created_at, updated_at').order('updated_at', { ascending: false }),
      supabase.from('departments').select('id, slug, name, color_hex').eq('is_active', true).order('sort_order'),
    ])
    setArticles((a.data as Article[]) ?? [])
    setDepts((d.data as Dept[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('knowledge_articles', load)

  const filtered = useMemo(() => {
    let out = articles
    if (visibility === 'public')   out = out.filter(a => a.is_public)
    if (visibility === 'internal') out = out.filter(a => !a.is_public)
    if (deptFilter)                out = out.filter(a => a.department_id === deptFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.excerpt || '').toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return out
  }, [articles, visibility, deptFilter, search])

  const selected = useMemo(() => filtered.find(a => a.id === selectedId) ?? articles.find(a => a.id === selectedId) ?? filtered[0] ?? null, [filtered, articles, selectedId])

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  async function createArticle() {
    if (!profile) return
    const { data, error } = await supabase.from('knowledge_articles').insert({
      slug: `untitled-${Math.random().toString(36).slice(2, 8)}`,
      title: 'Untitled article',
      body: '',
      excerpt: '',
      tags: [],
      is_public: false,
      created_by: profile.id,
    }).select('id').single()
    if (error) { console.warn(error.message); return }
    setSelectedId((data as { id: string }).id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-jax-blue mb-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Workspace
          </div>
          <h1 className="text-2xl font-bold">Knowledge base</h1>
          <p className="text-sm text-jax-gray-4 dark:text-jax-gray-2 mt-1">
            Citizen-facing FAQ articles and internal department playbooks.
          </p>
        </div>
        <button onClick={createArticle} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jax-blue text-jax-light hover:bg-jax-sky text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> New article
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-jax-blue" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-200px)]">
          <aside className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg flex flex-col overflow-hidden">
            <div className="p-3 border-b border-jax-gray-1 dark:border-jax-blue/20 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-jax-gray-3" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border border-jax-gray-2 dark:border-jax-gray-4/40 bg-jax-light dark:bg-jax-ink focus:border-jax-blue outline-none" />
              </div>
              <div className="flex flex-wrap gap-1">
                {(['all','public','internal'] as Visibility[]).map(v => (
                  <button key={v} onClick={() => setVisibility(v)} className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition ${
                    visibility === v ? 'bg-jax-blue text-jax-light' : 'border border-jax-gray-2 dark:border-jax-gray-4/40 hover:bg-jax-blue/10'
                  }`}>
                    {v === 'all' ? 'All' : v}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                <button onClick={() => setDeptFilter(null)} className={`text-[10px] px-1.5 py-0.5 rounded transition ${!deptFilter ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'}`}>all depts</button>
                {depts.map(d => (
                  <button key={d.id} onClick={() => setDeptFilter(deptFilter === d.id ? null : d.id)} className={`text-[10px] px-1.5 py-0.5 rounded transition inline-flex items-center gap-1 ${deptFilter === d.id ? 'bg-jax-navy text-jax-light' : 'hover:bg-jax-blue/10'}`}>
                    <span className="h-1 w-1 rounded-full inline-block" style={{ background: d.color_hex }} />
                    {d.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.length === 0 && <li className="p-4 text-xs italic text-jax-gray-3 text-center">No articles match.</li>}
              {filtered.map(a => {
                const dept = depts.find(d => d.id === a.department_id)
                return (
                  <li key={a.id}>
                    <button onClick={() => setSelectedId(a.id)} className={`w-full text-left p-3 border-b border-jax-gray-1/60 dark:border-jax-blue/10 transition ${
                      selected?.id === a.id ? 'bg-jax-blue/10' : 'hover:bg-jax-blue/5'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {a.is_public ? <Globe className="h-3 w-3 text-jax-success" /> : <Lock className="h-3 w-3 text-jax-warn" />}
                        <div className="font-medium text-sm truncate flex-1">{a.title}</div>
                      </div>
                      {a.excerpt && <div className="text-[11px] text-jax-gray-3 line-clamp-2 mb-1">{a.excerpt}</div>}
                      <div className="flex items-center gap-1.5 text-[10px] text-jax-gray-3 flex-wrap">
                        {dept && <span className="inline-flex items-center gap-1"><span className="h-1 w-1 rounded-full" style={{ background: dept.color_hex }} />{dept.name.split(' ')[0]}</span>}
                        <span>{relativeTime(a.updated_at)}</span>
                        {a.tags.slice(0, 2).map(t => <span key={t} className="px-1 rounded bg-jax-gray-1 dark:bg-jax-navy">#{t}</span>)}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <main className="bg-white dark:bg-jax-navy-deep/40 border border-jax-gray-1 dark:border-jax-blue/20 rounded-lg overflow-hidden">
            {selected ? (
              <ArticleEditor key={selected.id} article={selected} depts={depts} onDeleted={() => { setSelectedId(null); load() }} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-jax-gray-3 italic">
                Pick an article on the left, or start a new one.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled'
}

function ArticleEditor({ article, depts, onDeleted }: { article: Article; depts: Dept[]; onDeleted: () => void }) {
  const [title, setTitle]           = useState(article.title)
  const [slug, setSlug]             = useState(article.slug)
  const [excerpt, setExcerpt]       = useState(article.excerpt ?? '')
  const [body, setBody]             = useState(article.body)
  const [departmentId, setDeptId]   = useState<string | null>(article.department_id)
  const [tags, setTags]             = useState<string[]>(article.tags || [])
  const [tagInput, setTagInput]     = useState('')
  const [isPublic, setIsPublic]     = useState(article.is_public)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [savedAt, setSavedAt]       = useState<Date | null>(null)
  const [slugDirty, setSlugDirty]   = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setTitle(article.title); setSlug(article.slug); setExcerpt(article.excerpt ?? '')
    setBody(article.body); setDeptId(article.department_id); setTags(article.tags || [])
    setIsPublic(article.is_public); setSavedAt(null); setSlugDirty(false)
  }, [article.id, article.title, article.slug, article.excerpt, article.body, article.department_id, article.tags, article.is_public])

  // Auto-slug from title until user manually edits slug
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(title))
  }, [title, slugDirty])

  // Debounced auto-save
  useEffect(() => {
    if (title === article.title && slug === article.slug && excerpt === (article.excerpt ?? '') &&
        body === article.body && departmentId === article.department_id &&
        JSON.stringify(tags) === JSON.stringify(article.tags) && isPublic === article.is_public) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setSaving(true)
      const { error } = await supabase.from('knowledge_articles').update({
        title, slug, excerpt: excerpt || null, body, department_id: departmentId, tags, is_public: isPublic,
      }).eq('id', article.id)
      setSaving(false)
      if (!error) setSavedAt(new Date())
    }, 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, body, departmentId, tags, isPublic])

  function addTag(t: string) {
    const clean = t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!clean || tags.includes(clean)) return
    setTags([...tags, clean])
  }

  async function del() {
    if (!confirm(`Delete "${article.title}"?`)) return
    await supabase.from('knowledge_articles').delete().eq('id', article.id)
    onDeleted()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-jax-gray-1 dark:border-jax-blue/20 flex items-center gap-2 flex-wrap">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Article title"
          className="flex-1 text-lg font-bold bg-transparent outline-none min-w-[160px]"
        />
        <button onClick={() => setIsPublic(p => !p)} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition ${
          isPublic ? 'bg-jax-success/15 text-jax-success hover:bg-jax-success/25' : 'bg-jax-warn/15 text-jax-warn hover:bg-jax-warn/25'
        }`}>
          {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isPublic ? 'Public' : 'Internal'}
        </button>
        <button onClick={() => setPreviewMode(p => !p)} className="p-1.5 rounded hover:bg-jax-blue/10 transition" title={previewMode ? 'Edit' : 'Preview'}>
          {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button onClick={del} className="p-1.5 rounded hover:bg-jax-danger/10 transition text-jax-danger" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Metadata row */}
      <div className="px-5 py-2 border-b border-jax-gray-1 dark:border-jax-blue/20 bg-jax-light/40 dark:bg-jax-navy-deep/60 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-jax-gray-3">slug</span>
          <input
            value={slug}
            onChange={e => { setSlug(slugify(e.target.value)); setSlugDirty(true) }}
            className="font-mono text-[11px] bg-transparent px-1.5 py-0.5 rounded border border-jax-gray-2 dark:border-jax-gray-4/40 focus:border-jax-blue outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <Building2 className="h-3 w-3 text-jax-blue" />
          <select value={departmentId ?? ''} onChange={e => setDeptId(e.target.value || null)} className="text-[11px] bg-transparent px-1.5 py-0.5 rounded border border-jax-gray-2 dark:border-jax-gray-4/40">
            <option value="">No department</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="text-[10px] text-jax-gray-3 ml-auto italic">
          {saving ? 'Saving...' : savedAt ? `Saved ${relativeTime(savedAt.toISOString())}` : `Updated ${relativeTime(article.updated_at)}`}
          {article.view_count > 0 && <span className="ml-2">· {article.view_count} views</span>}
        </div>
      </div>

      <input
        value={excerpt}
        onChange={e => setExcerpt(e.target.value)}
        placeholder="One-line excerpt for search results"
        className="px-5 py-2 text-sm italic text-jax-gray-4 dark:text-jax-gray-2 bg-transparent outline-none border-b border-jax-gray-1/60 dark:border-jax-blue/10"
      />

      <div className="flex-1 overflow-y-auto">
        {previewMode ? (
          <article className="prose prose-sm dark:prose-invert max-w-none px-6 py-4 markdown-body">
            <ReactMarkdown>{body || '*(empty)*'}</ReactMarkdown>
          </article>
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Article body -- Markdown supported."
            className="w-full h-full px-6 py-4 text-sm bg-transparent outline-none resize-none font-mono leading-relaxed"
          />
        )}
      </div>

      <div className="px-5 py-2 border-t border-jax-gray-1 dark:border-jax-blue/20 flex items-center gap-2 flex-wrap text-[11px]">
        <TagIcon className="h-3 w-3 text-jax-gray-3" />
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-jax-blue/15 text-jax-blue">
            #{t}
            <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-jax-danger">×</button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput('') }
            if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(tags.slice(0,-1))
          }}
          placeholder="add tag..."
          className="text-xs bg-transparent outline-none placeholder:text-jax-gray-3 w-24"
        />
        {!isPublic && <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-jax-warn"><Lock className="h-2.5 w-2.5" /> Hidden from citizen portal</span>}
        {isPublic && <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-jax-success"><Check className="h-2.5 w-2.5" /> Live in citizen portal</span>}
      </div>
    </div>
  )
}
