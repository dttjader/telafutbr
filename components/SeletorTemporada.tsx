'use client';
import { useRouter } from 'next/navigation';
import { definirTemporadaCookie } from '@/lib/client';
import type { Temporada } from '@/lib/types';

// Seletor de temporada do menu. Guarda a escolha em cookie e recarrega a página
// para que todas as telas passem a ler a temporada escolhida.
export function SeletorTemporada({ temporadas, selecionada }: { temporadas: Temporada[]; selecionada: number }) {
  const router = useRouter();
  if (temporadas.length <= 1) return null;
  return (
    <select
      aria-label="Temporada"
      value={selecionada}
      onChange={e => { definirTemporadaCookie(Number(e.target.value)); router.refresh(); }}
      style={{
        background: 'var(--surface2)', color: 'var(--amarelo)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '.25rem .5rem', fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '.95rem', letterSpacing: '.06em', cursor: 'pointer', width: 'auto',
      }}
    >
      {temporadas.map(t => (
        <option key={t.ano} value={t.ano}>{t.ano}{t.atual ? ' (atual)' : ''}</option>
      ))}
    </select>
  );
}
