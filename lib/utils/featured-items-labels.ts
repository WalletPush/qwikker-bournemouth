/**
 * Category-aware labels for the "featured items" concept.
 *
 * QWIKKER is multi-vertical (not just food), so a motorbike-rental or a salon
 * should never see "menu" / "dishes" copy. This maps a business's
 * system_category to the right wording for the menu/services tab, the
 * featured-items section, and the related empty states.
 */

import type { SystemCategory } from '@/lib/constants/system-categories'

export interface FeaturedItemsLabels {
  /** Tab label e.g. "Menu" / "Services" / "Products" / "Highlights" */
  tabLabel: string
  /** Section heading e.g. "Featured Menu Items" / "Featured Services" */
  sectionTitle: string
  /** Section sub-heading e.g. "Our most popular dishes" / "...services" */
  sectionSubtitle: string
  /** Empty-state (unclaimed) heading e.g. "Menu Coming Soon" */
  comingSoonTitle: string
  /** Empty-state (unclaimed) body */
  comingSoonBody: string
  /** Empty-state (claimed, nothing added) heading e.g. "No Menu Items Yet" */
  emptyTitle: string
  /** Empty-state (claimed, nothing added) body */
  emptyBody: string
  /** "See the full ..." CTA copy */
  fullListCta: string
}

// Food & drink — keep the familiar menu/dishes language
const FOOD_CATEGORIES: ReadonlySet<SystemCategory> = new Set([
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'pub',
  'dessert',
  'takeaway',
  'fast_food',
])

// Product-led
const RETAIL_CATEGORIES: ReadonlySet<SystemCategory> = new Set(['retail', 'grocery'])

// Service / appointment / activity led
const SERVICE_CATEGORIES: ReadonlySet<SystemCategory> = new Set([
  'salon',
  'barber',
  'tattoo',
  'wellness',
  'fitness',
  'sports',
  'professional',
  'automotive',
  'health',
])

// Hire / rental-led
const RENTAL_CATEGORIES: ReadonlySet<SystemCategory> = new Set(['rental'])

// Experience / activity-led
const ACTIVITY_CATEGORIES: ReadonlySet<SystemCategory> = new Set(['tours_activities'])

const FOOD_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Menu',
  sectionTitle: 'Featured Menu Items',
  sectionSubtitle: 'Our most popular dishes',
  comingSoonTitle: 'Menu Coming Soon',
  comingSoonBody: 'Menus can be added by businesses after they claim their listing.',
  emptyTitle: 'No Menu Items Yet',
  emptyBody: "This business hasn't added their menu yet. Check back soon!",
  fullListCta: 'See the full menu, specials & recommendations',
}

const RETAIL_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Products',
  sectionTitle: 'Featured Products',
  sectionSubtitle: 'Our most popular products',
  comingSoonTitle: 'Products Coming Soon',
  comingSoonBody: 'Products can be added by businesses after they claim their listing.',
  emptyTitle: 'No Products Yet',
  emptyBody: "This business hasn't added their products yet. Check back soon!",
  fullListCta: 'See the full range & recommendations',
}

const SERVICE_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Services',
  sectionTitle: 'Featured Services',
  sectionSubtitle: 'Our most popular services',
  comingSoonTitle: 'Services Coming Soon',
  comingSoonBody: 'Services can be added by businesses after they claim their listing.',
  emptyTitle: 'No Services Yet',
  emptyBody: "This business hasn't added their services yet. Check back soon!",
  fullListCta: 'See all services & recommendations',
}

const RENTAL_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Rentals',
  sectionTitle: 'Featured Rentals',
  sectionSubtitle: 'Our most popular hires',
  comingSoonTitle: 'Rentals Coming Soon',
  comingSoonBody: 'Rentals can be added by businesses after they claim their listing.',
  emptyTitle: 'No Rentals Yet',
  emptyBody: "This business hasn't added their rentals yet. Check back soon!",
  fullListCta: 'See everything available to hire',
}

const ACTIVITY_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Activities',
  sectionTitle: 'Featured Activities',
  sectionSubtitle: 'Our most popular experiences',
  comingSoonTitle: 'Activities Coming Soon',
  comingSoonBody: 'Activities can be added by businesses after they claim their listing.',
  emptyTitle: 'No Activities Yet',
  emptyBody: "This business hasn't added their activities yet. Check back soon!",
  fullListCta: 'See all tours & activities',
}

// hotel, venue, entertainment, other — neutral "highlights" language
const DEFAULT_LABELS: FeaturedItemsLabels = {
  tabLabel: 'Highlights',
  sectionTitle: 'Featured Highlights',
  sectionSubtitle: 'Our most popular picks',
  comingSoonTitle: 'Highlights Coming Soon',
  comingSoonBody: 'Highlights can be added by businesses after they claim their listing.',
  emptyTitle: 'Nothing Listed Yet',
  emptyBody: "This business hasn't added their highlights yet. Check back soon!",
  fullListCta: 'See everything they offer & recommendations',
}

export function getFeaturedItemsLabels(category: SystemCategory): FeaturedItemsLabels {
  if (FOOD_CATEGORIES.has(category)) return FOOD_LABELS
  if (RETAIL_CATEGORIES.has(category)) return RETAIL_LABELS
  if (SERVICE_CATEGORIES.has(category)) return SERVICE_LABELS
  if (RENTAL_CATEGORIES.has(category)) return RENTAL_LABELS
  if (ACTIVITY_CATEGORIES.has(category)) return ACTIVITY_LABELS
  return DEFAULT_LABELS
}
