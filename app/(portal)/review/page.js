import { q, one } from '@/lib/db';
import { rs, num } from '@/lib/format';
import CopyButton from '@/components/CopyButton';

export default async function Review({ searchParams }) {
  const accounts = await q(`select id, name from accounts where stage in ('onboarding','live') or is_demo order by name`);
  const id = accounts.find((a) => a.id === searchParams.account)?.id || accounts[0]?.id;
  if (!id) return <><div className="head"><h1>Monthly review</h1></div><p className="note">Add an onboarding or live account first.</p></>;
  const month = /^\d{4}-\d{2}$/.test(searchParams.month || '') ? searchParams.month : new Date().toISOString().slice(0, 7);
  const a = await one(`select name, fee_inr, hours_included from accounts where id=$1`, [id]);
  const from = `${month}-01`;
  const r = await one(`
    select
      (select count(*)::int from conversations c where c.account_id=$1 and c.updated_at >= $2::date and c.updated_at < $2::date + interval '1 month') as enquiries,
      (select count(*)::int from events where account_id=$1 and event ilike '%listing%' and at >= $2::date and at < $2::date + interval '1 month') as listing_runs,
      (select count(*)::int from visits where account_id=$1 and created_at >= $2::date and created_at < $2::date + interval '1 month') as visits,
      (select count(*)::int from events where account_id=$1 and event ilike '%handover%' and at >= $2::date and at < $2::date + interval '1 month') as handovers,
      (select coalesce(sum(ai_calls),0)::int from events where account_id=$1 and at >= $2::date and at < $2::date + interval '1 month') as ai,
      (select coalesce(sum(msgs),0)::int from events where account_id=$1 and at >= $2::date and at < $2::date + interval '1 month') as msgs,
      (select coalesce(sum(est_cost),0) from events where account_id=$1 and at >= $2::date and at < $2::date + interval '1 month') as cost,
      (select coalesce(sum(hours),0) from hours_log where account_id=$1 and on_date >= $2::date and on_date < $2::date + interval '1 month') as hours`, [id, from]);
  const label = new Date(from + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const summary =
`Namaste, ${a.name} ka ${label} ka report.

Is mahine ${r.enquiries} buyers ne WhatsApp par enquiry ki. Assistant ne ${num(r.msgs, 0)} messages bheje${r.ai ? `, aur ${r.ai} sawalon ka jawab AI se diya` : ''}.
${r.visits} site visit book hui${r.handovers ? `, aur ${r.handovers} buyers ne seedha aapse baat karni chahi` : ''}.

Hamare taraf se ${num(r.hours)} ghante ka kaam hua (plan mein ${num(a.hours_included)} ghante). WhatsApp aur AI ka kharcha ${rs(r.cost)}, jo hum bina margin ke aapko bill karte hain.

Agle mahine ke liye koi badlav chahiye ho to bataiye.`;
  return (
    <>
      <div className="head"><div><h1>Monthly review</h1><p>Numbers for one client and a message you can send them. Edit the text before you copy it.</p></div></div>
      <form className="inline" style={{ marginBottom: 16 }}>
        <label className="f">Account<select name="account" defaultValue={id}>{accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="f">Month<input type="month" name="month" defaultValue={month} /></label>
        <button className="btn">Show</button>
      </form>
      <div className="grid tiles">
        {[['Enquiries', r.enquiries], ['Visits booked', r.visits], ['Handed to dealer', r.handovers], ['AI answers', r.ai], ['Expert hours', num(r.hours)], ['Usage cost', rs(r.cost)]].map(([l, v]) => <div className="card tile" key={l}><div className="label">{l}</div><div className="num">{v}</div></div>)}
      </div>
      <section className="card stack"><h2>Message for the client</h2>
        <textarea id="summary" className="summary" key={id + month} defaultValue={summary} aria-label="Summary text" />
        <div><CopyButton targetId="summary" /></div>
      </section>
    </>
  );
}
