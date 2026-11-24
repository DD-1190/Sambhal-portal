'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { pool, q } from '@/lib/db';

export async function createAccount(fd) {
  const name = String(fd.get('name') || '').trim();
  if (!name) redirect('/accounts?err=' + encodeURIComponent('Business name is required.'));
  const client = await pool.connect();
  let id;
  try {
    await client.query('begin');
    const r = await client.query(
      `insert into accounts (name, city, contact_name, stage) values ($1,$2,$3,'lead') returning id`,
      [name, String(fd.get('city') || '').trim() || null, String(fd.get('contact') || '').trim() || null]);
    id = r.rows[0].id;
    await client.query(`insert into account_config (account_id) values ($1)`, [id]);
    await client.query(`insert into usage_caps (account_id) values ($1)`, [id]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    redirect('/accounts?err=' + encodeURIComponent(e.message));
  } finally { client.release(); }
  revalidatePath('/accounts');
  redirect(`/accounts/${id}`);
}

export async function moveStage(fd) {
  await q(`update accounts set stage=$2 where id=$1`, [fd.get('id'), fd.get('stage')]);
  revalidatePath('/accounts');
  redirect('/accounts');
}
