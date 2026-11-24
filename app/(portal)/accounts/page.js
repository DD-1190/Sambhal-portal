import Link from 'next/link';
import { q } from '@/lib/db';
import { STAGES } from '@/lib/catalog';
import { rs, num, pct, barClass } from '@/lib/format';
import { createAccount, moveStage } from './actions';

export default async function Accounts({ searchParams }) {
  const rows = await q(`select m.*, a.city, a.is_demo from v_account_month m join accounts a on a.id=m.account_id order by m.name`);
  return (
    <>
      <div className="head"><div><h1>Accounts</h1><p>Every client from first enquiry to live. Open a card to run their jobs.</p></div></div>
      {searchParams.err && <div className="msg" role="alert">{searchParams.err}</div>}
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Add account</summary>
        <form action={createAccount} className="inline" style={{ marginTop: 12 }}>
          <label className="f">Business name<input type="text" name="name" required /></label>
          <label className="f">City<input type="text" name="city" /></label>
          <label className="f">Contact person<input type="text" name="contact" /></label>
          <button className="btn primary">Create</button>
        </form>
      </details>
      <div className="kanban">
        {STAGES.map(([key, label]) => {
          const list = rows.filter((r) => r.stage === key);
          return (
            <section className="col" key={key} aria-label={label}>
              <h3>{label}<span>{list.length}</span></h3>
              {list.map((r) => {
                const hp = pct(r.hours_used, r.hours_included);
                return (
                  <div key={r.account_id} className="lead">
                    <Link href={`/accounts/${r.account_id}`} style={{ textDecoration: 'none' }}>
                      <b>{r.name}</b><small>{r.city || ''}{r.is_demo ? ' · demo' : ''}</small>
                    </Link>
                    <div className="meta">
                      <span className="pill">{rs(r.fee_inr)}/mo</span>
                      <span className="pill">{r.jobs_on}/{r.jobs_allowed} jobs</span>
                      {r.hours_included > 0 && <span className={`pill ${hp >= 100 ? 'bad' : hp >= 80 ? 'warn' : ''}`}>{num(r.hours_used)}/{num(r.hours_included)} h</span>}
                    </div>
                    <form action={moveStage} className="row" style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={r.account_id} />
                      <select name="stage" defaultValue={key} aria-label={`Stage for ${r.name}`}>{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                      <button className="btn sm">Move</button>
                    </form>
                  </div>
                );
              })}
              {list.length === 0 && <p className="note" style={{ margin: 6 }}>Empty</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
