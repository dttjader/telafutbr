'use client';
import { useRouter } from 'next/navigation';
import { definirDivisaoCookie } from '@/lib/client';
import { DIVISOES } from '@/lib/utils';

// Seletor de divisão do menu (só aparece quando a temporada tem mais de uma divisão).
export function SeletorDivisao({ divisoes, selecionada }: { divisoes: number[]; selecionada: number }) {
  const router = useRouter();
  const opcoes = DIVISOES.filter(d => divisoes.includes(d.id));
  if (opcoes.length <= 1) return null;
  return (
    <select
      aria-label="Divisão"
      value={selecionada}
      onChange={e => { definirDivisaoCookie(Number(e.target.value)); router.refresh(); }}
      style={{
        background: 'var(--surface2)', color: 'var(--verde)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '.25rem .5rem', fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '.95rem', letterSpacing: '.06em', cursor: 'pointer', width: 'auto',
      }}
    >
      {opcoes.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
    </select>
  );
}
