import Nav from '@/components/Nav';
import { logout } from '../login/actions';

export const dynamic = 'force-dynamic';

export default function PortalLayout({ children }) {
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="mark">S</span><div><b>Sambhal</b><small>Operations portal</small></div></div>
        <Nav />
        <div className="foot"><form action={logout}><button>Sign out</button></form></div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
