-- Partners opportunity + Tier 1 reserved — ONE run, READ ONLY
-- Safe when partner_markets is missing (returns MISSING rows instead of erroring).
--
-- Columns: section | sort_key | key | value | city_slug | city_name | status | detail | n
-- Start with section 13_tier1_summary for go/no-go.

create or replace function pg_temp.partners_full_sanity()
returns table (
  section text,
  sort_key int,
  key text,
  value text,
  city_slug text,
  city_name text,
  status text,
  detail text,
  n bigint
)
language plpgsql
as $$
#variable_conflict use_column
declare
  has_markets boolean := to_regclass('public.partner_markets') is not null;
  has_waitlist boolean := to_regclass('public.partner_waitlist') is not null;
  has_claims boolean := to_regclass('public.partner_claims') is not null;
begin
  -- 1) Tables
  return query
  select
    '01_tables'::text,
    1,
    t.key,
    t.value,
    null::text, null::text, null::text, null::text, null::bigint
  from (
    values
      ('partner_claims', coalesce(to_regclass('public.partner_claims')::text, 'MISSING')),
      ('partner_waitlist', coalesce(to_regclass('public.partner_waitlist')::text, 'MISSING')),
      ('partner_markets', coalesce(to_regclass('public.partner_markets')::text, 'MISSING')),
      ('partner_claim_audit', coalesce(to_regclass('public.partner_claim_audit')::text, 'MISSING')),
      ('franchise_crm_configs', coalesce(to_regclass('public.franchise_crm_configs')::text, 'MISSING'))
  ) as t(key, value);

  -- 2) Claim columns
  if has_claims then
    return query
    select
      '02_claim_columns'::text, 2, c.column_name::text, c.data_type::text,
      null::text, null::text, null::text, null::text, null::bigint
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'partner_claims'
    order by c.ordinal_position;
  end if;

  -- 3) Claim status mix
  if has_claims then
    return query
    select
      '03_claim_status_mix'::text, 3, pc.status::text, null::text,
      null::text, null::text, pc.status::text, null::text, count(*)::bigint
    from public.partner_claims pc
    group by pc.status;
  end if;

  -- 4) Active holds
  if has_claims then
    return query
    select
      '04_active_holds'::text, 4, 'hold'::text, null::text,
      pc.city_slug::text, pc.city_name::text, pc.status::text,
      coalesce(pc.expires_at::text, 'no expiry'), null::bigint
    from public.partner_claims pc
    where pc.status in ('held', 'claimed')
      and (pc.expires_at is null or pc.expires_at > now());
  end if;

  -- 5) Waitlist
  if has_waitlist then
    return query
    select
      '05_waitlist'::text, 5, 'waitlist_rows'::text, null::text,
      null::text, null::text, null::text, null::text,
      (select count(*)::bigint from public.partner_waitlist);
  else
    return query
    select
      '05_waitlist'::text, 5, 'waitlist_rows'::text, 'MISSING'::text,
      null::text, null::text, null::text, null::text, null::bigint;
  end if;

  -- 6) Live franchises
  return query
  select
    '06_live_franchises'::text, 6, 'live'::text, f.display_name::text,
    f.city::text, f.display_name::text, f.status::text,
    concat_ws(',', f.lat::text, f.lng::text), null::bigint
  from public.franchise_crm_configs f
  where f.status in ('active', 'coming_soon', 'pending_setup');

  -- 7–10) Markets (or MISSING stub)
  if not has_markets then
    return query
    select * from (values
      ('07_markets_summary'::text, 7, 'partner_markets'::text, 'MISSING — Phase 2 not applied'::text,
       null::text, null::text, null::text, 'Do not insert Tier 1 until Phase 2 migration runs'::text, null::bigint),
      ('08_tier1_column'::text, 8, 'has_is_tier_one_column'::text, 'false'::text,
       null::text, null::text, null::text, 'table missing'::text, null::bigint),
      ('10_reserved_markets'::text, 10, 'reserved'::text, 'NONE — table missing'::text,
       null::text, null::text, null::text, null::text, 0::bigint)
    ) as v(section, sort_key, key, value, city_slug, city_name, status, detail, n);
  else
    return query execute $q$
      select
        '07_markets_summary'::text, 7, v.key::text, null::text,
        null::text, null::text, null::text, null::text, v.n
      from (
        select
          count(*)::bigint as markets,
          count(*) filter (where status = 'owned')::bigint as owned,
          count(*) filter (where status = 'reserved')::bigint as reserved,
          count(*) filter (where status = 'available')::bigint as available,
          count(*) filter (where tier = 'hub')::bigint as hubs,
          count(*) filter (where tier = 'partner')::bigint as partners,
          count(*) filter (where lat is not null and lng is not null)::bigint as with_coords
        from public.partner_markets
      ) s
      cross join lateral (
        values
          ('markets', s.markets),
          ('owned', s.owned),
          ('reserved', s.reserved),
          ('available', s.available),
          ('hubs', s.hubs),
          ('partners', s.partners),
          ('with_coords', s.with_coords)
      ) as v(key, n)
    $q$;

    return query
    select
      '08_tier1_column'::text, 8, 'has_is_tier_one_column'::text,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'partner_markets'
          and column_name = 'is_tier_one'
      )::text,
      null::text, null::text, null::text, null::text, null::bigint;

    return query execute $q$
      select
        '09_markets_rows'::text, 9, pm.tier::text, null::text,
        pm.city_slug::text, pm.city_name::text, pm.status::text,
        concat_ws(',', pm.lat::text, pm.lng::text), null::bigint
      from (
        select *
        from public.partner_markets
        order by
          case status when 'owned' then 0 when 'reserved' then 1 else 2 end,
          sort_order,
          city_name
        limit 80
      ) pm
    $q$;

    return query execute $q$
      select
        '10_reserved_markets'::text, 10, 'reserved'::text, null::text,
        pm.city_slug::text, pm.city_name::text, pm.status::text,
        pm.tier::text, null::bigint
      from public.partner_markets pm
      where pm.status = 'reserved'
    $q$;
  end if;

  -- 11) Founding snapshot (markets optional)
  if has_markets then
    return query execute $q$
      with live as (
        select distinct city as city_slug
        from public.franchise_crm_configs
        where status in ('active', 'coming_soon', 'pending_setup')
        union
        select city_slug from public.partner_markets where status = 'owned'
      ),
      holds as (
        select distinct city_slug
        from public.partner_claims
        where status = 'converted'
           or (status in ('held', 'claimed') and (expires_at is null or expires_at > now()))
      ),
      scored as (
        select
          (select count(*)::bigint from live) as live_owned_slugs,
          (select count(*)::bigint from holds) as claim_secured_slugs,
          (select count(*)::bigint from (
            select city_slug from live union select city_slug from holds
          ) u) as founding_secured_unique
      )
      select
        '11_founding_snapshot'::text, 11, v.key::text, null::text,
        null::text, null::text, null::text, null::text, v.n
      from scored s
      cross join lateral (
        values
          ('live_owned_slugs', s.live_owned_slugs),
          ('claim_secured_slugs', s.claim_secured_slugs),
          ('founding_secured_unique', s.founding_secured_unique)
      ) as v(key, n)
    $q$;
  else
    return query execute $q$
      with live as (
        select distinct city as city_slug
        from public.franchise_crm_configs
        where status in ('active', 'coming_soon', 'pending_setup')
      ),
      holds as (
        select distinct city_slug
        from public.partner_claims
        where status = 'converted'
           or (status in ('held', 'claimed') and (expires_at is null or expires_at > now()))
      ),
      scored as (
        select
          (select count(*)::bigint from live) as live_owned_slugs,
          (select count(*)::bigint from holds) as claim_secured_slugs,
          (select count(*)::bigint from (
            select city_slug from live union select city_slug from holds
          ) u) as founding_secured_unique
      )
      select
        '11_founding_snapshot'::text, 11, v.key::text, 'no partner_markets'::text,
        null::text, null::text, null::text, null::text, v.n
      from scored s
      cross join lateral (
        values
          ('live_owned_slugs', s.live_owned_slugs),
          ('claim_secured_slugs', s.claim_secured_slugs),
          ('founding_secured_unique', s.founding_secured_unique)
      ) as v(key, n)
    $q$;
  end if;

  -- 12 + 13) Tier 1 decision + summary
  if has_markets then
    return query execute $q$
      with intended as (
        select * from (values
          ('manchester'),('bristol'),('edinburgh'),('birmingham'),('glasgow'),
          ('liverpool'),('auckland'),('bali'),('koh-samui'),('lisbon'),('porto'),
          ('valencia'),('barcelona'),('cape-town'),('vancouver'),('austin'),
          ('denver'),('dublin'),('copenhagen'),('stockholm'),('prague'),('vienna'),
          ('brighton'),('leeds'),('cardiff')
        ) as t(city_slug)
      ),
      live as (
        select distinct city as city_slug
        from public.franchise_crm_configs
        where status in ('active', 'coming_soon', 'pending_setup')
      ),
      holds as (
        select distinct city_slug
        from public.partner_claims
        where status in ('held', 'claimed')
          and (expires_at is null or expires_at > now())
      ),
      markets as (
        select city_slug, status from public.partner_markets
      )
      select
        '12_tier1_decision'::text, 12, d.action::text, null::text,
        d.city_slug::text, null::text, d.market_status::text,
        concat('live=', d.is_live_franchise::text, '; hold=', d.has_active_claim_hold::text),
        null::bigint
      from (
        select
          i.city_slug,
          (l.city_slug is not null) as is_live_franchise,
          (h.city_slug is not null) as has_active_claim_hold,
          m.status as market_status,
          case
            when l.city_slug is not null then 'SKIP — already Live'
            when h.city_slug is not null then 'OK — reserved via claim hold'
            when m.status = 'reserved' then 'OK — already reserved in markets'
            when m.city_slug is not null then 'NEED — in markets but still ' || m.status
            else 'NEED — missing from partner_markets'
          end as action
        from intended i
        left join live l on l.city_slug = i.city_slug
        left join holds h on h.city_slug = i.city_slug
        left join markets m on m.city_slug = i.city_slug
      ) d
      order by
        case
          when d.is_live_franchise then 0
          when d.has_active_claim_hold or d.market_status = 'reserved' then 1
          else 2
        end,
        d.city_slug
    $q$;

    return query execute $q$
      with intended as (
        select * from (values
          ('manchester'),('bristol'),('edinburgh'),('birmingham'),('glasgow'),
          ('liverpool'),('auckland'),('bali'),('koh-samui'),('lisbon'),('porto'),
          ('valencia'),('barcelona'),('cape-town'),('vancouver'),('austin'),
          ('denver'),('dublin'),('copenhagen'),('stockholm'),('prague'),('vienna'),
          ('brighton'),('leeds'),('cardiff')
        ) as t(city_slug)
      ),
      live as (
        select distinct city as city_slug
        from public.franchise_crm_configs
        where status in ('active', 'coming_soon', 'pending_setup')
      ),
      holds as (
        select distinct city_slug
        from public.partner_claims
        where status in ('held', 'claimed')
          and (expires_at is null or expires_at > now())
      ),
      markets as (
        select city_slug, status from public.partner_markets
      ),
      scored as (
        select
          count(*)::bigint as intended_tier1,
          count(*) filter (where l.city_slug is not null)::bigint as already_live_skip,
          count(*) filter (
            where l.city_slug is null
              and (h.city_slug is not null or m.status = 'reserved')
          )::bigint as already_showing_reserved,
          count(*) filter (
            where l.city_slug is null
              and h.city_slug is null
              and m.city_slug is not null
              and m.status <> 'reserved'
          )::bigint as in_markets_not_reserved_yet,
          count(*) filter (
            where l.city_slug is null
              and h.city_slug is null
              and m.city_slug is null
          )::bigint as missing_from_markets
        from intended i
        left join live l on l.city_slug = i.city_slug
        left join holds h on h.city_slug = i.city_slug
        left join markets m on m.city_slug = i.city_slug
      )
      select
        '13_tier1_summary'::text, 13, v.key::text, null::text,
        null::text, null::text, null::text, null::text, v.n
      from scored sc
      cross join lateral (
        values
          ('intended_tier1', sc.intended_tier1),
          ('already_live_skip', sc.already_live_skip),
          ('already_showing_reserved', sc.already_showing_reserved),
          ('in_markets_not_reserved_yet', sc.in_markets_not_reserved_yet),
          ('missing_from_markets', sc.missing_from_markets)
      ) as v(key, n)
    $q$;
  else
    -- No markets table: every non-live city without a claim hold needs Phase 2 first
    return query
    with intended as (
      select * from (values
        ('manchester'),('bristol'),('edinburgh'),('birmingham'),('glasgow'),
        ('liverpool'),('auckland'),('bali'),('koh-samui'),('lisbon'),('porto'),
        ('valencia'),('barcelona'),('cape-town'),('vancouver'),('austin'),
        ('denver'),('dublin'),('copenhagen'),('stockholm'),('prague'),('vienna'),
        ('brighton'),('leeds'),('cardiff')
      ) as t(city_slug)
    ),
    live as (
      select distinct city as city_slug
      from public.franchise_crm_configs
      where status in ('active', 'coming_soon', 'pending_setup')
    ),
    holds as (
      select distinct city_slug
      from public.partner_claims
      where status in ('held', 'claimed')
        and (expires_at is null or expires_at > now())
    ),
    decided as (
      select
        i.city_slug,
        (l.city_slug is not null) as is_live_franchise,
        (h.city_slug is not null) as has_active_claim_hold,
        case
          when l.city_slug is not null then 'SKIP — already Live'
          when h.city_slug is not null then 'OK — reserved via claim hold'
          else 'NEED — partner_markets MISSING (apply Phase 2 first)'
        end as action
      from intended i
      left join live l on l.city_slug = i.city_slug
      left join holds h on h.city_slug = i.city_slug
    )
    select
      '12_tier1_decision'::text, 12, d.action::text, null::text,
      d.city_slug::text, null::text, null::text,
      concat('live=', d.is_live_franchise::text, '; hold=', d.has_active_claim_hold::text),
      null::bigint
    from decided d
    order by
      case
        when d.is_live_franchise then 0
        when d.has_active_claim_hold then 1
        else 2
      end,
      d.city_slug;

    return query
    with intended as (
      select * from (values
        ('manchester'),('bristol'),('edinburgh'),('birmingham'),('glasgow'),
        ('liverpool'),('auckland'),('bali'),('koh-samui'),('lisbon'),('porto'),
        ('valencia'),('barcelona'),('cape-town'),('vancouver'),('austin'),
        ('denver'),('dublin'),('copenhagen'),('stockholm'),('prague'),('vienna'),
        ('brighton'),('leeds'),('cardiff')
      ) as t(city_slug)
    ),
    live as (
      select distinct city as city_slug
      from public.franchise_crm_configs
      where status in ('active', 'coming_soon', 'pending_setup')
    ),
    holds as (
      select distinct city_slug
      from public.partner_claims
      where status in ('held', 'claimed')
        and (expires_at is null or expires_at > now())
    ),
    scored as (
      select
        count(*)::bigint as intended_tier1,
        count(*) filter (where l.city_slug is not null)::bigint as already_live_skip,
        count(*) filter (
          where l.city_slug is null and h.city_slug is not null
        )::bigint as already_showing_reserved,
        0::bigint as in_markets_not_reserved_yet,
        count(*) filter (
          where l.city_slug is null and h.city_slug is null
        )::bigint as missing_from_markets
      from intended i
      left join live l on l.city_slug = i.city_slug
      left join holds h on h.city_slug = i.city_slug
    )
    select
      '13_tier1_summary'::text, 13, v.key::text, 'partner_markets MISSING'::text,
      null::text, null::text, null::text,
      'Phase 2 migration required before Tier 1 reserved catalogue'::text,
      v.n
    from scored sc
    cross join lateral (
      values
        ('intended_tier1', sc.intended_tier1),
        ('already_live_skip', sc.already_live_skip),
        ('already_showing_reserved', sc.already_showing_reserved),
        ('in_markets_not_reserved_yet', sc.in_markets_not_reserved_yet),
        ('missing_from_markets', sc.missing_from_markets)
    ) as v(key, n);
  end if;
end;
$$;

select *
from pg_temp.partners_full_sanity()
order by sort_key, section, key nulls last, city_slug nulls last;
