-- Per-city WalletPush Pass Designer MASTER for loyalty stamp cards.
-- Separate from walletpush_template_id (main city discovery pass).

alter table public.franchise_crm_configs
  add column if not exists walletpush_loyalty_master_template_id text;

comment on column public.franchise_crm_configs.walletpush_loyalty_master_template_id
  is 'Pass Designer loyalty stamp-card MASTER template id for this city. Used to provision per-business stamp cards.';

-- Bournemouth MASTER (Loyalty Stamp Card MASTER)
update public.franchise_crm_configs
set walletpush_loyalty_master_template_id = 'd1534289-cda9-430a-b183-489d6b78071e'
where city = 'bournemouth'
  and (
    walletpush_loyalty_master_template_id is null
    or walletpush_loyalty_master_template_id = ''
  );
