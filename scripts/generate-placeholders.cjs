#!/usr/bin/env node
/**
 * Batch placeholder generator for Qwikker discover cards.
 *
 * Generates a shared POOL of abstract, on-brand, category-safe images per
 * system_category using OpenAI's gpt-image-1, written straight to .webp into
 * /public/placeholders/<category>/NN.webp.
 *
 * These are DELIBERATELY abstract/atmospheric (no text, no logos, no faces, no
 * specific dishes) so a shared image can front any business in the category
 * without misrepresenting it. The feed assigns one deterministically per
 * business, so more images here = more grid variety with ZERO per-business cost.
 *
 * Usage:
 *   node scripts/generate-placeholders.cjs --test hotel 2        # smoke test
 *   node scripts/generate-placeholders.cjs hotel 8               # one category
 *   node scripts/generate-placeholders.cjs --all 8              # every category
 *   node scripts/generate-placeholders.cjs --empty 8            # only empty/new folders
 *   flags: --force (overwrite existing), --quality=medium|high|low, --start=N, --concurrency=N
 */

const fs = require('fs')
const path = require('path')

// ── Load OPENAI_API_KEY from .env.local (no dotenv dependency) ────────────────
function loadApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f)
    if (!fs.existsSync(p)) continue
    const txt = fs.readFileSync(p, 'utf8')
    const m = txt.match(/^\s*OPENAI_API_KEY\s*=\s*(.+)\s*$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  return null
}

const OpenAIPkg = require('openai')
const OpenAI = OpenAIPkg.OpenAI || OpenAIPkg.default || OpenAIPkg

let PLACEHOLDERS_DIR = path.join(process.cwd(), 'public', 'placeholders')

// Shared style — keeps the whole grid cohesive + SAFE (abstract, no text/faces).
const STYLE = [
  'Ultra-abstract, atmospheric, cinematic close-up detail shot.',
  'Moody low-key lighting, deep soft shadows, shallow depth of field, gentle background bokeh.',
  'Muted, elegant, premium colour palette. Editorial / high-end photography feel.',
  'It is a subtle background tile, NOT a full scene or a specific product hero.',
  'ABSOLUTELY NO text, words, letters, numbers, logos, signage, brand names, menus, price tags.',
  'NO human faces, NO recognisable people, NO hands as the subject.',
].join(' ')

// One neutral subject per category — safe for ALL subtypes in that category.
const SUBJECTS = {
  restaurant: 'an elegant dining table detail: a folded linen napkin, polished cutlery and a wine glass catching warm candlelight',
  cafe: 'a ceramic coffee cup resting on a wooden café counter, soft rising steam and warm morning light',
  bakery: 'rustic artisan bread and a dusting of flour on a warm wooden bakery counter, golden light',
  bar: 'backlit spirit bottles and a single glass on a dark polished bar top, amber glow and bokeh',
  pub: 'a cosy traditional pub interior detail: dark timber, brass fittings and warm ambient light',
  dessert: 'a delicately plated dessert detail with a soft drizzle and fine garnish, dark plate, pastel highlights',
  takeaway: 'kraft-paper food packaging and chopsticks on dark wood, warm relaxed street-food mood',
  fast_food: 'a clean modern counter-service detail: a serving tray and paper wrap with tasteful red accents, bright but refined',
  salon: 'a serene beauty and spa detail: neatly folded soft white towels and smooth neutral surfaces, calm diffused light',
  barber: 'vintage barber tools arranged on a counter: scissors, comb and chrome, warm reflective light',
  tattoo: 'a moody tattoo studio detail: a machine and ink caps on matte black surfaces, dramatic directional light',
  wellness: 'a calm therapy room detail: soft rolled towels and fresh green plant leaves in natural diffused light',
  retail: 'a stylish boutique display detail: neatly folded fabric and minimal shelving under soft warm light',
  fitness: 'a modern gym equipment detail: stacked dumbbells and textured rubber flooring, cool dramatic light',
  sports: 'a sports equipment detail: leather ball stitching and netting, crisp dynamic light',
  hotel: 'a luxury hotel room detail: crisp white bed linen and the soft glow of a bedside lamp, elegant and inviting',
  venue: 'an upscale event space detail: warm stage lighting, velvet texture and sparkling bokeh, glamorous mood',
  entertainment: 'a neon-lit entertainment venue detail: glowing coloured lights and playful bokeh in the dark',
  professional: 'a refined office desk detail: a fountain pen and paper under warm focused light, considered and calm',
  rental: 'a row of bicycles and scooters lined up ready for hire in warm outdoor daylight, easygoing travel mood',
  automotive: 'a clean modern auto workshop detail: neatly arranged tools and a glossy car body reflection, cool industrial light',
  health: 'a calm, reassuring clinical detail: clean pale neutral surfaces and softly out-of-focus medical equipment, gentle light',
  tours_activities: 'a scenic travel and adventure detail: a compass and folded map with a sunlit coastal view softly blurred behind',
  grocery: 'a fresh market detail: colourful produce and woven baskets on wooden crates, warm natural light',
  other: 'an abstract premium materials texture: natural wood, stone and soft glass with gentle light and shadow',
}

// For BROAD categories, one subject + angle looks repetitive. These give each
// image a genuinely different (but still abstract + category-safe) subject so a
// folder of 8 has real variety. Safe across ALL sub-types of the category.
const SUBJECT_VARIANTS = {
  // High-volume categories — many DISTINCT, cuisine-NEUTRAL subjects so a big
  // folder never looks repetitive and never implies a specific cuisine (the feed
  // assigns any image in the folder to any business in the category).
  restaurant: [
    'an elegant dining table with a folded linen napkin, polished cutlery and a wine glass in warm candlelight',
    'a softly out-of-focus plated dish with a delicate garnish on a dark plate, cuisine unidentifiable',
    'a rustic wooden table with a bread basket and an olive-oil cruet, warm light',
    'gentle steam rising from a covered dish under moody restaurant light',
    'two glasses and a carafe on a table with warm ambient bokeh',
    'a fine-dining plating detail with an abstract sauce drizzle, shallow focus, no hands',
    'a candlelit table set for two, romantic warm glow',
    'polished cutlery and a folded napkin close-up on dark linen',
    'a wooden serving board with small unidentifiable bites softly out of focus',
    'fresh herbs and seasonings on a dark kitchen surface, macro',
    'a warm restaurant interior detail with soft bokeh and a pendant light',
    'a table by a window with soft daylight and a single plate',
    'a wine glass catching candlelight with deep bokeh',
    'a place setting seen from above, minimal and elegant',
    'a warm-lit kitchen pass with soft rising steam',
    'an abstract macro of a plated garnish and drizzle',
  ],
  cafe: [
    'a ceramic coffee cup on a wooden counter with soft steam and warm morning light',
    'latte art in a cup softly out of focus',
    'a flat white and saucer on a marble table, bright airy light',
    'coffee beans scattered on a dark surface, macro',
    'an espresso machine portafilter with warm reflections',
    'a cup of coffee beside a window with soft daylight',
    'a pour-over dripper mid-brew, moody light',
    'a cappuccino seen from above with a foam swirl',
    'a stack of ceramic cups on a café shelf',
    'a wooden café counter grain with a cup softly out of focus',
    'steam rising from a takeaway cup, cosy mood',
    'a French press and a cup on a rustic table',
    'a coffee and a small pastry softly out of focus',
    'a warm café interior with pendant-light bokeh',
  ],
  bar: [
    'backlit spirit bottles on a dark bar top with an amber glow',
    'a single cocktail glass with a citrus garnish, moody light',
    'a wine glass catching warm bar light with bokeh',
    'ice cubes in a tumbler, macro with warm highlights',
    'a drink being poured softly out of focus, no faces',
    'a row of glasses hanging above the bar in silhouette',
    'a whiskey glass on dark wood with a warm glow',
    'cocktail-making tools on a bar top, shallow focus',
    'bottles and glassware reflections in deep bokeh',
    'a garnished drink on a coaster in warm ambient light',
    'a dark moody bar counter with a single lamp glow',
    'sparkling bubbles rising in a glass, macro',
  ],
  pub: [
    'a cosy pub interior: dark timber, brass fittings and warm ambient light',
    'a pint glass of amber drink on a wooden table, warm glow',
    'a fireplace and leather booth detail, cosy and warm',
    'bar taps softly out of focus in warm light',
    'a wooden pub table grain with a flickering candle',
    'a brass rail and dark-wood detail, traditional',
    'a warm-lit snug corner with soft window light',
    'a stone wall and warm lamp glow, traditional pub mood',
    'dark panelled walls with warm ambient bokeh',
    'a worn wooden bar top catching warm light',
  ],
  bakery: [
    'rustic artisan bread on a wooden counter in warm golden light',
    'a dusting of flour drifting in warm light, macro',
    'a rolling pin and dough on a floured surface',
    'stacked baking trays softly out of focus',
    'a woven basket of bread rolls in warm tones',
    'a wooden bakery shelf with loaves softly out of focus',
    'parchment paper and dough texture, macro',
    'a warm oven glow with soft interior light',
    'a light dusting of sugar over a pastry, soft focus',
    'a warm bakery interior with soft bokeh',
  ],
  dessert: [
    'a delicately plated dessert with a soft drizzle on a dark plate',
    'chocolate shavings in warm light, macro',
    'a soft cloud of powdered sugar over a plate',
    'a caramel drizzle over a spoon, macro',
    'a scoop of ice cream gently melting, soft focus',
    'berries and cream softly out of focus',
    'a cake slice with a frosting swirl, elegant',
    'sugar crystals glinting, macro',
    'a dessert plate by candlelight, romantic',
    'a warm patisserie display softly out of focus',
  ],
  takeaway: [
    'kraft-paper food packaging on dark wood, warm relaxed mood',
    'a takeaway container with gently rising steam',
    'chopsticks resting on a paper box, soft focus',
    'a paper bag with warm light behind it',
    'a bamboo steamer softly out of focus',
    'a wrapped parcel of food on a counter, no text',
    'a food box softly out of focus, warm tones',
    'a stack of containers ready for collection',
    'a counter with warm light and packaging bokeh',
    'a sauce drip and a napkin, macro',
  ],
  fast_food: [
    'a clean counter-service tray with paper wrap and tasteful red accents',
    'a paper cup with a lid, condensation macro',
    'a tray liner and a chrome napkin holder',
    'a red booth seat detail, soft focus',
    'a crinkle texture softly out of focus',
    'a wrapped item on a tray, no text',
    'a chrome napkin dispenser reflection',
    'small condiment cups on a tray, macro',
    'a bright modern counter softly out of focus',
    'a drink cup with a straw in warm light',
  ],
  health: [
    'a glass of water and soft green leaves on a clean pale surface in warm natural light',
    'soft folded white cloth and a sprig of eucalyptus on a bright calm surface',
    'gentle morning light through a window onto a clean minimal shelf with a small plant',
    'a smooth ceramic bowl and a rolled towel in soft mint and white tones, serene',
    'warm blurred bokeh over pale clean surfaces, a quiet sense of care',
    'fresh green foliage against a bright soft-focus white interior, airy and healthy',
    'a neatly arranged clean tray with soft neutral objects in reassuring warm light',
    'sunlight and soft shadow across a pale wall with a single plant, calm and clean',
  ],
  retail: [
    'neatly folded garments stacked on a boutique shelf, soft warm light',
    'a stylish paper shopping bag with rope handles on a clean surface, bokeh behind',
    'a rail of clothing softly out of focus, elegant boutique mood',
    'a boutique window reflection with soft light and a blurred mannequin silhouette',
    'folded knitwear texture close-up in warm tones',
    'a gift box with a satin ribbon on a minimal surface',
    'polished accessories and jewellery catching light on a display, shallow focus',
    'a tidy minimalist store shelf with objects softly out of focus',
  ],
  tours_activities: [
    'a sunlit coastal viewpoint softly out of focus, sense of adventure',
    'a wooden boat deck with coiled rope and sparkling sea bokeh',
    'a woven sun hat and sandy texture in warm golden light',
    'a travel backpack detail against a blurred scenic landscape',
    'palm-leaf shadows across a bright surface, holiday mood',
    'turquoise water and a snorkel mask softly out of focus',
    'a mountain trail vista blurred with warm light, wanderlust',
    'a harbour at golden hour with boats softly out of focus',
  ],
  rental: [
    'a set of keys resting on a counter with an open road softly blurred behind, warm light',
    'an open coastal road stretching into soft-focus sunlight, freedom to explore',
    'a helmet and keys on a wooden surface, easygoing getaway mood',
    'a sunlit harbour with blurred boats and bikes, holiday hire mood',
    'keys being handed across a counter, no faces, warm welcoming light',
    'a line of assorted vehicles softly out of focus in golden light',
    'a dashboard-like surface with keys, ready to explore, no text',
    'warm sunset bokeh over a promenade, a sense of adventure',
  ],
  entertainment: [
    'a soft spotlight beam in the dark with gentle bokeh, sense of a show',
    'colourful blurred lights in warm focus, playful mood',
    'an empty theatre seat row softly out of focus with a warm stage glow',
    'abstract coloured light streaks in the dark, energetic',
    'a softly-lit gallery corridor blurred, cultural mood',
    'popcorn texture close-up in warm cinema light',
    'an arcade / bowling light reflection abstracted, playful',
    'warm festive string-light bokeh against a dark backdrop',
  ],
  venue: [
    'an elegant empty event space with soft warm uplighting',
    'draped fabric and fairy-light bokeh in a refined setting',
    'a set banquet table detail with candlelight, soft focus',
    'a stage with warm spotlights in an empty hall',
    'chandelier crystal catching light, softly blurred',
    'rows of chairs softly out of focus in a bright hall',
    'velvet texture with warm golden bokeh',
    'string lights over an outdoor event space at dusk',
  ],
  professional: [
    'a refined office desk with a fountain pen and paper, warm focused light',
    'a soft-focus modern office interior with warm daylight',
    'a leather notebook and pen on a wooden desk, considered mood',
    'a blurred bookshelf of ledgers and folders, professional tone',
    'a clean glass-and-steel desk surface catching light',
    'a laptop edge and a coffee cup on a tidy desk, soft focus',
    'warm light across a minimalist reception-style surface',
    'stacked documents and a pen softly out of focus, no readable text',
  ],
  grocery: [
    'colourful fresh produce in woven baskets, warm market light',
    'a wooden crate of vegetables softly out of focus',
    'shelves of jars and goods blurred in warm store light',
    'a paper grocery bag with fresh produce on a counter',
    'stacked citrus fruit with dewy texture, vibrant and fresh',
    'a deli counter surface softly out of focus, warm tones',
    'bread and pantry goods on a rustic shelf',
    'green leafy produce with water droplets, fresh and clean',
  ],
  sports: [
    'leather ball stitching close-up in dramatic light',
    'a net weave pattern softly out of focus',
    'sports equipment on a court floor, dynamic light',
    'a running-track lane line abstracted, energetic',
    'a rolled towel and water bottle on a bench, cool light',
    'grass blades with morning dew, athletic morning mood',
    'trainers detail on textured ground, shallow focus',
    'a stadium light flare softly blurred at dusk',
  ],
  automotive: [
    'clean workshop tools neatly arranged, cool industrial light',
    'a glossy car body panel reflection softly out of focus',
    'a tyre tread texture close-up in dramatic light',
    'chrome detail with soft garage bokeh',
    'a polished wheel rim catching light, shallow focus',
    'droplets on a freshly washed metallic surface',
    'an engine-bay detail abstracted in cool light, no text',
    'a toolbox drawer of tools softly out of focus',
  ],
  other: [
    'abstract natural wood grain with soft light and shadow',
    'smooth stone texture with a single water droplet',
    'a brushed metal surface catching cool light',
    'soft fabric weave in warm neutral tones',
    'frosted glass with gentle bokeh behind',
    'concrete texture with a diagonal shaft of light',
    'layered paper with soft shadow folds',
    'warm leather grain close-up',
  ],
}

// Per-index nudges so the N images in a category are visibly different.
const ANGLES = [
  'macro extreme close-up, very shallow focus',
  'top-down flat-lay composition, symmetrical',
  'low three-quarter angle, strong side light',
  'wide-open bokeh with the subject off to one side',
  'high-contrast moody version, darker and more dramatic',
  'brighter airy version, soft warm highlights',
  'cool-toned version with blue-grey shadows',
  'warm golden-hour toned version',
  'textured detail with rich material grain',
  'minimalist negative-space composition',
]

const ALL_CATEGORIES = Object.keys(SUBJECTS)

// Folders that currently have no / borrowed art (empty on disk or new verticals).
const EMPTY_OR_NEW = [
  'fast_food', 'takeaway', 'entertainment', 'venue', 'fitness', 'sports',
  'hotel', 'retail', 'professional', 'other',
  'rental', 'automotive', 'health', 'tours_activities', 'grocery',
]

function parseArgs() {
  const argv = process.argv.slice(2)
  const opts = { force: false, quality: 'medium', start: 0, concurrency: 3, compression: 72 }
  const positional = []
  for (const a of argv) {
    if (a === '--force') opts.force = true
    else if (a === '--all') opts.mode = 'all'
    else if (a === '--empty') opts.mode = 'empty'
    else if (a === '--test') opts.mode = 'test'
    else if (a.startsWith('--quality=')) opts.quality = a.split('=')[1]
    else if (a.startsWith('--start=')) opts.start = parseInt(a.split('=')[1], 10)
    else if (a.startsWith('--concurrency=')) opts.concurrency = parseInt(a.split('=')[1], 10)
    else if (a.startsWith('--compression=')) opts.compression = parseInt(a.split('=')[1], 10)
    else if (a.startsWith('--outdir=')) opts.outdir = a.split('=')[1]
    else positional.push(a)
  }
  return { opts, positional }
}

async function generateOne(client, opts, category, index) {
  // Broad categories use a rotating list of distinct sub-subjects for real
  // variety; the rest use one subject + a per-index camera/lighting nudge.
  const variants = SUBJECT_VARIANTS[category]
  const subject = variants ? variants[index % variants.length] : SUBJECTS[category]
  if (!subject) throw new Error(`No subject prompt for category "${category}"`)
  const angle = ANGLES[index % ANGLES.length]
  const prompt = `${subject}. ${angle}. ${STYLE}`

  const res = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    quality: opts.quality,
    output_format: 'webp',
    output_compression: opts.compression,
    n: 1,
  })
  const b64 = res.data && res.data[0] && res.data[0].b64_json
  if (!b64) throw new Error('No image data returned')

  const dir = path.join(PLACEHOLDERS_DIR, category)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${String(index).padStart(2, '0')}.webp`)
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
  const kb = Math.round(fs.statSync(file).size / 1024)
  return { file: path.relative(process.cwd(), file), kb }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Pull a suggested wait (seconds) from a 429 — header or the message text.
function retryAfterMs(e) {
  try {
    const h = e && e.headers && (e.headers['retry-after'] || e.headers.get?.('retry-after'))
    if (h) {
      const n = parseFloat(h)
      if (!Number.isNaN(n)) return Math.ceil(n * 1000)
    }
    const m = String(e && e.message).match(/try again in ([\d.]+)s/i)
    if (m) return Math.ceil(parseFloat(m[1]) * 1000)
  } catch {}
  return null
}

async function withRetry(fn, tries = 7) {
  let lastErr
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const status = e && (e.status || e.statusCode)
      const retryable = !status || status === 429 || status >= 500
      if (!retryable || attempt === tries) throw e
      // Respect the server's hint when present (+2s buffer), else exponential.
      const hinted = retryAfterMs(e)
      const backoff = hinted != null
        ? hinted + 2000
        : Math.min(45000, 4000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 1000)
      console.warn(`    …retry ${attempt}/${tries - 1} after ${Math.round(backoff / 1000)}s (${status || e.message})`)
      await sleep(backoff)
    }
  }
  throw lastErr
}

async function runTasks(tasks, concurrency, worker) {
  let i = 0
  let ok = 0
  let fail = 0
  async function next() {
    while (i < tasks.length) {
      const idx = i++
      const t = tasks[idx]
      try {
        const r = await withRetry(() => worker(t))
        ok++
        console.log(`  ✓ ${t.category}/${String(t.index).padStart(2, '0')}.webp  (${r.kb} KB)  [${ok + fail}/${tasks.length}]`)
      } catch (e) {
        fail++
        console.error(`  ✗ ${t.category}/${String(t.index).padStart(2, '0')}  → ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, next))
  return { ok, fail }
}

async function main() {
  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in env or .env.local')
    process.exit(1)
  }
  const client = new OpenAI({ apiKey })
  const { opts, positional } = parseArgs()

  if (opts.outdir) {
    PLACEHOLDERS_DIR = path.isAbsolute(opts.outdir) ? opts.outdir : path.join(process.cwd(), opts.outdir)
    console.log(`📁 Output dir: ${PLACEHOLDERS_DIR}`)
  }

  // Build the (category -> count) plan.
  let plan = {}
  if (opts.mode === 'test') {
    const cat = positional[0]
    const count = parseInt(positional[1] || '2', 10)
    if (!cat) { console.error('Usage: --test <category> <count>'); process.exit(1) }
    plan[cat] = count
  } else if (opts.mode === 'all') {
    const count = parseInt(positional[0] || '8', 10)
    for (const c of ALL_CATEGORIES) plan[c] = count
  } else if (opts.mode === 'empty') {
    const count = parseInt(positional[0] || '8', 10)
    for (const c of EMPTY_OR_NEW) plan[c] = count
  } else {
    const cat = positional[0]
    const count = parseInt(positional[1] || '8', 10)
    if (!cat) {
      console.error('Usage: node scripts/generate-placeholders.cjs <category|--all|--empty|--test> [count]')
      console.error('Categories: ' + ALL_CATEGORIES.join(', '))
      process.exit(1)
    }
    plan[cat] = count
  }

  // Expand into individual image tasks, skipping existing unless --force.
  const tasks = []
  for (const [category, count] of Object.entries(plan)) {
    for (let k = 0; k < count; k++) {
      const index = opts.start + k
      const file = path.join(PLACEHOLDERS_DIR, category, `${String(index).padStart(2, '0')}.webp`)
      if (!opts.force && fs.existsSync(file)) continue
      tasks.push({ category, index })
    }
  }

  if (tasks.length === 0) {
    console.log('Nothing to generate (all target files already exist — use --force to overwrite).')
    return
  }

  console.log(`🎨 Generating ${tasks.length} placeholder image(s)`)
  console.log(`   quality=${opts.quality}  compression=${opts.compression}  concurrency=${opts.concurrency}  size=1536x1024 webp`)
  console.log('')

  const start = Date.now()
  const { ok, fail } = await runTasks(tasks, opts.concurrency, (t) => generateOne(client, opts, t.category, t.index))
  const secs = Math.round((Date.now() - start) / 1000)
  console.log('')
  console.log(`Done in ${secs}s — ${ok} succeeded, ${fail} failed.`)
  if (fail > 0) process.exitCode = 2
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
