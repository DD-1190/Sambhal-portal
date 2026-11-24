import { login } from './actions';

export default function Login({ searchParams }) {
  return (
    <div className="login">
      <form action={login} className="card stack">
        <div className="brand"><span className="mark" style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: 'var(--on-accent)', display: 'grid', placeItems: 'center', font: '700 16px var(--display)' }}>S</span><h1 style={{ fontSize: 22 }}>Sambhal Portal</h1></div>
        {searchParams.err && <div className="msg" role="alert">Wrong password.</div>}
        <label className="f">Password
          <input type="password" name="password" autoFocus required autoComplete="current-password" />
        </label>
        <button className="btn primary">Sign in</button>
      </form>
    </div>
  );
}
