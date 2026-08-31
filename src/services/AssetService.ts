import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'project-assets'
const SIGNED_URL_TTL_SECONDS = 3600

export interface Asset {
  name: string
  path: string
  sizeBytes: number
  mimeType: string
  createdAt: string
}

function objectPath(projectId: string, filename: string): string {
  return `${projectId}/${filename}`
}

/**
 * Real uploads to a private Supabase Storage bucket (migration 0008) —
 * never a fake "uploaded" toast with nothing behind it. Local-mode
 * projects have no Storage at all, so every method here requires
 * Supabase; callers check `isAvailable` first and show a real
 * CONFIGURATION REQUIRED notice instead of calling these.
 */
export const AssetService = {
  isAvailable: Boolean(supabase),

  async list(projectId: string): Promise<Asset[]> {
    if (!supabase) throw new Error('Project Assets requires Supabase Storage to be configured.')
    const { data, error } = await supabase.storage.from(BUCKET).list(projectId, {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) throw error
    return (data ?? [])
      .filter((f) => f.id !== null) // Storage lists a placeholder ".emptyFolderPlaceholder" pseudo-entry for empty prefixes
      .map((f) => ({
        name: f.name,
        path: objectPath(projectId, f.name),
        sizeBytes: f.metadata?.size ?? 0,
        mimeType: f.metadata?.mimetype ?? 'application/octet-stream',
        createdAt: f.created_at ?? new Date().toISOString(),
      }))
  },

  async upload(projectId: string, file: File): Promise<void> {
    if (!supabase) throw new Error('Project Assets requires Supabase Storage to be configured.')
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath(projectId, file.name), file, { upsert: false })
    if (error) throw error
  },

  async remove(projectId: string, filename: string): Promise<void> {
    if (!supabase) throw new Error('Project Assets requires Supabase Storage to be configured.')
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath(projectId, filename)])
    if (error) throw error
  },

  async rename(projectId: string, from: string, to: string): Promise<void> {
    if (!supabase) throw new Error('Project Assets requires Supabase Storage to be configured.')
    const { error } = await supabase.storage.from(BUCKET).move(objectPath(projectId, from), objectPath(projectId, to))
    if (error) throw error
  },

  /** The bucket is private, so previewing/downloading needs a short-lived signed URL rather than a public one. */
  async signedUrl(projectId: string, filename: string): Promise<string> {
    if (!supabase) throw new Error('Project Assets requires Supabase Storage to be configured.')
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath(projectId, filename), SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    return data.signedUrl
  },
}
