'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const dadosLinks = [
  { href: '/dados',            label: '📊 Visão Geral',  exact: true  },
  { href: '/dados/artilharia', label: '⚽ Artilharia'               },
  { href: '/dados/goleiros',   label: '🧤 Goleiros'                 },
  { href: '/dados/analitico',  label: '🔬 Analítico'                },
];

export default function DadosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div>
      {/* Sub-nav */}
      <div style={{
        background: '#0e0e0e',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 60, // altura do Nav principal
        zIndex: 90,
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.15rem',
          height: 46,
          overflowX: 'auto',
        }}>
          {/* Rótulo */}
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '.8rem',
            color: '#3b82f6',
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            marginRight: '.5rem',
            flexShrink: 0,
          }}>
            Dados
          </span>
          <span style={{ width: 1, height: 18, background: 'var(--border)', marginRight: '.35rem', flexShrink: 0 }} />

          {dadosLinks.map(l => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: '.3rem .8rem',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '.88rem',
                  letterSpacing: '.06em',
                  borderRadius: 4,
                  transition: 'all .15s',
                  color: active ? '#fff' : 'var(--text-muted)',
                  background: active ? 'rgba(59,130,246,.18)' : 'transparent',
                  border: active ? '1px solid rgba(59,130,246,.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
    }
