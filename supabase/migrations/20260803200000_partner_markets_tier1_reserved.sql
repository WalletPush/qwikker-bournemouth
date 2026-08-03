-- Mark premium (tier-1) partner markets as reserved for public scarcity UI.
-- Live hubs stay owned. Remaining secondary markets stay available (claimable via search, not pinned).

ALTER TABLE public.partner_markets
  ADD COLUMN IF NOT EXISTS is_tier_one boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.partner_markets.is_tier_one IS
  'Premium territories — reserved for founding FOMO; later unlock via Tier 1 sale';

UPDATE public.partner_markets
SET
  is_tier_one = true,
  status = CASE WHEN status = 'available' THEN 'reserved' ELSE status END,
  updated_at = now()
WHERE city_slug IN (
  'manchester',
  'bristol',
  'edinburgh',
  'birmingham',
  'glasgow',
  'liverpool',
  'auckland',
  'bali',
  'koh-samui',
  'lisbon',
  'porto',
  'valencia',
  'barcelona',
  'cape-town',
  'vancouver',
  'austin',
  'denver',
  'dublin',
  'copenhagen',
  'stockholm',
  'prague',
  'vienna',
  'brighton',
  'leeds',
  'cardiff'
)
AND tier = 'partner';
