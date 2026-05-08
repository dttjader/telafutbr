'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const publicLinks = [
  { href: '/', label: 'Rodadas' },
  { href: '/tabela', label: 'Tabela' },
  { href: '/artilharia', label: 'Artilharia' },
];
const adminLinks = [
  { href: '/admin/estadios', label: 'Estádios' },
  { href: '/admin/jogadores', label: 'Jogadores' },
  { href: '/admin/partidas', label: 'Partidas' },
];

export function Nav() {
  const p = usePathname();
  const isAdmin = p.startsWith('/admin');

  const s: Record<string, React.CSSProperties> = {
    header: { background: '#111', borderBottom: '3px solid var(--verde)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,168,79,.15)' },
    inner: { maxWidth: 1100, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
    logo: { display: 'flex', alignItems: 'center', gap: '.6rem' },
    logoIcon: { fontSize: '1.7rem', lineHeight: 1 },
    logoTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '.1em', color: 'var(--amarelo)', lineHeight: 1 },
    logoSub: { fontSize: '.65rem', color: 'var(--verde)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const },
    nav: { display: 'flex', gap: '.15rem', alignItems: 'center' },
    divider: { width: 1, height: 20, background: 'var(--border)', margin: '0 .5rem' },
    adminLabel: { fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginRight: '.25rem' },
  };

  const linkStyle = (href: string, admin = false): React.CSSProperties => ({
    padding: '.35rem .8rem',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '.95rem',
    letterSpacing: '.06em',
    borderRadius: 4,
    transition: 'all .15s',
    color: p === href ? (admin ? 'var(--amarelo-card)' : 'var(--amarelo)') : 'var(--text-muted)',
    background: p === href ? (admin ? 'rgba(245,158,11,.1)' : 'rgba(255,223,0,.08)') : 'transparent',
  });

  return (
    <header style={s.header}>
      <div style={s.inner}>
        <Link href="/" style={s.logo}>
          <span style={s.logoIcon}>🇧🇷</span>
          <div>
            <div style={s.logoTitle}>BRASILEIRÃO</div>
            <div style={s.logoSub}>Série A · 2024</div>
          </div>
        </Link>
        <nav style={s.nav}>
          {publicLinks.map(l => <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>)}
          <div style={s.divider} />
          <span style={s.adminLabel}>Admin</span>
          {adminLinks.map(l => <Link key={l.href} href={l.href} style={linkStyle(l.href, true)}>{l.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
