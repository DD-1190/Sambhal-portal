import { q, one } from '@/lib/db';
import { dt } from '@/lib/format';

export default async function System() {
  const errs = await q(`select * from system_errors order by at desc limit 50`);
  const last = await one(`select max(at) as at from events`);
  const syncs = await q(`select a.name, s.last_synced, s.last_result from account_sheets s join accounts a on a.id=s.account_id order by a.name`);
  const db = await one(`select now() as t`);
  return (
    <>
      <div className="head"><div><h1>System</h1><p>Health of the workflows behind the portal.</p></div></div>
      <div className="grid tiles">
        <div className="card tile"><div className="label">Database</div><div className="num" style={{ fontSize: 20 }}><span className="pill good">Connected</span></div><div className="sub">{dt(db.t)}</div></div>
        <div className="card tile"><div className="label">Last automation run</div><div className="num" style={{ fontSize: 20 }}>{last?.at ? dt(last.at) : 'None yet'}</div></div>
      </div>
      <h2 style={{ marginBottom: 8 }}>Listing sync</h2>
      <div className="tablewrap" style={{ marginBottom: 20 }}><table><thead><tr><th>Account</th><th>Last sync</th><th>Result</th></tr></thead>
        <tbody>{syncs.map((s) => <tr key={s.name}><td>{s.name}</td><td>{dt(s.last_synced)}</td><td className="mono">{s.last_result ? JSON.stringify(s.last_result) : '-'}</td></tr>)}
          {syncs.length === 0 && <tr><td colSpan="3" className="note">No sheets linked.</td></tr>}</tbody></table></div>
      <h2 style={{ marginBottom: 8 }}>Workflow errors</h2>
      <div className="tablewrap"><table><thead><tr><th>Time</th><th>Workflow</th><th>Node</th><th>Message</th></tr></thead>
        <tbody>{errs.map((e) => <tr key={e.id}><td>{dt(e.at)}</td><td>{e.workflow}</td><td>{e.node}</td><td>{e.execution_url ? <a href={e.execution_url}>{e.message}</a> : e.message}</td></tr>)}
          {errs.length === 0 && <tr><td colSpan="4" className="note">No errors recorded.</td></tr>}</tbody></table></div>
    </>
  );
}
