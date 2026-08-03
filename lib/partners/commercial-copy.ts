/**
 * Territory partner commercial wording — sell ownership, timing, movement.
 * Not SaaS. Digital territory in the AI economy.
 */

export const commercialCopy = {
  pageTitle: 'The Next Generation of Local Business Starts Here | Qwikker',
  pageDescription:
    'Reserve your city, build its AI ecosystem, and become the founding partner behind tomorrow’s local discovery.',
  framing: 'Qwikker Territory Partner Opportunity',

  heroHeadline: 'Own your city’s AI future.',
  heroLead:
    'Control your own slice of one of the fastest-growing industries in the world.',
  /** @deprecated alias — use heroLead */
  heroSub:
    'Control your own slice of one of the fastest-growing industries in the world.',
  heroBody:
    'As AI replaces traditional search, every town and city will need someone to build, grow and manage its local AI ecosystem.',
  heroClose: 'That could be you.',
  heroCtaSub: 'Become the exclusive Qwikker partner for your territory.',
  positioning: 'This isn’t a SaaS seat. It’s exclusive rights to grow your city’s AI ecosystem.',

  territoryLabel: 'Qwikker territory',
  territoryRightsSummary:
    'Operate Qwikker in your assigned city territory under a territory partner agreement.',
  exclusivitySummary:
    'One partner territory per market. Exact exclusivity terms are defined in your partner agreement.',
  foundingTermsSummary:
    'Founding partner terms apply to the first 100 founding territories secured.',
  transferSummary: 'Transfer and exit terms are defined in your partner agreement.',
  monthlyPriceLabel: 'Qwikker monthly',
  slaReviewCopy:
    'After verification, our team will review your territory enquiry and contact you within two business days.',
  holdExplainer:
    'After approval, your territory is held for 30 days while we complete onboarding.',
  importedProfilesCopy:
    'Launch with hundreds of enriched local business profiles already present — giving your territory immediate depth and a ready-made prospect base.',
  ecosystemLabel: 'The complete Qwikker local ecosystem',
  platformBuiltCopy: 'A complete, continually evolving platform',
  calculatorDisclaimer:
    'Illustrative only. Not a guarantee of earnings. Figures show estimated business subscription revenue before tax, payment processing, staff and other local costs. Each territory is responsible for its own OpenAI / AI API usage costs, which are not included above.',
  calculatorApiNote:
    'API usage: each city covers its own OpenAI credits and AI API costs. Those sit outside this estimate and vary with usage.',
  recommendedPricingNote:
    'Recommended launch pricing in USD. Local pricing may be adjusted with HQ approval.',
  foundingCounterLabel: (secured: number, total = 100) =>
    `${secured} of ${total} founding territories secured`,
  foundingCapMessaging:
    'Founding partner terms are currently allocated. You can still enquire about a territory under standard partner terms.',
  privacyConsentEnquiry:
    'I agree that Qwikker may process my details to review this territory enquiry. See our Privacy Policy.',
  marketingConsentOptional:
    'Send me occasional updates about Qwikker partner opportunities (optional).',

  finalHeadline: 'The next generation of local business starts here.',
  finalBody: 'The AI revolution isn’t coming. It’s already here.',
  finalQuestion: 'Will you help build it — or watch someone else own your city?',
} as const

export type CommercialCopy = typeof commercialCopy
