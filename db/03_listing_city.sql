-- Listings get a city so one dealer (or the demo) can cover several cities.
alter table listings add column if not exists city text;

create or replace function sync_listings(p_account uuid, p_rows jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare n_up int; n_off int; res jsonb;
begin
  if p_rows is null or jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('upserted', 0, 'deactivated', 0, 'note', 'no valid rows, nothing changed');
  end if;

  insert into listings (account_id, external_id, kind, city, area, price_lakh, title, details, active)
  select distinct on (r->>'external_id')
         p_account, r->>'external_id', r->>'kind', nullif(r->>'city', ''), r->>'area', (r->>'price_lakh')::numeric,
         r->>'title', coalesce(r->>'details', ''), coalesce((r->>'active')::boolean, true)
  from jsonb_array_elements(p_rows) r
  on conflict (account_id, external_id) where external_id is not null do update set
    kind = excluded.kind, city = excluded.city, area = excluded.area, price_lakh = excluded.price_lakh,
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
revoke execute on function sync_listings(uuid, jsonb) from public, anon, authenticated;
