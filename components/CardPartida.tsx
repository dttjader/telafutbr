'use client';
import Link from 'next/link';
import { Partida, Time, Estadio } from '@/lib/types';
import { EscudoTime } from './EscudoTime';
import { formatDate } from '@/lib/utils';

interface Props {
  partida: Partida;
  times: Time[];
  estadios: Estadio[];
}

const statusLabel: Record<string, string> = { agendada: 'Agendada', ao_vivo: '🔴 Ao Vivo', encerrada: 'Encerrada', adiada: 'Adiada' };
const statusColor: Record<string, string> = { agendada: '#6b7280', ao_vivo: '#ef4444', encerrada: 'var(--libertadores)', adiada: 'var(--amarelo-card)' };

export function CardPartida({ partida, times, estadios }: Props) {
  const tc = times.find(t => t.id === partida.time_casa_id);
  const tv = times.find(t => t.id === partida.time_visitante_id);
  const estadio = estadios.find(e => e.id === partida.estadio_id);
  const enc = partida.status === 'encerrada' || partida.status === 'ao_vivo';

  return (
    <Link href={`/partida/${partida.id}`} style={{
      display: 'block', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '1.25rem', textDecoration: 'none',
    }} className="card-partida-link">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: statusColor[partida.status] }}>
          {statusLabel[partida.status]}
        </span>
        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
          {formatDate(partida.data)} · {partida.hora}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.3rem', flex: 1 }}>
          <EscudoTime time={tc} size={48} />
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.95rem' }}>{tc?.sigla}</span>
        </div>
        <div style={{ textAlign: 'center', flex: '0 0 auto', minWidth: 80 }}>
          {enc
            ? <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span>{partida.placar_casa}</span>
                <span style={{ color: 'var(--verde)', fontSize: '1.4rem' }}>×</span>
                <span>{partida.placar_visitante}</span>
              </div>
            : <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', color: 'var(--text-muted)' }}>VS</div>
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.3rem', flex: 1 }}>
          <EscudoTime time={tv} size={48} />
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.95rem' }}>{tv?.sigla}</span>
        </div>
      </div>

      {enc && partida.gols.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '.6rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1 }}>{partida.gols.filter(g => g.time_id === partida.time_casa_id).map(g => `⚽ ${g.minuto}'`).join('  ')}</div>
          <div style={{ flex: 1, textAlign: 'right' }}>{partida.gols.filter(g => g.time_id === partida.time_visitante_id).map(g => `${g.minuto}' ⚽`).join('  ')}</div>
        </div>
      )}

      <div style={{ fontSize: '.7rem', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{estadio?.nome ?? ''}</span>
        {enc && partida.publico > 0 && <span>{partida.publico.toLocaleString('pt-BR')} presentes</span>}
      </div>

      {partida.link_cbf && (
        <div
          role="link"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(partida.link_cbf, '_blank', 'noopener,noreferrer'); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); window.open(partida.link_cbf, '_blank', 'noopener,noreferrer'); } }}
          style={{
            marginTop: '.6rem', fontSize: '.7rem', color: 'var(--verde)',
            textDecoration: 'none', borderTop: '1px solid var(--border)',
            paddingTop: '.5rem', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: '.3rem',
          }}
        >
          🔗 Súmula CBF
        </div>
      )}
    </Link>
  );
      }
