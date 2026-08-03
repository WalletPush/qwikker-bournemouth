-- Partner claims Phase 1 hardening:
-- new statuses, founding/payment fields, verification tokens, audit log, constraints

-- 1) Expand status check: migrate legacy 'claimed' -> 'held', then replace constraint
UPDATE public.partner_claims
SET status = 'held'
WHERE status = 'claimed';

ALTER TABLE public.partner_claims
  DROP CONSTRAINT IF EXISTS partner_claims_status_check;

ALTER TABLE public.partner_claims
  ADD CONSTRAINT partner_claims_status_check
  CHECK (status IN (
    'submitted',
    'email_verified',
    'held',
    'converted',
    'expired',
    'released',
    'rejected'
  ));

-- 2) Lifecycle / verification / founding / payment columns
ALTER TABLE public.partner_claims
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS lng numeric(10, 7),
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_founding_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS founding_slot_number integer,
  ADD COLUMN IF NOT EXISTS founding_terms_version text,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_consumed_at timestamptz;

-- expires_at was NOT NULL historically; allow null until held
ALTER TABLE public.partner_claims
  ALTER COLUMN expires_at DROP NOT NULL;

-- Legacy converted rows predate payment/agreement columns — backfill so new CHECKs can apply
UPDATE public.partner_claims
SET
  converted_at = coalesce(converted_at, claimed_at, created_at, now()),
  agreement_signed_at = coalesce(agreement_signed_at, converted_at, claimed_at, created_at, now()),
  payment_confirmed_at = coalesce(payment_confirmed_at, converted_at, claimed_at, created_at, now()),
  verified_at = coalesce(verified_at, claimed_at, created_at)
WHERE status = 'converted';

-- Legacy held/claimed rows: ensure expires_at + verified_at before CHECKs
UPDATE public.partner_claims
SET
  expires_at = coalesce(expires_at, now() + interval '30 days'),
  verified_at = coalesce(verified_at, claimed_at, created_at, now())
WHERE status = 'held';

-- held rows must have expires_at; verified_at required conceptually enforced in app + partial checks
ALTER TABLE public.partner_claims
  DROP CONSTRAINT IF EXISTS partner_claims_held_requires_expires;

ALTER TABLE public.partner_claims
  ADD CONSTRAINT partner_claims_held_requires_expires
  CHECK (status <> 'held' OR expires_at IS NOT NULL);

ALTER TABLE public.partner_claims
  DROP CONSTRAINT IF EXISTS partner_claims_held_requires_verified;

ALTER TABLE public.partner_claims
  ADD CONSTRAINT partner_claims_held_requires_verified
  CHECK (status <> 'held' OR verified_at IS NOT NULL);

ALTER TABLE public.partner_claims
  DROP CONSTRAINT IF EXISTS partner_claims_converted_requires_payment;

ALTER TABLE public.partner_claims
  ADD CONSTRAINT partner_claims_converted_requires_payment
  CHECK (
    status <> 'converted'
    OR (
      agreement_signed_at IS NOT NULL
      AND payment_confirmed_at IS NOT NULL
      AND converted_at IS NOT NULL
    )
  );

-- 3) Partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_claims_one_active_per_email
  ON public.partner_claims (lower(email))
  WHERE status IN ('submitted', 'email_verified', 'held');

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_claims_one_held_per_city
  ON public.partner_claims (city_slug)
  WHERE status = 'held';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_claims_verification_token
  ON public.partner_claims (verification_token)
  WHERE verification_token IS NOT NULL;

-- 4) Audit log
CREATE TABLE IF NOT EXISTS public.partner_claim_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  claim_id uuid REFERENCES public.partner_claims(id) ON DELETE SET NULL,
  actor text,
  from_status text,
  to_status text,
  note text,
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_partner_claim_audit_claim_id
  ON public.partner_claim_audit (claim_id);

ALTER TABLE public.partner_claim_audit ENABLE ROW LEVEL SECURITY;

-- service role only for audit (no anon policies)

COMMENT ON TABLE public.partner_claim_audit IS 'Status transition audit for partner territory claims';
COMMENT ON COLUMN public.partner_claims.is_founding_eligible IS 'Set at approval/conversion per HQ policy; not inferred later';
COMMENT ON COLUMN public.partner_claims.founding_terms_version IS 'Immutable founding terms version allocated to this claim';
