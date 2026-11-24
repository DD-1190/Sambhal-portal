import Link from 'next/link';
import { q, one } from '@/lib/db';
import { rs, num, dt } from '@/lib/format';

export default async function Overview() {
  const cap = Number(process.env.CAPACITY_HOURS || 80);
  const rows = await q(`select * from v_account_month a where not exists (select 1 from accounts x where x.id=a.account_id and x.is_demo) order by name`);
  const live = rows.filter((r) => r.stage === 'live');
  const mrr = live.reduce((s, r) => s + r.fee_inr, 0);
  const hours = rows.filter((r) => ['onboarding', 'live'].includes(r.stage)).reduce((s, r) => s + r.hours_used, 0);
  const cost = rows.reduce((s, r) => s + r.est_cost, 0);
  const failed = await one(`select count(*)::int n from events where status='failed' and at > now() - interval '7 days'`);
  const errs = await one(`select count(*)::int n from system_errors where at > now() - interval '7 days'`);
  const alerts = [];
  for (const r of rows) {
    if (r.hours_included > 0 && r.hours_used >= 0.8 * r.hours_included)
      alerts.push({ id: r.account_id, bad: r.hours_used >= r.hours_included, t: `${r.name}: ${num(r.hours_used)} of ${num(r.hours_included)} expert hours used. Time to talk about upgrading.` });
    if (r.est_cost >= 0.8 * r.cap_inr)
      alerts.push({ id: r.account_id, bad: r.est_cost >= r.cap_inr, t: `${r.name}: usage ${rs(r.est_cost)} of ${rs(r.cap_inr)} cap${r.est_cost >= r.cap_inr ? '. AI answers are paused.' : '.'}` });
  }
  if (failed.n) alerts.push({ href: '/runlog?status=failed', bad: true, t: `${failed.n} failed run(s) in the last 7 days.` });
  if (errs.n) alerts.push({ href: '/system', bad: true, t: `${errs.n} workflow error(s) in the last 7 days.` });
  const recent = await q(`select e.at, e.event, e.status, e.msgs, a.name, a.id from events e join accounts a on a.id=e.account_id order by e.at desc limit 8`);

  return (
    <>
      <div className="head"><div><h1>Overview</h1><p>This month at a glance. Hours and usage reset on the 1st.</p></div>
        <Link className="btn primary" href="/accounts">Open pipeline</Link></div>
      <div className="grid tiles">
        <div className="card tile"><div className="label">Recurring revenue</div><div className="num">{rs(mrr)}</div><div className="sub">{live.length} live account(s)</div></div>
        <div className="card tile"><div className="label">Hours this month</div><div className="num">{num(hours)} / {cap}</div><div className="sub">Capacity used {Math.round((hours / cap) * 100)}%</div></div>
        <div className="card tile"><div className="label">Usage cost (estimate)</div><div className="num">{rs(cost)}</div><div className="sub">Billed at cost, no margin</div></div>
        <div className="card tile"><div className="label">Accounts</div><div className="num">{rows.length}</div><div className="sub">{rows.filter((r) => r.stage === 'lead').length} lead(s), {rows.filter((r) => r.stage === 'onboarding').length} onboarding</div></div>
      </div>
      <div className="grid two">
        <section className="card"><h2>Needs attention</h2>
          {alerts.length === 0 ? <p className="note" style={{ marginTop: 10 }}>Nothing right now.</p> :
            <ul className="alerts">{alerts.map((a, i) => <li key={i} className={a.bad ? 'bad' : ''}><span>{a.t}</span>{(a.id || a.href) && <Link href={a.href || `/accounts/${a.id}`}>Open</Link>}</li>)}</ul>}
        </section>
        <section className="card"><h2>Recent activity</h2>
          {recent.length === 0 ? <p className="note" style={{ marginTop: 10 }}>No runs yet.</p> :
            <table style={{ marginTop: 8 }}><tbody>{recent.map((e, i) => <tr key={i}><td><Link href={`/accounts/${e.id}?tab=runs`}>{e.name}</Link><div className="note">{e.event}</div></td><td className="note">{dt(e.at)}</td><td><span className={`pill ${e.status === 'ok' ? 'good' : 'bad'}`}>{e.status}</span></td></tr>)}</tbody></table>}
        </section>
      </div>
    </>
  );
}
