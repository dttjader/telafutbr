'use client';
import { useState } from 'react';
import { Partida, Time, Estadio } from '@/lib/types';
import { CardPartida } from './CardPartida';
import { formatDate } from '@/lib/utils';

const PARTIDAS_POR_RODADA = 10;

interface Props {
  partidas: Partida[];
  times: Time[];
  estadios: Estadio[];
}

export function RodadasClient({ partidas, times, estadios }: Props) {
  const sorted = [...partidas].sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));
  const rodadas = [...new Set(sorted.map(p => p.rodada))].sort((a, b) => a - b);

  // Determine a rodada atual (última incompleta ou mais recente)
  const rodadaAtual = rodadas.reduce((atual, rod) => {
    const count = sorted.filter(p => p.rodada === rod).length;
    if (count < PARTIDAS_POR_RODADA) return rod;
    return atual;
  }, rodadas[rodadas.length - 1]);

  // Rodadas completas iniciam fechadas, exceto a atual
  const initialOpen: Record<number, boolean> = {};
  for (const rod of rodadas) {
    const count = sorted.filter(p => p.rodada === rod).length;
    const completa = count >= PARTIDAS_POR_RODADA;
    initialOpen[rod] = !completa || rod === rodadaAtual;
  }

  const [open, setOpen] = useState<Record<number, boolean>>(initialOpen);
  const toggle = (rod: number) => setOpen(o => ({ ...o, [rod]: !o[rod] }));

  const statusLabel: Record<string, string> = { encerrada: 'Encerrada', em_andamento: 'Em Andamento', futura: 'Em Breve' };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Resultados & Jogos</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', color: 'var(--text)' }}>Rodadas</h1>
        </div>
      </div>

      <div className="container">
        {rodadas.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            Nenhuma partida cadastrada ainda. <a href="/admin/partidas" style={{ color: 'var(--verde)' }}>Cadastrar →</a>
          </p>
        )}

        {rodadas.map(rod => {
          const ps = sorted.filter(p => p.rodada === rod);
          const count = ps.length;
          const completa = count >= PARTIDAS_POR_RODADA;
          const isOpen = open[rod] ?? true;
          const encerradas = ps.filter(p => p.status === 'encerrada').length;
          const emAndamento = ps.filter(p => p.status === 'ao_vivo').length;

          return (
            <section key={rod} style={{ marginBottom: '1rem' }}>
              {/* Header clicável */}
              <button
                onClick={() => toggle(rod)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  background: isOpen ? 'var(--surface)' : 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderBottom: isOpen ? '1px solid var(--border)' : '1px solid var(--border)',
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  padding: '.85rem 1.25rem', cursor: 'pointer',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1 }}>
                  {rod}ª Rodada
                </span>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', flex: 1 }}>
                  {count} partida(s) · {encerradas} encerrada(s)
                  {emAndamento > 0 && <span style={{ color: 'var(--rebaixamento)', marginLeft: '.5rem' }}>🔴 {emAndamento} ao vivo</span>}
                </span>
                {completa && (
                  <span style={{ fontSize: '.68rem', background: 'rgba(0,168,79,.12)', color: 'var(--verde)', border: '1px solid rgba(0,168,79,.25)', borderRadius: 4, padding: '.15rem .5rem', fontWeight: 700 }}>
                    COMPLETA
                  </span>
                )}
                {rod === rodadaAtual && !completa && (
                  <span style={{ fontSize: '.68rem', background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)', borderRadius: 4, padding: '.15rem .5rem', fontWeight: 700 }}>
                    ATUAL
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
              </button>

              {/* Conteúdo */}
              {isOpen && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '1rem', background: 'var(--surface)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
                    {ps.map(p => <CardPartida key={p.id} partida={p} times={times} estadios={estadios} />)}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
