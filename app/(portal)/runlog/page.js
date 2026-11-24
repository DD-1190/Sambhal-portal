import Link from 'next/link';
import { q } from '@/lib/db';
import { rs, dt } from '@/lib/format';

export default async function RunLog({ searchParams }) {
  const accounts = await q(`select id, name from accounts order by name`);
  const where = [], p = [];
  const acc = /^[0-9a-f-]{36}$/i.test(searchParams.account || '') ? searchParams.account : '';
  if (acc) { p.push(acc); where.push(`e.account_id=$${p.length}`); }
  if (['ok', 'failed'].includes(searchParams.status)) { p.push(searchParams.status); where.push(`e.status=$${p.length}`); }
  const rows = await q(`select e.*, a.name from events e join accounts a on a.id=e.account_id ${where.length ? 'where ' + where.join(' and ') : ''} order by e.at desc limit 200`, p);
  return (
    <>
      <div className="head"><div><h1>Run log</h1><p>Every automation run across all clients. Latest 200.</p></div></div>
      <form className="inline" style={{ marginBottom: 14 }}>
        <label className="f">Account<select name="account" defaultValue={acc}><option value="">All</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="f">Status<select name="status" defaultValue={searchParams.status || ''}><option value="">All</option><option value="ok">OK</option><option value="failed">Failed</option></select></label>
        <button className="btn">Filter</button>
      </form>
      <div className="tablewrap"><table>
        <thead><tr><th>Time</th><th>Account</th><th>Event</th><th className="n">Msgs</th><th className="n">AI</th><th className="n">Cost</th><th>Status</th></tr></thead>
        <tbody>{rows.map((e) => <tr key={e.id}><td>{dt(e.at)}</td><td><Link href={`/accounts/${e.account_id}?tab=runs`}>{e.name}</Link></td><td>{e.event}</td><td className="n">{e.msgs}</td><td className="n">{e.ai_calls}</td><td className="n">{rs(e.est_cost)}</td><td><span className={`pill ${e.status === 'ok' ? 'good' : 'bad'}`}>{e.status}</span></td></tr>)}
          {rows.length === 0 && <tr><td colSpan="7" className="note">No runs match.</td></tr>}</tbody>
      </table></div>
    </>
  );
}
