import { useEffect, useRef, useState } from 'react'
import { Download, File as FileIcon, Image as ImageIcon, Pencil, Search as SearchIcon, Trash2, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { AssetService } from '@/services/AssetService'
import type { Asset } from '@/services/AssetService'
import { ConfigNotice } from '@/components/ConfigNotice'
import { Input } from '@/components/ui/Input'
import { Spinner, EmptyState } from '@/components/ui/misc'
import { toast } from '@/stores/toastStore'
import { describeError } from '@/lib/describeError'

type TypeFilter = 'all' | 'image' | 'other'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AssetThumbnail({ projectId, asset }: { projectId: string; asset: Asset }) {
  const [url, setUrl] = useState<string | null>(null)
  const isImage = asset.mimeType.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    AssetService.signedUrl(projectId, asset.name).then((u) => {
      if (!cancelled) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [projectId, asset.name, isImage])

  if (isImage && url) {
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-inset ring-hairline" />
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-hover text-graphite-500 ring-1 ring-inset ring-hairline">
      {isImage ? <ImageIcon size={15} /> : <FileIcon size={15} />}
    </span>
  )
}

/**
 * Real uploads/downloads against a private Supabase Storage bucket
 * (migration 0008) — not a mock file list. Local-mode projects have no
 * Storage at all, so this shows a real CONFIGURATION REQUIRED notice
 * instead of pretending an upload succeeded.
 */
export function AssetsPanel() {
  const { project } = useWorkspace()
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    try {
      setAssets(await AssetService.list(project.id))
    } catch (err) {
      toast.error('Could not load assets', describeError(err))
      setAssets([])
    }
  }

  useEffect(() => {
    if (AssetService.isAvailable) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  if (!AssetService.isAvailable) {
    return (
      <div className="p-3">
        <ConfigNotice>
          Project Assets uploads files to Supabase Storage. There is no storage in local mode — configure Supabase to
          use this.
        </ConfigNotice>
      </div>
    )
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await AssetService.upload(project.id, file)
      toast.success('Uploaded', file.name)
      await refresh()
    } catch (err) {
      toast.error('Upload failed', describeError(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleRename(asset: Asset) {
    const name = prompt('New name', asset.name)
    if (!name || name === asset.name) return
    try {
      await AssetService.rename(project.id, asset.name, name)
      await refresh()
    } catch (err) {
      toast.error('Could not rename', describeError(err))
    }
  }

  async function handleDelete(asset: Asset) {
    if (!confirm(`Delete "${asset.name}"?`)) return
    try {
      await AssetService.remove(project.id, asset.name)
      await refresh()
    } catch (err) {
      toast.error('Could not delete', describeError(err))
    }
  }

  async function handleOpen(asset: Asset) {
    try {
      const url = await AssetService.signedUrl(project.id, asset.name)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      toast.error('Could not open file', describeError(err))
    }
  }

  if (assets === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const filtered = assets.filter((a) => {
    if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false
    if (typeFilter === 'image' && !a.mimeType.startsWith('image/')) return false
    if (typeFilter === 'other' && a.mimeType.startsWith('image/')) return false
    return true
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="type-label text-graphite-600">Assets</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload asset"
          title="Upload asset"
          className="rounded-md p-1.5 text-graphite-500 transition-colors hover:bg-surface-hover hover:text-graphite-100 disabled:opacity-50"
        >
          {uploading ? <Spinner size={14} /> : <Upload size={14} />}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      </div>

      <div className="space-y-2 px-3 pb-2">
        <div className="relative">
          <SearchIcon size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-graphite-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets…" className="h-8 pl-7 text-xs" />
        </div>
        <div className="flex gap-1">
          {(['all', 'image', 'other'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={clsx(
                'rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium capitalize transition-colors',
                typeFilter === t ? 'bg-ember-500/15 text-ember-400' : 'bg-surface-hover text-graphite-500 hover:text-graphite-300',
              )}
            >
              {t === 'other' ? 'Non-image' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={assets.length === 0 ? 'No assets yet' : 'No matches'}
            description={assets.length === 0 ? 'Upload a file to get started.' : 'Try a different search or filter.'}
          />
        ) : (
          filtered.map((asset) => (
            <div key={asset.path} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface-hover">
              <button onClick={() => handleOpen(asset)} className="shrink-0">
                <AssetThumbnail projectId={project.id} asset={asset} />
              </button>
              <button onClick={() => handleOpen(asset)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[0.8125rem] text-graphite-200">{asset.name}</p>
                <p className="text-[0.6875rem] text-graphite-600">{formatSize(asset.sizeBytes)}</p>
              </button>
              <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => handleOpen(asset)} aria-label={`Download ${asset.name}`} className="rounded-md p-1.5 text-graphite-500 hover:bg-surface-overlay hover:text-graphite-100">
                  <Download size={13} />
                </button>
                <button onClick={() => handleRename(asset)} aria-label={`Rename ${asset.name}`} className="rounded-md p-1.5 text-graphite-500 hover:bg-surface-overlay hover:text-graphite-100">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(asset)} aria-label={`Delete ${asset.name}`} className="rounded-md p-1.5 text-graphite-500 hover:bg-signal-red/12 hover:text-signal-red">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
