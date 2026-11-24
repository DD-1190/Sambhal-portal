import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { CATALOG, STAGES, DEFAULT_CONFIG } from '@/lib/catalog';
import { rs, num, pct, barClass, dt } from '@/lib/format';
import * as A from './actions';

const TABS = [['overview', 'Overview'], ['jobs', 'Jobs'], ['whatsapp', 'WhatsApp'], ['listings', 'Listings'], ['settings', 'Settings'], ['hours', 'Hours & usage'], ['runs', 'Activity']];
const Hid = ({ id }) => <input type="hidden" name="id" value={id} />;

function Meter({ label, used, total, money }) {
  const p = pct(used, total);
  return (
    <div>
      <div className="spread"><span>{label}</span><span className="mono">{money ? `${rs(used)} / ${rs(total)}` : `${num(used)} / ${num(total)}`}</span></div>
      <div className={`bar ${barClass(p)}`} role="progressbar" aria-valuenow={Math.min(p, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={label}
        style={{ marginTop: 6 }}><i style={{ width: Math.min(p, 100) + '%', background: p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--good)' }} /></div>
    </div>
  );
}

export default async function Account({ params, searchParams }) {
  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await one(`select m.*, a.city, a.contact_name, a.is_demo from v_account_month m join accounts a on a.id=m.account_id where m.account_id=$1`, [id]);
  if (!m) notFound();
  const tab = TABS.some((t) => t[0] === searchParams.tab) ? searchParams.tab : 'overview';
  const flash = searchParams.err ? <div className="msg" role="alert">{searchParams.err}</div> : searchParams.ok ? <div className="msg ok" role="status">{searchParams.ok}</div> : null;

  let body = null;
  if (tab === 'overview') {
    body = (
      <div className="grid two">
        <section className="card stack"><h2>This month</h2>
          <Meter label="Expert hours" used={m.hours_used} total={m.hours_included} />
          <Meter label="Usage cost (estimate)" used={m.est_cost} total={m.cap_inr} money />
          <dl className="kv"><dt>Messages sent</dt><dd>{num(m.msgs, 0)}</dd><dt>AI answers</dt><dd>{num(m.ai_calls, 0)}</dd><dt>Visits booked</dt><dd>{num(m.visits_booked, 0)}</dd><dt>Jobs on</dt><dd>{m.jobs_on} of {m.jobs_allowed}</dd></dl>
        </section>
        <section className="card"><h2>Plan and details</h2>
          <form action={A.saveBasics} className="stack" style={{ marginTop: 10 }}>
            <Hid id={id} />
            <label className="f">Business name<input type="text" name="name" defaultValue={m.name} required /></label>
            <div className="row">
              <label className="f">City<input type="text" name="city" defaultValue={m.city || ''} /></label>
              <label className="f">Contact<input type="text" name="contact" defaultValue={m.contact_name || ''} /></label>
            </div>
            <div className="row">
              <label className="f">Stage<select name="stage" defaultValue={m.stage}>{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="f">Fee ₹/month<input type="number" name="fee" min="0" defaultValue={m.fee_inr} /></label>
            </div>
            <div className="row">
              <label className="f">Hours included<input type="number" name="hours" min="0" step="0.5" defaultValue={m.hours_included} /></label>
              <label className="f">Jobs allowed<input type="number" name="jobs" min="1" defaultValue={m.jobs_allowed} /></label>
            </div>
            <div><button className="btn primary">Save</button></div>
          </form>
        </section>
      </div>
    );
  }

  if (tab === 'jobs') {
    const on = Object.fromEntries((await q(`select job_key, enabled from jobs where account_id=$1`, [id])).map((r) => [r.job_key, r.enabled]));
    body = (
      <div className="stack">
        <p className="note">The plan allows {m.jobs_allowed} job(s). Turning on one more is blocked by the database, so you cannot give extra work away by accident.</p>
        {CATALOG.map((j) => {
          const live = j.status === 'Ready';
          return (
            <div className="card job" key={j.id}>
              <div><b>{j.name}</b> <span className={`pill ${live ? 'good' : ''}`}>{j.status}</span><p>{j.desc}</p></div>
              <form action={A.toggleJob}>
                <Hid id={id} /><input type="hidden" name="job" value={j.id} /><input type="hidden" name="on" value={on[j.id] ? '0' : '1'} />
                <button className={`btn ${on[j.id] ? '' : 'primary'}`} disabled={!live && !on[j.id]}>{on[j.id] ? 'Turn off' : live ? 'Turn on' : 'Not built yet'}</button>
              </form>
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === 'whatsapp') {
    const w = await one(`select * from account_wa where account_id=$1`, [id]);
    const last = await one(`select at from events where account_id=$1 order by at desc limit 1`, [id]);
    body = (
      <div className="grid two">
        <form action={A.saveWA} className="card stack">
          <h2>Connection</h2><Hid id={id} />
          <label className="f">Phone number ID (from Meta)<input type="text" name="phone_number_id" defaultValue={w?.phone_number_id || ''} required /></label>
          <label className="f">WhatsApp Business Account ID<input type="text" name="waba_id" defaultValue={w?.waba_id || ''} /></label>
          <label className="f">Display number<input type="text" name="display" defaultValue={w?.display_number || ''} placeholder="+91 98xxxxxx" /></label>
          <label className="f">Dealer phone for alerts (digits, with 91)<input type="text" name="dealer_phone" defaultValue={w?.dealer_phone || ''} /></label>
          <label className="f">Access token {w && <span>(saved, ends …{w.access_token.slice(-4)}). Leave blank to keep it.</span>}
            <input type="password" name="token" autoComplete="off" /></label>
          <div><button className="btn primary">Save connection</button></div>
        </form>
        <section className="card stack"><h2>Status</h2>
          <dl className="kv"><dt>Connected</dt><dd>{w && !/CHANGE_ME/.test(w.phone_number_id) ? <span className="pill good">Yes</span> : <span className="pill warn">Not yet</span>}</dd><dt>Last activity</dt><dd>{last ? dt(last.at) : 'None yet'}</dd></dl>
          <p className="note">The client should own the Meta Business account, so the number stays theirs if they leave. Use the webhook URL from your n8n workflow in Meta, then send a test message to this number.</p>
          <p className="note">Phase 0: the token is stored as plain text in the database. Move it to Supabase Vault or encrypt it before taking real clients.</p>
        </section>
      </div>
    );
  }

  if (tab === 'listings') {
    const sh = await one(`select * from account_sheets where account_id=$1`, [id]);
    const rows = await q(`select * from listings where account_id=$1 order by active desc, city nulls first, area, price_lakh`, [id]);
    body = (
      <div className="stack">
        <section className="card"><h2>Google Sheet sync</h2>
          <form action={A.saveSheet} className="inline" style={{ marginTop: 10 }}>
            <Hid id={id} />
            <label className="f">Sheet ID<input type="text" name="sheet_id" defaultValue={sh?.sheet_id || ''} style={{ minWidth: 280 }} /></label>
            <label className="f">Tab<input type="text" name="tab" defaultValue={sh?.tab || 'Listings'} /></label>
            <button className="btn">Save</button>
          </form>
          <p className="note" style={{ marginTop: 8 }}>{sh ? `Last sync ${dt(sh.last_synced)}${sh.last_result ? ' · ' + JSON.stringify(sh.last_result) : ''}.` : 'No sheet linked. You can also add listings by hand below.'} Rows missing from the sheet are switched off, never deleted.</p>
        </section>
        <section className="card"><h2>Add listing</h2>
          <form action={A.saveListing} className="inline" style={{ marginTop: 10 }}>
            <Hid id={id} />
            <label className="f">Type<select name="kind"><option value="flat">Flat</option><option value="plot">Plot</option></select></label>
            <label className="f">City<input type="text" name="city" placeholder="Optional" /></label>
            <label className="f">Area<input type="text" name="area" required /></label>
            <label className="f">Price (lakh)<input type="number" name="price" min="0" step="0.1" required /></label>
            <label className="f">Title<input type="text" name="title" required placeholder="2 BHK, 1,050 sq ft" /></label>
            <label className="f">Details<input type="text" name="details" /></label>
            <button className="btn primary">Add</button>
          </form>
        </section>
        <div className="tablewrap"><table>
          <thead><tr><th>Type</th><th>City</th><th>Area</th><th className="n">Lakh</th><th>Title</th><th>Details</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((l) => (
            <tr key={l.id}><td>{l.kind}</td><td>{l.city || '-'}</td><td>{l.area}</td><td className="n">{num(l.price_lakh)}</td><td>{l.title}</td><td>{l.details}</td>
              <td><span className={`pill ${l.active ? 'good' : ''}`}>{l.active ? 'Active' : 'Off'}</span></td>
              <td><div className="row">
                <form action={A.toggleListing}><Hid id={id} /><input type="hidden" name="row" value={l.id} /><button className="btn sm">{l.active ? 'Switch off' : 'Switch on'}</button></form>
                <form action={A.deleteListing}><Hid id={id} /><input type="hidden" name="row" value={l.id} /><button className="btn sm danger">Delete</button></form>
              </div></td></tr>))}
            {rows.length === 0 && <tr><td colSpan="8" className="note">No listings yet.</td></tr>}</tbody>
        </table></div>
      </div>
    );
  }

  if (tab === 'settings') {
    const c = await one(`select config from account_config where account_id=$1`, [id]);
    const has = c && Object.keys(c.config).length > 0;
    body = (
      <div className="stack">
        <p className="note">{has ? 'This account uses its own settings.' : 'Empty means defaults are used.'} Edit the JSON to change buyer questions, budget bands, areas, visit slots and the greeting. {'{name}'} in the greeting becomes the business name. Button titles must stay within 20 characters.</p>
        <form action={A.saveConfig} className="stack"><Hid id={id} />
          <label className="f" htmlFor="cfg">Settings (JSON)</label>
          <textarea id="cfg" name="config" defaultValue={JSON.stringify(has ? c.config : DEFAULT_CONFIG, null, 2)} spellCheck="false" />
          <div className="row"><button className="btn primary">Save settings</button></div>
        </form>
        <form action={A.resetConfig}><Hid id={id} /><button className="btn danger">Reset to defaults</button></form>
      </div>
    );
  }

  if (tab === 'hours') {
    const hrs = await q(`select * from hours_log where account_id=$1 order by on_date desc, id desc limit 50`, [id]);
    body = (
      <div className="grid two">
        <section className="stack">
          <div className="card"><h2>Log hours</h2>
            <form action={A.logHours} className="inline" style={{ marginTop: 10 }}>
              <Hid id={id} />
              <label className="f">Date<input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
              <label className="f">Task<input type="text" name="task" required /></label>
              <label className="f">Hours<input type="number" name="hours" min="0.25" step="0.25" required style={{ width: 90 }} /></label>
              <button className="btn primary">Log</button>
            </form></div>
          <div className="tablewrap"><table><thead><tr><th>Date</th><th>Task</th><th className="n">Hours</th><th></th></tr></thead>
            <tbody>{hrs.map((h) => <tr key={h.id}><td>{new Date(h.on_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td><td>{h.task}</td><td className="n">{num(h.hours, 2)}</td>
              <td><form action={A.deleteHours}><Hid id={id} /><input type="hidden" name="row" value={h.id} /><button className="btn sm danger">Remove</button></form></td></tr>)}
              {hrs.length === 0 && <tr><td colSpan="4" className="note">Nothing logged.</td></tr>}</tbody></table></div>
        </section>
        <section className="card stack"><h2>Limits</h2>
          <Meter label="Expert hours this month" used={m.hours_used} total={m.hours_included} />
          <Meter label="Usage cost this month" used={m.est_cost} total={m.cap_inr} money />
          <form action={A.saveCap} className="inline"><Hid id={id} />
            <label className="f">Monthly usage cap ₹<input type="number" name="cap" min="0" defaultValue={m.cap_inr} /></label>
            <button className="btn">Save cap</button></form>
          <p className="note">At the cap, the assistant stops free-text AI answers and keeps the button flow running. Costs are estimates from the rates in Settings. Check them against the Meta invoice each month.</p>
        </section>
      </div>
    );
  }

  if (tab === 'runs') {
    const ev = await q(`select * from events where account_id=$1 order by at desc limit 40`, [id]);
    const vs = await q(`select * from visits where account_id=$1 order by slot_at desc limit 20`, [id]);
    const cv = await q(`select * from conversations where account_id=$1 order by updated_at desc limit 15`, [id]);
    body = (
      <div className="stack">
        <h2>Visits</h2>
        <div className="tablewrap"><table><thead><tr><th>When</th><th>Buyer</th><th>Listing</th><th>Status</th></tr></thead>
          <tbody>{vs.map((v) => <tr key={v.id}><td>{dt(v.slot_at)}</td><td>{v.buyer_name || v.wa_id}</td><td>{v.listing_title}</td><td><span className="pill">{v.status}{v.reminder_sent ? ' · reminded' : ''}</span></td></tr>)}
            {vs.length === 0 && <tr><td colSpan="4" className="note">No visits yet.</td></tr>}</tbody></table></div>
        <h2>Conversations</h2>
        <div className="tablewrap"><table><thead><tr><th>Buyer</th><th>Step</th><th>Updated</th></tr></thead>
          <tbody>{cv.map((c) => <tr key={c.wa_id}><td>{c.buyer_name || c.wa_id}</td><td><span className="pill">{c.step}</span></td><td>{dt(c.updated_at)}</td></tr>)}
            {cv.length === 0 && <tr><td colSpan="3" className="note">None yet.</td></tr>}</tbody></table></div>
        <h2>Runs</h2>
        <div className="tablewrap"><table><thead><tr><th>Time</th><th>Event</th><th className="n">Msgs</th><th className="n">AI</th><th className="n">Cost</th><th>Status</th></tr></thead>
          <tbody>{ev.map((e) => <tr key={e.id}><td>{dt(e.at)}</td><td>{e.event}</td><td className="n">{e.msgs}</td><td className="n">{e.ai_calls}</td><td className="n">{rs(e.est_cost)}</td><td><span className={`pill ${e.status === 'ok' ? 'good' : 'bad'}`}>{e.status}</span></td></tr>)}
            {ev.length === 0 && <tr><td colSpan="6" className="note">No runs yet.</td></tr>}</tbody></table></div>
      </div>
    );
  }

  return (
    <>
      <div className="head"><div><p className="note"><Link href="/accounts">Accounts</Link> /</p><h1>{m.name}</h1><p>{m.city || 'No city'} · <span className="pill">{STAGES.find((s) => s[0] === m.stage)?.[1]}</span></p></div></div>
      <nav className="tabs" aria-label="Account sections">
        {TABS.map(([k, l]) => <Link key={k} href={`/accounts/${id}?tab=${k}`} aria-selected={tab === k}>{l}</Link>)}
      </nav>
      {flash}
      {body}
    </>
  );
}
