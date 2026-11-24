'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', 'Overview'],
  ['/accounts', 'Accounts'],
  ['/runlog', 'Run log'],
  ['/review', 'Monthly review'],
  ['/catalogue', 'Job catalogue'],
  ['/system', 'System'],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Portal sections">
      {ITEMS.map(([href, label]) => {
        const cur = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={cur ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
