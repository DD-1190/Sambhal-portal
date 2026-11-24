import { CATALOG } from '@/lib/catalog';

export default function Catalogue() {
  return (
    <>
      <div className="head"><div><h1>Job catalogue</h1><p>Everything Sambhal can deliver. A job is switched on per account; the plan decides how many.</p></div></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        {CATALOG.map((j) => (
          <section className="card stack" key={j.id}>
            <div className="spread"><h2>{j.name}</h2><span className={`pill ${j.status === 'Ready' ? 'good' : ''}`}>{j.status}</span></div>
            <p style={{ margin: 0 }}>{j.desc}</p>
            <div><b>Needed from the client</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{j.setup.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <div className="row">{j.uses.map((u) => <span className="pill" key={u}>{u}</span>)}</div>
          </section>
        ))}
      </div>
    </>
  );
}
