import { createAdminClient } from '@/lib/supabase/admin'

export interface WeddingPhoto {
  id: string
  name: string
  url: string
  publicId: string | null
  createdAt: string | null
}

function deriveName(publicId: string | null, url: string): string {
  const source = publicId || url
  const base = source.split('/').pop() || 'photo'
  return base.split('?')[0]
}

// Lists every recorded photo for a wedding slug (newest first). Service role only.
export async function listWeddingPhotos(slug: string): Promise<WeddingPhoto[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('wedding_photos')
    .select('id, url, public_id, created_at')
    .eq('slug', slug.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id as string,
    url: row.url as string,
    publicId: (row.public_id as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
    name: deriveName((row.public_id as string | null) ?? null, row.url as string),
  }))
}
