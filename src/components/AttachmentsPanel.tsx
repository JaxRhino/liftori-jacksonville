import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download, File, FileImage, FileText, Loader2, Paperclip,
  Trash2, Upload, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useRealtime } from '../lib/useRealtime'
import { relativeTime } from '../lib/types'

type ParentType = 'case' | 'note' | 'email_message' | 'task'

interface Attachment {
  id: string
  owner_id: string
  parent_type: ParentType
  parent_id: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  storage_path: string
  uploaded_at: string
}

interface Props {
  parentType: ParentType
  parentId: string
  /** UI style: 'full' (default) shows dropzone + list, 'compact' shows inline chips only */
  variant?: 'full' | 'compact'
  className?: string
}

export function AttachmentsPanel({ parentType, parentId, variant = 'full', className }: Props) {
  const { profile } = useAuth()
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!parentId) { setLoading(false); return }
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .order('uploaded_at', { ascending: false })
    if (error) console.warn('attachments load', error.message)
    setItems((data as Attachment[]) ?? [])
    setLoading(false)
  }, [parentType, parentId])

  useEffect(() => { load() }, [load])
  useRealtime('attachments', load, [parentType, parentId])

  async function upload(files: FileList | File[]) {
    if (!profile) return
    const list = Array.from(files)
    if (list.length === 0) return
    setUploading(true)
    for (const file of list) {
      const ext = file.name.split('.').pop() || 'bin'
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
      const key = `${parentType}/${parentId}/${profile.id}/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage.from('attachments').upload(key, file, {
        contentType: file.type || `application/${ext}`,
        upsert: false,
      })
      if (upErr) { console.warn('upload', upErr.message); continue }
      const { error: rowErr } = await supabase.from('attachments').insert({
        owner_id: profile.id,
        parent_type: parentType,
        parent_id: parentId,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        storage_path: key,
      })
      if (rowErr) console.warn('insert', rowErr.message)
    }
    setUploading(false)
    load()
  }

  async function openFile(a: Attachment) {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(a.storage_path, 300)  // 5-min signed URL
    if (error || !data) { console.warn('sign url', error?.message); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function remove(a: Attachment) {
    if (!confirm(`Delete "${a.file_name}"?`)) return
    await supabase.storage.from('attachments').remove([a.storage_path]).catch(() => {})
    await supabase.from('attachments').delete().eq('id', a.id)
    load()
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files)
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className || ''}`}>
        {items.map(a => <AttachmentChip key={a.id} a={a} onClick={() => openFile(a)} onDelete={() => remove(a)} canDelete={a.owner_id === profile?.id} />)}
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-dashed border-jax-gray-2 dark:border-jax-gray-4/40 text-jax-gray-3 hover:border-jax-blue hover:text-jax-blue transition"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
          Attach
        </button>
        <input ref={inputRef} type="file" multiple onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition ${
          dragOver
            ? 'border-jax-blue bg-jax-blue/10'
            : 'border-jax-gray-2 dark:border-jax-gray-4/40 hover:border-jax-blue hover:bg-jax-blue/5'
        }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-jax-blue">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-jax-blue mx-auto mb-2" />
            <div className="text-sm font-medium">Drop files here, or click to browse</div>
            <div className="text-[11px] text-jax-gray-3 mt-0.5">Up to 50MB per file · photos, PDFs, docs</div>
          </>
        )}
        <input ref={inputRef} type="file" multiple onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="text-center py-6 text-xs text-jax-gray-3"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-xs italic text-jax-gray-3">No attachments yet.</div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {items.map(a => (
            <li key={a.id} className="flex items-center gap-2 p-2 rounded-md border border-jax-gray-1 dark:border-jax-blue/15 hover:border-jax-blue/40 hover:bg-jax-blue/5 transition group">
              <FileIcon mime={a.mime_type} className="h-5 w-5 text-jax-blue shrink-0" />
              <button onClick={() => openFile(a)} className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium truncate">{a.file_name}</div>
                <div className="text-[10px] text-jax-gray-3">{fmtSize(a.size_bytes)} · {relativeTime(a.uploaded_at)}</div>
              </button>
              <button onClick={() => openFile(a)} className="p-1 rounded hover:bg-jax-blue/10 transition opacity-0 group-hover:opacity-100" title="Download">
                <Download className="h-3.5 w-3.5 text-jax-blue" />
              </button>
              {a.owner_id === profile?.id && (
                <button onClick={() => remove(a)} className="p-1 rounded hover:bg-jax-danger/10 transition opacity-0 group-hover:opacity-100" title="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-jax-danger" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AttachmentChip({ a, onClick, onDelete, canDelete }: { a: Attachment; onClick: () => void; onDelete: () => void; canDelete: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-jax-blue/10 text-jax-blue hover:bg-jax-blue/20 transition group">
      <FileIcon mime={a.mime_type} className="h-3 w-3" />
      <button onClick={onClick} className="truncate max-w-[160px]">{a.file_name}</button>
      <span className="text-jax-gray-3">{fmtSize(a.size_bytes)}</span>
      {canDelete && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 hover:text-jax-danger" title="Delete">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

function FileIcon({ mime, className }: { mime: string | null; className?: string }) {
  if (mime?.startsWith('image/')) return <FileImage className={className} />
  if (mime === 'application/pdf') return <FileText className={className} />
  if (mime?.startsWith('text/'))   return <FileText className={className} />
  return <File className={className} />
}

function fmtSize(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
