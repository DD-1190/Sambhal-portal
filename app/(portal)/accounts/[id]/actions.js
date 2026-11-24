'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { q, one } from '@/lib/db';
import { DEFAULT_CONFIG } from '@/lib/catalog';

const back = (id, tab, kind, msg) =>
  redirect(`/accounts/${id}?tab=${tab}${msg ? `&${kind}=${encodeURIComponent(msg)}` : ''}`);
const s = (fd, k) => String(fd.get(k) ?? '').trim();

async function run(id, tab, fn, okMsg) {
  try { await fn(); } catch (e) { back(id, tab, 'err', e.message); }
  revalidatePath(`/accounts/${id}`);
  back(id, tab, 'ok', okMsg);
}

export async function saveBasics(fd) {
  const id = s(fd, 'id');
  await run(id, 'overview', () => q(
    `update accounts set name=$2, city=$3, contact_name=$4, stage=$5, fee_inr=$6, hours_included=$7, jobs_allowed=$8 where id=$1`,
    [id, s(fd, 'name'), s(fd, 'city') || null, s(fd, 'contact') || null, s(fd, 'stage'),
     Number(fd.get('fee')) || 0, Number(fd.get('hours')) || 0, Number(fd.get('jobs')) || 1]), 'Saved.');
}

export async function toggleJob(fd) {
  const id = s(fd, 'id'), job = s(fd, 'job'), on = s(fd, 'on') === '1';
  await run(id, 'jobs', () => q(
    `insert into jobs (account_id, job_key, enabled) values ($1,$2,$3)
     on conflict (account_id, job_key) do update set enabled = excluded.enabled`, [id, job, on]),
    on ? 'Job turned on.' : 'Job turned off.');
}

export async function logHours(fd) {
  const id = s(fd, 'id');
  const h = Number(fd.get('hours'));
  if (!(h > 0)) return back(id, 'hours', 'err', 'Enter hours greater than zero.');
  await run(id, 'hours', () => q(`insert into hours_log (account_id, on_date, task, hours) values ($1,$2,$3,$4)`,
    [id, s(fd, 'date') || new Date().toISOString().slice(0, 10), s(fd, 'task') || 'Work', h]), 'Hours logged.');
}
export async function deleteHours(fd) {
  const id = s(fd, 'id');
  await run(id, 'hours', () => q(`delete from hours_log where id=$1 and account_id=$2`, [fd.get('row'), id]), 'Entry removed.');
}
export async function saveCap(fd) {
  const id = s(fd, 'id');
  await run(id, 'hours', () => q(
    `insert into usage_caps (account_id, monthly_cap_inr) values ($1,$2)
     on conflict (account_id) do update set monthly_cap_inr = excluded.monthly_cap_inr`, [id, Number(fd.get('cap')) || 0]), 'Cap saved.');
}

export async function saveWA(fd) {
  const id = s(fd, 'id');
  const pnid = s(fd, 'phone_number_id');
  if (!pnid) return back(id, 'whatsapp', 'err', 'Phone number ID is required.');
  const token = s(fd, 'token');
  await run(id, 'whatsapp', async () => {
    const cur = await one(`select access_token from account_wa where account_id=$1`, [id]);
    const t = token || cur?.access_token;
    if (!t) throw new Error('Access token is required for a new connection.');
    await q(`insert into account_wa (account_id, phone_number_id, waba_id, display_number, access_token, dealer_phone)
             values ($1,$2,$3,$4,$5,$6)
             on conflict (account_id) do update set phone_number_id=excluded.phone_number_id, waba_id=excluded.waba_id,
               display_number=excluded.display_number, access_token=excluded.access_token, dealer_phone=excluded.dealer_phone`,
      [id, pnid, s(fd, 'waba_id') || null, s(fd, 'display') || null, t, s(fd, 'dealer_phone').replace(/\D/g, '') || null]);
  }, 'WhatsApp connection saved.');
}

export async function saveSheet(fd) {
  const id = s(fd, 'id');
  const sid = s(fd, 'sheet_id');
  await run(id, 'listings', async () => {
    if (!sid) return q(`delete from account_sheets where account_id=$1`, [id]);
    await q(`insert into account_sheets (account_id, sheet_id, tab) values ($1,$2,$3)
             on conflict (account_id) do update set sheet_id=excluded.sheet_id, tab=excluded.tab`, [id, sid, s(fd, 'tab') || 'Listings']);
  }, 'Sheet link saved.');
}

export async function saveListing(fd) {
  const id = s(fd, 'id');
  await run(id, 'listings', () => q(
    `insert into listings (account_id, kind, city, area, price_lakh, title, details) values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, s(fd, 'kind'), s(fd, 'city') || null, s(fd, 'area'), Number(fd.get('price')), s(fd, 'title'), s(fd, 'details')]), 'Listing added.');
}
export async function toggleListing(fd) {
  const id = s(fd, 'id');
  await run(id, 'listings', () => q(`update listings set active = not active where id=$1 and account_id=$2`, [fd.get('row'), id]), 'Updated.');
}
export async function deleteListing(fd) {
  const id = s(fd, 'id');
  await run(id, 'listings', () => q(`delete from listings where id=$1 and account_id=$2`, [fd.get('row'), id]), 'Listing removed.');
}

export async function saveConfig(fd) {
  const id = s(fd, 'id');
  let cfg;
  try { cfg = JSON.parse(String(fd.get('config'))); } catch { return back(id, 'settings', 'err', 'That is not valid JSON.'); }
  if (typeof cfg !== 'object' || Array.isArray(cfg) || !cfg) return back(id, 'settings', 'err', 'Settings must be a JSON object.');
  for (const k of ['kinds', 'budgets', 'areas', 'slots']) {
    if (k in cfg && !Array.isArray(cfg[k])) return back(id, 'settings', 'err', `"${k}" must be a list.`);
  }
  await run(id, 'settings', () => q(
    `insert into account_config (account_id, config) values ($1,$2)
     on conflict (account_id) do update set config = excluded.config`, [id, JSON.stringify(cfg)]), 'Settings saved.');
}
export async function resetConfig(fd) {
  const id = s(fd, 'id');
  await run(id, 'settings', () => q(
    `insert into account_config (account_id, config) values ($1,'{}'::jsonb)
     on conflict (account_id) do update set config='{}'::jsonb`, [id]), 'Back to defaults.');
}
