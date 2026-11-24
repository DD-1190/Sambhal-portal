import pg from 'pg';

// numeric -> number, bigint -> number
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const g = globalThis;
const url = process.env.DATABASE_URL || '';
export const pool =
  g.__sambhalPool ||
  new pg.Pool({
    connectionString: url,
    max: 5,
    ssl: /supabase|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
if (process.env.NODE_ENV !== 'production') g.__sambhalPool = pool;

export async function q(text, params = []) {
  const r = await pool.query(text, params);
  return r.rows;
}
export async function one(text, params = []) {
  return (await q(text, params))[0] || null;
}
