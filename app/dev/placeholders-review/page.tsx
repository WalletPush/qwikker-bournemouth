import fs from 'fs'
import path from 'path'
import { SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'
import { PlaceholderReviewGrid, type ReviewCategory } from '@/components/dev/placeholder-review-grid'

// Always read the folders fresh on each request (images are added while you review).
export const dynamic = 'force-dynamic'

/**
 * LOCAL-ONLY review tool for the abstract placeholder pool.
 * Shows every generated image, grouped by category, at card + hero size so you
 * can approve them before they're switched on. Reads straight from the
 * /public/placeholders/<category>/*.webp files — no DB, no effect on production.
 */
export default function PlaceholdersReviewPage() {
  const dir = path.join(process.cwd(), 'public', 'placeholders')

  let categories: ReviewCategory[] = []
  try {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    categories = entries
      .map((cat) => {
        const files = fs
          .readdirSync(path.join(dir, cat))
          .filter((f) => f.toLowerCase().endsWith('.webp'))
          .sort()
        return {
          category: cat,
          label: (SYSTEM_CATEGORY_LABEL as Record<string, string>)[cat] || cat,
          images: files.map((f) => ({
            file: `${cat}/${f}`,
            url: `/placeholders/${cat}/${f}`,
          })),
        }
      })
      .filter((c) => c.images.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    categories = []
  }

  return <PlaceholderReviewGrid categories={categories} />
}
