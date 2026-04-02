export interface VibeTag {
  slug: string
  label: string
}

export interface VibeTagCategory {
  id: string
  label: string
  tags: VibeTag[]
}

export const VIBE_TAG_CATEGORIES: VibeTagCategory[] = [
  {
    id: 'atmosphere',
    label: 'Atmosphere',
    tags: [
      { slug: 'cozy', label: 'Cozy' },
      { slug: 'lively', label: 'Lively' },
      { slug: 'quiet', label: 'Quiet' },
      { slug: 'romantic', label: 'Romantic' },
      { slug: 'trendy', label: 'Trendy' },
      { slug: 'casual', label: 'Casual' },
      { slug: 'upscale', label: 'Upscale' },
      { slug: 'rustic', label: 'Rustic' },
      { slug: 'modern', label: 'Modern' },
      { slug: 'intimate', label: 'Intimate' },
    ],
  },
  {
    id: 'good-for',
    label: 'Good for',
    tags: [
      { slug: 'families', label: 'Families' },
      { slug: 'date-night', label: 'Date Night' },
      { slug: 'groups', label: 'Groups' },
      { slug: 'solo', label: 'Solo' },
      { slug: 'business-meetings', label: 'Business Meetings' },
      { slug: 'celebrations', label: 'Celebrations' },
      { slug: 'brunch', label: 'Brunch' },
      { slug: 'late-night', label: 'Late Night' },
      { slug: 'after-work', label: 'After Work' },
    ],
  },
  {
    id: 'amenities',
    label: 'Amenities',
    tags: [
      { slug: 'dog-friendly', label: 'Dog Friendly' },
      { slug: 'outdoor-seating', label: 'Outdoor Seating' },
      { slug: 'wifi', label: 'WiFi' },
      { slug: 'parking', label: 'Parking' },
      { slug: 'wheelchair-accessible', label: 'Wheelchair Accessible' },
      { slug: 'live-music', label: 'Live Music' },
      { slug: 'takeaway', label: 'Takeaway' },
      { slug: 'delivery', label: 'Delivery' },
      { slug: 'reservations', label: 'Reservations' },
    ],
  },
]

export const ALL_VIBE_TAGS: VibeTag[] = VIBE_TAG_CATEGORIES.flatMap(c => c.tags)

export const VIBE_TAG_SLUGS = new Set(ALL_VIBE_TAGS.map(t => t.slug))

export const MAX_CUSTOM_TAGS = 3
export const MAX_CUSTOM_TAG_LENGTH = 30

export function getVibeTagLabel(slug: string): string {
  return ALL_VIBE_TAGS.find(t => t.slug === slug)?.label || slug
}

export interface VibeTagsData {
  selected: string[]
  custom: string[]
}
