import { getTime } from '@/lib/data';

interface Props {
  timeId: string;
  size?: number;
  showNome?: boolean;
  showSigla?: boolean;
}

export function EscudoTime({ timeId, size = 44, showNome = false, showSigla = false }: Props) {
  const t = getTime(timeId);
  if (!t) return null;
  const fontSize = Math.round(size * 0.28);
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${t.cor_primaria} 0%, ${t.cor_secundaria || '#888'} 100%)`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Bebas Neue', sans-serif", fontSize, color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,.8)', flexShrink: 0,
        border: '2px solid rgba(255,255,255,.12)',
        boxShadow: '0 2px 8px rgba(0,0,0,.5)',
      }}>{t.sigla}</span>
      {showNome && <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.nome}</span>}
      {showSigla && !showNome && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.sigla}</span>}
    </span>
  );
}
