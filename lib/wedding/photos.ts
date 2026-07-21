import { createAdminClient } from '@/lib/supabase/admin'
import { WEDDING_BUCKET } from './config'

export interface WeddingPhoto {
  name: string
  path: string
  url: string
  createdAt: string | null
}

// Lists every uploaded photo for a wedding slug (newest first). Uses the service role so
// no anon "list" policy is needed on the bucket; public URLs render directly in the gallery.
export async function listWeddingPhotos(slug: string): Promise<WeddingPhoto[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(WEDDING_BUCKET).list(slug, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error || !data) return []

  return data
    // Real files have an id; folder placeholders (e.g. ".emptyFolderPlaceholder") don't.
    .filter((f) => f.id !== null && !f.name.startsWith('.'))
    .map((f) => {
      const path = `${slug}/${f.name}`
      const { data: pub } = supabase.storage.from(WEDDING_BUCKET).getPublicUrl(path)
      return { name: f.name, path, url: pub.publicUrl, createdAt: f.created_at ?? null }
    })
}
