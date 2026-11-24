-- Run after schema.sql. Adds Google Sheet listing sync, usage and hours alerts, and an error log.

-- ---------- Listing sync ----------
alter table listings add column if not exists external_id text;
create unique index if not exists listings_ext_idx on listings(account_id, external_id) where external_id is not null;

-- One Google Sheet per dealer. Share the sheet with the Google account connected in n8n.
create table if not exists account_sheets (
  account_id  uuid primary key references accounts(id) on delete cascade,
  sheet_id    text not null,
  tab         text not null default 'Listings',
  last_synced timestamptz,
  last_result jsonb
);

-- The sheet is the source of truth: listings missing from it are switched off, not deleted.
-- An empty or fully invalid sheet changes nothing, so a bad edit cannot wipe a dealer's stock.
create or replace function sync_listings(p_account uuid, p_rows jsonb) returns jsonb
language plpgsql as $$
declare n_up int; n_off int; res jsonb;
begin
  if p_rows is null or jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('upserted', 0, 'deactivated', 0, 'note', 'no valid rows, nothing changed');
  end if;

  insert into listings (account_id, external_id, kind, area, price_lakh, title, details, active)
  select distinct on (r->>'external_id')
         p_account, r->>'external_id', r->>'kind', r->>'area', (r->>'price_lakh')::numeric,
         r->>'title', coalesce(r->>'details', ''), coalesce((r->>'active')::boolean, true)
  from jsonb_array_elements(p_rows) r
  on conflict (account_id, external_id) where external_id is not null do update set
    kind = excluded.kind, area = excluded.area, price_lakh = excluded.price_lakh,
    title = excluded.title, details = excluded.details, active = excluded.active;
  get diagnostics n_up = row_count;

  update listings set active = false
  where account_id = p_account and active
    and (external_id is null or external_id not in (select r->>'external_id' from jsonb_array_elements(p_rows) r));
  get diagnostics n_off = row_count;

  res := jsonb_build_object('upserted', n_up, 'deactivated', n_off);
  update account_sheets set last_synced = now(), last_result = res where account_id = p_account;
  return res;
end $$;

-- ---------- Alerts ----------
create table if not exists alerts_sent (
  account_id uuid not null references accounts(id) on delete cascade,
  kind       text not null,
  month      date not null,
  primary key (account_id, kind, month)
);

-- Each alert fires once per account per month.
create or replace view v_alerts_due as
select m.account_id, m.name, k.kind, k.detail,
       w.phone_number_id, w.access_token, w.dealer_phone
from v_account_month m
join accounts a on a.id = m.account_id and not a.is_demo and a.stage in ('onboarding','live')
left join account_wa w on w.account_id = m.account_id
cross join lateral (values
  ('usage_80',  m.est_cost >= 0.8 * m.cap_inr and m.est_cost < m.cap_inr,
     'Usage Rs ' || round(m.est_cost) || ' of Rs ' || round(m.cap_inr) || ' monthly cap'),
  ('usage_100', m.est_cost >= m.cap_inr,
     'Usage cap reached at Rs ' || round(m.est_cost) || '. AI free-text answers are paused.'),
  ('hours_80',  m.hours_used >= 0.8 * m.hours_included,
     m.hours_used || ' of ' || m.hours_included || ' expert hours used')
) as k(kind, hit, detail)
where k.hit
  and not exists (select 1 from alerts_sent s
                  where s.account_id = m.account_id and s.kind = k.kind and s.month = date_trunc('month', now())::date);

-- ---------- Errors from any workflow ----------
create table if not exists system_errors (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  workflow      text,
  node          text,
  message       text,
  execution_url text
);
