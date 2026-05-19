'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const publicLinks = [
  { href: '/', label: 'Rodadas' },
  { href: '/tabela', label: 'Tabela' },
  { href: '/confrontos', label: 'Confrontos' },
  { href: '/artilharia', label: 'Artilharia' },
  { href: '/analitico', label: 'Analítico' },
  { href: '/dados', label: 'Dados' },
];

const adminLinks = [
  { href: '/admin/estadios', label: 'Estádios' },
  { href: '/admin/jogadores', label: 'Jogadores' },
  { href: '/admin/tecnicos', label: 'Técnicos' },
  { href: '/admin/partidas', label: 'Partidas' },
  { href: '/admin/config', label: 'Config' },
];

export function Nav() {
  const p = usePathname();
  const isAdmin = p.startsWith('/admin');
  const [menuOpen, setMenuOpen] = useState(false);

  const linkStyle = (href: string, admin = false): React.CSSProperties => ({
    padding: '.35rem .8rem',
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '.95rem',
    letterSpacing: '.06em',
    borderRadius: 4,
    transition: 'all .15s',
    color: p === href ? (admin ? 'var(--amarelo-card)' : 'var(--amarelo)') : 'var(--text-muted)',
    background: p === href ? (admin ? 'rgba(245,158,11,.1)' : 'rgba(255,223,0,.08)') : 'transparent',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <header style={{ background: '#111', borderBottom: '3px solid var(--verde)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,168,79,.15)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>🇧🇷</span>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '.1em', color: 'var(--amarelo)', lineHeight: 1 }}>BRASILEIRÃO</div>
            <div style={{ fontSize: '.65rem', color: 'var(--verde)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const }}>Série A · 2026</div>
          </div>
        </Link>

        {/* Nav pública (sempre visível, sem links admin) */}
        {!isAdmin && (
          <nav style={{ display: 'flex', gap: '.15rem', alignItems: 'center' }}>
            {publicLinks.map(l => <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>)}
          </nav>
        )}

        {/* Nav admin (só aparece em /admin/*) */}
        {isAdmin && (
          <nav style={{ display: 'flex', gap: '.15rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ ...linkStyle('/'), marginRight: '.5rem', fontSize: '.8rem' }}>← Site</Link>
            <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 .25rem' }} />
            <span style={{ fontSize: '.65rem', color: 'var(--amarelo-card)', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginRight: '.25rem', fontWeight: 700 }}>Admin</span>
            {adminLinks.map(l => <Link key={l.href} href={l.href} style={linkStyle(l.href, true)}>{l.label}</Link>)}
          </nav>
        )}
      </div>
    </header>
  );
}
