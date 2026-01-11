// Global placeholder system for unclaimed businesses
// 10-20 abstract variants per category to prevent grid repetition
// Stored in /public/placeholders/ - accessible by ALL franchises
//
// CRITICAL: Placeholders are keyed by system_category (stable enum), NOT display_category
// This ensures placeholders work correctly even if admin changes the display label
//
// 🔒 SAFETY RULES (IMPORTANT):
// - Variant 0 = NEUTRAL (safe for all businesses in category)
// - Variant 1-9 = SPECIFIC (admin manual selection only)
// - Import tool ALWAYS sets placeholder_variant = 0
// - Never auto-assign cuisine-specific images (prevents misrepresentation)
//
// Example: Restaurant variant 0 = neutral plated dish (works for vegan, steakhouse, etc.)
//          Restaurant variant 3 = steak (admin must explicitly choose this)

import { SystemCategory } from './system-categories'

interface PlaceholderVariant {
  id: number
  filename: string // Format: category-abstract-01.v1.webp (versioned for cache control)
  description: string
}

interface CategoryPlaceholder {
  category: string
  variants: PlaceholderVariant[]
  unclaimedMaxVariantId: number // Max variant ID that can be selected for unclaimed businesses (prevents specific imagery)
  icon: string
  label: string
  accentColor: string
  overlayGradient: string
}

export const PLACEHOLDER_LIBRARY: Record<SystemCategory, CategoryPlaceholder> = {
  'restaurant': {
    category: 'restaurant',
    variants: [
      { id: 0, filename: 'restaurant-abstract-00.v1.webp', description: 'Table setting (neutral default)' },
      { id: 1, filename: 'restaurant-abstract-01.v1.webp', description: 'Wine glass with bokeh' },
      { id: 2, filename: 'restaurant-abstract-02.v1.webp', description: 'Pasta close-up' },
      { id: 3, filename: 'restaurant-abstract-03.v1.webp', description: 'Steak/grill' },
      { id: 4, filename: 'restaurant-abstract-04.v1.webp', description: 'Bread basket detail' },
      { id: 5, filename: 'restaurant-abstract-05.v1.webp', description: 'Silverware pattern' },
      { id: 6, filename: 'restaurant-abstract-06.v1.webp', description: 'Burger' },
      { id: 7, filename: 'restaurant-abstract-07.v1.webp', description: 'Napkin fold close-up' },
      { id: 8, filename: 'restaurant-abstract-08.v1.webp', description: 'Candle light bokeh' },
      { id: 9, filename: 'restaurant-abstract-09.v1.webp', description: 'Pizza' },
      { id: 10, filename: 'restaurant-abstract-10.v1.webp', description: 'Sushi/Asian' },
    ],
    unclaimedMaxVariantId: 8,
    icon: '🍽️',
    label: 'Restaurant',
    accentColor: 'text-orange-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'cafe': {
    category: 'cafe',
    variants: [
      { id: 0, filename: 'cafe-abstract-00.v1.webp', description: 'Coffee cup on table (neutral default)' },
      { id: 1, filename: 'cafe-abstract-01.v1.webp', description: 'Coffee bean pile' },
      { id: 2, filename: 'cafe-abstract-02.v1.webp', description: 'Espresso pouring' },
      { id: 3, filename: 'cafe-abstract-03.v1.webp', description: 'Milk foam swirl' },
      { id: 4, filename: 'cafe-abstract-04.v1.webp', description: 'Coffee cup handle' },
      { id: 5, filename: 'cafe-abstract-05.v1.webp', description: 'Ceramic texture' },
      { id: 6, filename: 'cafe-abstract-06.v1.webp', description: 'Grinder mechanism' },
      { id: 7, filename: 'cafe-abstract-07.v1.webp', description: 'Latte art' },
      { id: 8, filename: 'cafe-abstract-08.v1.webp', description: 'French press glass' },
      { id: 9, filename: 'cafe-abstract-09.v1.webp', description: 'Coffee drops' },
      { id: 10, filename: 'cafe-abstract-10.v1.webp', description: 'Wooden counter grain' },
    ],
    unclaimedMaxVariantId: 9,
    icon: '☕',
    label: 'Café',
    accentColor: 'text-amber-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'bar': {
    category: 'bar',
    variants: [
      { id: 0, filename: 'bar-abstract-00.v1.webp', description: '🔒 NEUTRAL: Backlit bottles (safe for all)' },
      { id: 1, filename: 'bar-abstract-01.v1.webp', description: 'Wine glass bokeh' },
      { id: 2, filename: 'bar-abstract-02.v1.webp', description: 'Cocktail detail' },
      { id: 3, filename: 'bar-abstract-03.v1.webp', description: 'Bottles backlit' },
      { id: 4, filename: 'bar-abstract-04.v1.webp', description: 'Whiskey glass' },
      { id: 5, filename: 'bar-abstract-05.v1.webp', description: 'Ice cube close-up' },
      { id: 6, filename: 'bar-abstract-06.v1.webp', description: 'Citrus garnish' },
      { id: 7, filename: 'bar-abstract-07.v1.webp', description: 'Glass rim salt' },
      { id: 8, filename: 'bar-abstract-08.v1.webp', description: 'Bottle cap detail' },
      { id: 9, filename: 'bar-abstract-09.v1.webp', description: 'Pour stream' },
      { id: 10, filename: 'bar-abstract-10.v1.webp', description: 'Cork texture' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🍷',
    label: 'Bar',
    accentColor: 'text-purple-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'pub': {
    category: 'pub',
    variants: [
      { id: 0, filename: 'pub-abstract-00.v1.webp', description: '🔒 NEUTRAL: Wooden pub interior (safe for all)' },
      { id: 1, filename: 'pub-abstract-01.v1.webp', description: 'Empty pint glass' },
      { id: 2, filename: 'pub-abstract-02.v1.webp', description: 'Wooden table grain' },
      { id: 3, filename: 'pub-abstract-03.v1.webp', description: 'Fireplace brick detail' },
      { id: 4, filename: 'pub-abstract-04.v1.webp', description: 'Bar taps silhouette' },
      { id: 5, filename: 'pub-abstract-05.v1.webp', description: 'Chalkboard menu texture' },
      { id: 6, filename: 'pub-abstract-06.v1.webp', description: 'Brass rail detail' },
      { id: 7, filename: 'pub-abstract-07.v1.webp', description: 'Stone wall texture' },
      { id: 8, filename: 'pub-abstract-08.v1.webp', description: 'Leather booth detail' },
      { id: 9, filename: 'pub-abstract-09.v1.webp', description: 'Dark wood paneling' },
      { id: 10, filename: 'pub-abstract-10.v1.webp', description: 'Copper accents' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🍺',
    label: 'Pub',
    accentColor: 'text-amber-500',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'bakery': {
    category: 'bakery',
    variants: [
      { id: 0, filename: 'bakery-abstract-00.v1.webp', description: '🔒 NEUTRAL: Bread on wooden shelves (safe for all)' },
      { id: 1, filename: 'bakery-abstract-01.v1.webp', description: 'Flour dust in air' },
      { id: 2, filename: 'bakery-abstract-02.v1.webp', description: 'Rolling pin on counter' },
      { id: 3, filename: 'bakery-abstract-03.v1.webp', description: 'Baking trays stacked' },
      { id: 4, filename: 'bakery-abstract-04.v1.webp', description: 'Dough texture close-up' },
      { id: 5, filename: 'bakery-abstract-05.v1.webp', description: 'Wooden baker shelf' },
      { id: 6, filename: 'bakery-abstract-06.v1.webp', description: '⚠️ ADMIN ONLY: Croissants' },
      { id: 7, filename: 'bakery-abstract-07.v1.webp', description: '⚠️ ADMIN ONLY: Artisan loaves' },
      { id: 8, filename: 'bakery-abstract-08.v1.webp', description: 'Parchment paper texture' },
      { id: 9, filename: 'bakery-abstract-09.v1.webp', description: 'Oven interior glow' },
      { id: 10, filename: 'bakery-abstract-10.v1.webp', description: 'Woven bread basket' },
    ],
    unclaimedMaxVariantId: 8,
    icon: '🥖',
    label: 'Bakery',
    accentColor: 'text-yellow-600',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'fast_food': {
    category: 'fast_food',
    variants: [
      { id: 0, filename: 'fast_food-abstract-00.v1.webp', description: '🔒 NEUTRAL: Counter service setting (safe for all)' },
      { id: 1, filename: 'fast_food-abstract-01.v1.webp', description: 'Paper bag texture' },
      { id: 2, filename: 'fast_food-abstract-02.v1.webp', description: 'Tray liner pattern' },
      { id: 3, filename: 'fast_food-abstract-03.v1.webp', description: 'Straw dispenser detail' },
      { id: 4, filename: 'fast_food-abstract-04.v1.webp', description: 'Red booth seating' },
      { id: 5, filename: 'fast_food-abstract-05.v1.webp', description: 'Napkin holder chrome' },
      { id: 6, filename: 'fast_food-abstract-06.v1.webp', description: 'Tile floor pattern' },
      { id: 7, filename: 'fast_food-abstract-07.v1.webp', description: 'Condiment packets' },
      { id: 8, filename: 'fast_food-abstract-08.v1.webp', description: 'Receipt printer paper' },
      { id: 9, filename: 'fast_food-abstract-09.v1.webp', description: 'Drive-thru speaker' },
      { id: 10, filename: 'fast_food-abstract-10.v1.webp', description: 'Plastic cup lid' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🍔',
    label: 'Fast Food',
    accentColor: 'text-red-500',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'barber': {
    category: 'barber',
    variants: [
      { id: 0, filename: 'barber-abstract-00.v1.webp', description: '🔒 NEUTRAL: Barber tools on counter (safe for all)' },
      { id: 1, filename: 'barber-abstract-01.v1.webp', description: 'Scissors blade reflection' },
      { id: 2, filename: 'barber-abstract-02.v1.webp', description: 'Leather chair texture' },
      { id: 3, filename: 'barber-abstract-03.v1.webp', description: 'Chrome barber pole' },
      { id: 4, filename: 'barber-abstract-04.v1.webp', description: 'Shaving brush bristles' },
      { id: 5, filename: 'barber-abstract-05.v1.webp', description: 'Comb teeth silhouette' },
      { id: 6, filename: 'barber-abstract-06.v1.webp', description: 'Hair clipper metal' },
      { id: 7, filename: 'barber-abstract-07.v1.webp', description: 'Straight razor handle' },
      { id: 8, filename: 'barber-abstract-08.v1.webp', description: 'Mirror reflection' },
      { id: 9, filename: 'barber-abstract-09.v1.webp', description: 'Wood grain with tools' },
      { id: 10, filename: 'barber-abstract-10.v1.webp', description: 'Shaving cream foam' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '✂️',
    label: 'Barber',
    accentColor: 'text-slate-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'dessert': {
    category: 'dessert',
    variants: [
      { id: 0, filename: 'dessert-abstract-00.v1.webp', description: '🔒 NEUTRAL: Neutral dessert plate (safe for all)' },
      { id: 1, filename: 'dessert-abstract-01.v1.webp', description: 'Chocolate shavings macro' },
      { id: 2, filename: 'dessert-abstract-02.v1.webp', description: 'Ice cream drip' },
      { id: 3, filename: 'dessert-abstract-03.v1.webp', description: 'Powdered sugar cloud' },
      { id: 4, filename: 'dessert-abstract-04.v1.webp', description: 'Macaron texture' },
      { id: 5, filename: 'dessert-abstract-05.v1.webp', description: 'Waffle cone grid' },
      { id: 6, filename: 'dessert-abstract-06.v1.webp', description: 'Berry juice drop' },
      { id: 7, filename: 'dessert-abstract-07.v1.webp', description: 'Caramel drizzle' },
      { id: 8, filename: 'dessert-abstract-08.v1.webp', description: 'Cake frosting swirl' },
      { id: 9, filename: 'dessert-abstract-09.v1.webp', description: 'Sugar crystals macro' },
      { id: 10, filename: 'dessert-abstract-10.v1.webp', description: 'Vanilla bean seeds' },
    ],
    unclaimedMaxVariantId: 8,
    icon: '🍰',
    label: 'Dessert',
    accentColor: 'text-pink-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'takeaway': {
    category: 'takeaway',
    variants: [
      { id: 0, filename: 'takeaway-abstract-00.v1.webp', description: '🔒 NEUTRAL: Generic food packaging (safe for all)' },
      { id: 1, filename: 'takeaway-abstract-01.v1.webp', description: 'Kraft paper texture' },
      { id: 2, filename: 'takeaway-abstract-02.v1.webp', description: 'Chopsticks on dark wood' },
      { id: 3, filename: 'takeaway-abstract-03.v1.webp', description: 'Food container steam' },
      { id: 4, filename: 'takeaway-abstract-04.v1.webp', description: 'Noodles close-up' },
      { id: 5, filename: 'takeaway-abstract-05.v1.webp', description: 'Paper napkin fold' },
      { id: 6, filename: 'takeaway-abstract-06.v1.webp', description: 'Food wrapper metallic' },
      { id: 7, filename: 'takeaway-abstract-07.v1.webp', description: 'Sauce drip' },
      { id: 8, filename: 'takeaway-abstract-08.v1.webp', description: 'Bamboo steamer weave' },
      { id: 9, filename: 'takeaway-abstract-09.v1.webp', description: 'Cardboard box texture' },
      { id: 10, filename: 'takeaway-abstract-10.v1.webp', description: 'Plastic fork silhouette' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🥡',
    label: 'Takeaway',
    accentColor: 'text-red-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'salon': {
    category: 'salon',
    variants: [
      { id: 0, filename: 'salon-abstract-00.v1.webp', description: '🔒 NEUTRAL: White towels and spa setting (safe for all)' },
      { id: 1, filename: 'salon-abstract-01.v1.webp', description: 'Nail polish bottle' },
      { id: 2, filename: 'salon-abstract-02.v1.webp', description: 'Makeup brush bristles' },
      { id: 3, filename: 'salon-abstract-03.v1.webp', description: 'Essential oil drop' },
      { id: 4, filename: 'salon-abstract-04.v1.webp', description: 'White towel texture' },
      { id: 5, filename: 'salon-abstract-05.v1.webp', description: 'Rose gold metal tool' },
      { id: 6, filename: 'salon-abstract-06.v1.webp', description: 'Cream texture swirl' },
      { id: 7, filename: 'salon-abstract-07.v1.webp', description: 'Mirror reflection' },
      { id: 8, filename: 'salon-abstract-08.v1.webp', description: 'Candle flame spa' },
      { id: 9, filename: 'salon-abstract-09.v1.webp', description: 'Flower petal' },
      { id: 10, filename: 'salon-abstract-10.v1.webp', description: 'Soft fabric fold' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '💅',
    label: 'Salon',
    accentColor: 'text-rose-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'tattoo': {
    category: 'tattoo',
    variants: [
      { id: 0, filename: 'tattoo-abstract-00.v1.webp', description: '🔒 NEUTRAL: Tattoo equipment on table (safe for all)' },
      { id: 1, filename: 'tattoo-abstract-01.v1.webp', description: 'Black ink drop' },
      { id: 2, filename: 'tattoo-abstract-02.v1.webp', description: 'Tattoo machine needle' },
      { id: 3, filename: 'tattoo-abstract-03.v1.webp', description: 'Leather with studs' },
      { id: 4, filename: 'tattoo-abstract-04.v1.webp', description: 'Neon tube reflection' },
      { id: 5, filename: 'tattoo-abstract-05.v1.webp', description: 'Ink bottle cap' },
      { id: 6, filename: 'tattoo-abstract-06.v1.webp', description: 'Stencil paper texture' },
      { id: 7, filename: 'tattoo-abstract-07.v1.webp', description: 'Latex glove texture' },
      { id: 8, filename: 'tattoo-abstract-08.v1.webp', description: 'Carbon transfer paper' },
      { id: 9, filename: 'tattoo-abstract-09.v1.webp', description: 'Tattoo flash art edge' },
      { id: 10, filename: 'tattoo-abstract-10.v1.webp', description: 'Chrome machine coil' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🎨',
    label: 'Tattoo',
    accentColor: 'text-indigo-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'wellness': {
    category: 'wellness',
    variants: [
      { id: 0, filename: 'wellness-abstract-00.v1.webp', description: '🔒 NEUTRAL: Calm therapy room (safe for all)' },
      { id: 1, filename: 'wellness-abstract-01.v1.webp', description: 'Massage stones' },
      { id: 2, filename: 'wellness-abstract-02.v1.webp', description: 'White towel roll' },
      { id: 3, filename: 'wellness-abstract-03.v1.webp', description: 'Plant leaves natural light' },
      { id: 4, filename: 'wellness-abstract-04.v1.webp', description: 'Acupuncture needles case' },
      { id: 5, filename: 'wellness-abstract-05.v1.webp', description: 'Diffuser mist' },
      { id: 6, filename: 'wellness-abstract-06.v1.webp', description: 'Bamboo mat texture' },
      { id: 7, filename: 'wellness-abstract-07.v1.webp', description: 'Therapy table corner' },
      { id: 8, filename: 'wellness-abstract-08.v1.webp', description: 'Calming water feature' },
      { id: 9, filename: 'wellness-abstract-09.v1.webp', description: 'Herbal compress bundle' },
      { id: 10, filename: 'wellness-abstract-10.v1.webp', description: 'Soft lighting diffused' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🧘',
    label: 'Wellness',
    accentColor: 'text-teal-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'retail': {
    category: 'retail',
    variants: [
      { id: 0, filename: 'retail-abstract-00.v1.webp', description: '🔒 NEUTRAL: Store shelf and display (safe for all)' },
      { id: 1, filename: 'retail-abstract-01.v1.webp', description: 'Clothing hanger silhouette' },
      { id: 2, filename: 'retail-abstract-02.v1.webp', description: 'Fabric texture close-up' },
      { id: 3, filename: 'retail-abstract-03.v1.webp', description: 'Shopping bag handle' },
      { id: 4, filename: 'retail-abstract-04.v1.webp', description: 'Price tag detail' },
      { id: 5, filename: 'retail-abstract-05.v1.webp', description: 'Wooden shelf grain' },
      { id: 6, filename: 'retail-abstract-06.v1.webp', description: 'Button detail macro' },
      { id: 7, filename: 'retail-abstract-07.v1.webp', description: 'Zipper teeth close-up' },
      { id: 8, filename: 'retail-abstract-08.v1.webp', description: 'Tissue paper fold' },
      { id: 9, filename: 'retail-abstract-09.v1.webp', description: 'Gift box ribbon' },
      { id: 10, filename: 'retail-abstract-10.v1.webp', description: 'Store window reflection' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🛍️',
    label: 'Retail',
    accentColor: 'text-blue-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'fitness': {
    category: 'fitness',
    variants: [
      { id: 0, filename: 'fitness-abstract-00.v1.webp', description: '🔒 NEUTRAL: Gym equipment abstract (safe for all)' },
      { id: 1, filename: 'fitness-abstract-01.v1.webp', description: 'Dumbbell weight plate' },
      { id: 2, filename: 'fitness-abstract-02.v1.webp', description: 'Yoga mat rolled edge' },
      { id: 3, filename: 'fitness-abstract-03.v1.webp', description: 'Water bottle condensation' },
      { id: 4, filename: 'fitness-abstract-04.v1.webp', description: 'Gym equipment cable' },
      { id: 5, filename: 'fitness-abstract-05.v1.webp', description: 'Rubber gym floor' },
      { id: 6, filename: 'fitness-abstract-06.v1.webp', description: 'Sweat droplets on metal' },
      { id: 7, filename: 'fitness-abstract-07.v1.webp', description: 'Resistance band stretch' },
      { id: 8, filename: 'fitness-abstract-08.v1.webp', description: 'Kettlebell handle' },
      { id: 9, filename: 'fitness-abstract-09.v1.webp', description: 'Towel on bench' },
      { id: 10, filename: 'fitness-abstract-10.v1.webp', description: 'Gym shoe sole tread' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '💪',
    label: 'Fitness',
    accentColor: 'text-green-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'sports': {
    category: 'sports',
    variants: [
      { id: 0, filename: 'sports-abstract-00.v1.webp', description: '🔒 NEUTRAL: Sports facility setting (safe for all)' },
      { id: 1, filename: 'sports-abstract-01.v1.webp', description: 'Football leather stitching' },
      { id: 2, filename: 'sports-abstract-02.v1.webp', description: 'Tennis ball fuzz' },
      { id: 3, filename: 'sports-abstract-03.v1.webp', description: 'Grass blade with water' },
      { id: 4, filename: 'sports-abstract-04.v1.webp', description: 'Sports shoe cleat' },
      { id: 5, filename: 'sports-abstract-05.v1.webp', description: 'Net weave pattern' },
      { id: 6, filename: 'sports-abstract-06.v1.webp', description: 'Whistle metal reflection' },
      { id: 7, filename: 'sports-abstract-07.v1.webp', description: 'Stopwatch face' },
      { id: 8, filename: 'sports-abstract-08.v1.webp', description: 'Court line marking' },
      { id: 9, filename: 'sports-abstract-09.v1.webp', description: 'Sports tape roll' },
      { id: 10, filename: 'sports-abstract-10.v1.webp', description: 'Trophy rim reflection' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '⚽',
    label: 'Sports',
    accentColor: 'text-lime-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'hotel': {
    category: 'hotel',
    variants: [
      { id: 0, filename: 'hotel-abstract-00.v1.webp', description: '🔒 NEUTRAL: Hotel room setting (safe for all)' },
      { id: 1, filename: 'hotel-abstract-01.v1.webp', description: 'White bed sheets texture' },
      { id: 2, filename: 'hotel-abstract-02.v1.webp', description: 'Hotel room key card' },
      { id: 3, filename: 'hotel-abstract-03.v1.webp', description: 'Pillow corner fold' },
      { id: 4, filename: 'hotel-abstract-04.v1.webp', description: 'Door handle chrome' },
      { id: 5, filename: 'hotel-abstract-05.v1.webp', description: 'Towel swan fold edge' },
      { id: 6, filename: 'hotel-abstract-06.v1.webp', description: 'Minibar glass texture' },
      { id: 7, filename: 'hotel-abstract-07.v1.webp', description: 'Curtain fabric drape' },
      { id: 8, filename: 'hotel-abstract-08.v1.webp', description: 'Room number plate' },
      { id: 9, filename: 'hotel-abstract-09.v1.webp', description: 'Marble surface droplets' },
      { id: 10, filename: 'hotel-abstract-10.v1.webp', description: 'Bedside lamp glow' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🏨',
    label: 'Hotel',
    accentColor: 'text-cyan-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'venue': {
    category: 'venue',
    variants: [
      { id: 0, filename: 'venue-abstract-00.v1.webp', description: '🔒 NEUTRAL: Event space interior (safe for all)' },
      { id: 1, filename: 'venue-abstract-01.v1.webp', description: 'Stage spotlight beam' },
      { id: 2, filename: 'venue-abstract-02.v1.webp', description: 'Velvet rope texture' },
      { id: 3, filename: 'venue-abstract-03.v1.webp', description: 'Champagne flute rim' },
      { id: 4, filename: 'venue-abstract-04.v1.webp', description: 'Red carpet texture' },
      { id: 5, filename: 'venue-abstract-05.v1.webp', description: 'Microphone stand silhouette' },
      { id: 6, filename: 'venue-abstract-06.v1.webp', description: 'Theater seat fabric' },
      { id: 7, filename: 'venue-abstract-07.v1.webp', description: 'Confetti falling blur' },
      { id: 8, filename: 'venue-abstract-08.v1.webp', description: 'Chandelier crystal' },
      { id: 9, filename: 'venue-abstract-09.v1.webp', description: 'Event ticket edge' },
      { id: 10, filename: 'venue-abstract-10.v1.webp', description: 'Stage curtain fold' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🎭',
    label: 'Venue',
    accentColor: 'text-fuchsia-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'entertainment': {
    category: 'entertainment',
    variants: [
      { id: 0, filename: 'entertainment-abstract-00.v1.webp', description: '🔒 NEUTRAL: Entertainment venue abstract (safe for all)' },
      { id: 1, filename: 'entertainment-abstract-01.v1.webp', description: 'Movie screen glow' },
      { id: 2, filename: 'entertainment-abstract-02.v1.webp', description: 'Popcorn kernel' },
      { id: 3, filename: 'entertainment-abstract-03.v1.webp', description: 'Game controller button' },
      { id: 4, filename: 'entertainment-abstract-04.v1.webp', description: '3D glasses lens' },
      { id: 5, filename: 'entertainment-abstract-05.v1.webp', description: 'Bowling lane wood' },
      { id: 6, filename: 'entertainment-abstract-06.v1.webp', description: 'Arcade joystick handle' },
      { id: 7, filename: 'entertainment-abstract-07.v1.webp', description: 'Playing card edge' },
      { id: 8, filename: 'entertainment-abstract-08.v1.webp', description: 'Dice roll motion' },
      { id: 9, filename: 'entertainment-abstract-09.v1.webp', description: 'Ticket perforation' },
      { id: 10, filename: 'entertainment-abstract-10.v1.webp', description: 'Neon sign tube glow' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🎮',
    label: 'Entertainment',
    accentColor: 'text-yellow-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'professional': {
    category: 'professional',
    variants: [
      { id: 0, filename: 'professional-abstract-00.v1.webp', description: '🔒 NEUTRAL: Office desk setting (safe for all)' },
      { id: 1, filename: 'professional-abstract-01.v1.webp', description: 'Fountain pen nib' },
      { id: 2, filename: 'professional-abstract-02.v1.webp', description: 'Business card embossing' },
      { id: 3, filename: 'professional-abstract-03.v1.webp', description: 'Document paper grain' },
      { id: 4, filename: 'professional-abstract-04.v1.webp', description: 'Laptop keyboard key' },
      { id: 5, filename: 'professional-abstract-05.v1.webp', description: 'Office desk wood grain' },
      { id: 6, filename: 'professional-abstract-06.v1.webp', description: 'Paper clip chain' },
      { id: 7, filename: 'professional-abstract-07.v1.webp', description: 'Signature line with pen' },
      { id: 8, filename: 'professional-abstract-08.v1.webp', description: 'Legal folder tab' },
      { id: 9, filename: 'professional-abstract-09.v1.webp', description: 'Coffee cup on documents' },
      { id: 10, filename: 'professional-abstract-10.v1.webp', description: 'Calculator button texture' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '💼',
    label: 'Professional',
    accentColor: 'text-gray-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  'other': {
    category: 'other',
    variants: [
      { id: 0, filename: 'other-abstract-00.v1.webp', description: '🔒 NEUTRAL: Generic interior (safe for all)' },
      { id: 1, filename: 'other-abstract-01.v1.webp', description: 'Concrete texture' },
      { id: 2, filename: 'other-abstract-02.v1.webp', description: 'Wood grain natural light' },
      { id: 3, filename: 'other-abstract-03.v1.webp', description: 'Metal surface reflection' },
      { id: 4, filename: 'other-abstract-04.v1.webp', description: 'Fabric weave texture' },
      { id: 5, filename: 'other-abstract-05.v1.webp', description: 'Glass transparency bokeh' },
      { id: 6, filename: 'other-abstract-06.v1.webp', description: 'Brick wall detail' },
      { id: 7, filename: 'other-abstract-07.v1.webp', description: 'Paper texture fold shadow' },
      { id: 8, filename: 'other-abstract-08.v1.webp', description: 'Leather surface grain' },
      { id: 9, filename: 'other-abstract-09.v1.webp', description: 'Stone texture water droplets' },
      { id: 10, filename: 'other-abstract-10.v1.webp', description: 'Brushed steel surface' },
    ],
    unclaimedMaxVariantId: 10,
    icon: '🏢',
    label: 'Other',
    accentColor: 'text-slate-400',
    overlayGradient: 'from-black/60 via-black/40 to-transparent'
  },
  // Add other categories as needed...
}

// Hash function for deterministic variant selection
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get placeholder for a business - deterministic based on google_place_id
// @param systemCategory - The stable system_category enum (NOT display_category)
// @param googlePlaceId - Used for deterministic hash-based variant selection
// @param manualVariantId - Optional admin override for specific variant
// @param businessStatus - Used for unclaimed range enforcement
export function getPlaceholder(
  systemCategory: SystemCategory,
  googlePlaceId: string,
  manualVariantId?: number | null,
  businessStatus?: string
) {
  const categoryData = PLACEHOLDER_LIBRARY[systemCategory]
  
  if (!categoryData) {
    // Fallback to 'other' if category not found
    const fallback = PLACEHOLDER_LIBRARY['other']
    const requestedId = manualVariantId ?? (hashString(googlePlaceId) % (fallback.unclaimedMaxVariantId + 1))
    
    // 🔒 GUARDRAIL: Clamp to unclaimed max for unclaimed businesses
    const safeId = businessStatus === 'unclaimed' 
      ? Math.min(requestedId, fallback.unclaimedMaxVariantId)
      : requestedId
    
    // Find variant by ID (not array index)
    const chosenVariant = fallback.variants.find(v => v.id === safeId) 
      ?? fallback.variants.find(v => v.id === 0)
      ?? fallback.variants[0]
    
    return {
      ...fallback,
      selectedVariant: chosenVariant,
      imagePath: `/placeholders/${fallback.category}/${chosenVariant.filename}`
    }
  }

  // Determine requested variant ID
  const requestedId = manualVariantId !== null && manualVariantId !== undefined
    ? manualVariantId
    : hashString(googlePlaceId) % (categoryData.unclaimedMaxVariantId + 1)

  // 🔒 GUARDRAIL: Clamp to unclaimed max for unclaimed businesses (defensive programming)
  const safeId = businessStatus === 'unclaimed'
    ? Math.min(requestedId, categoryData.unclaimedMaxVariantId)
    : requestedId

  // Find variant by ID (not array index) - prevents drift if array order changes
  const chosenVariant = categoryData.variants.find(v => v.id === safeId)
    ?? categoryData.variants.find(v => v.id === 0)
    ?? categoryData.variants[0]

  if (businessStatus === 'unclaimed' && safeId !== requestedId) {
    console.warn(`🔒 Unclaimed enforcement: variant ${requestedId} clamped to ${safeId} (max=${categoryData.unclaimedMaxVariantId})`)
  }

  return {
    ...categoryData,
    selectedVariant: chosenVariant,
    imagePath: `/placeholders/${categoryData.category}/${chosenVariant.filename}`
  }
}

// Get all variants for a category (for admin UI dropdown)
export function getCategoryVariants(systemCategory: SystemCategory) {
  return PLACEHOLDER_LIBRARY[systemCategory]?.variants || []
}

// Get all available categories
export function getAllPlaceholderCategories(): SystemCategory[] {
  return Object.keys(PLACEHOLDER_LIBRARY) as SystemCategory[]
}

