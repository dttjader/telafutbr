'use client';
import { useState, useMemo } from 'react';
import { Partida, Time, Estadio } from '@/lib/types';
import { CardPartida } from './CardPartida';
import { EscudoTime } from './EscudoTime';

// Considera rodada completa apenas com 10 partidas de fato ENCERRADAS
// (agendada, ao vivo e adiada não contam para a rodada estar "fechada")
const PARTIDAS_POR_RODADA = 10;

interface Props {
  partidas: Partida[];
  times: Time[];
  estadios: Estadio[];
}

export function RodadasClient({ partidas, times, estadios }: Props) {
  const sorted = useMemo(() => [...partidas].sort((a, b) => a.rodada - b.rodada || (a.data || '').localeCompare(b.data)), [partidas]);
  const rodadas = useMemo(() => [...new Set(sorted.map(p => p.rodada))].sort((a, b) => b - a), [sorted]);

  const rodadaAtual = useMemo(() => {
    const rodsAsc = [...rodadas].sort((a, b) => a - b);
    return rodsAsc.reduce((atual, rod) => {
      // Só conta partidas realmente encerradas para considerar a rodada completa
      const count = sorted.filter(p => p.rodada === rod && p.status === 'encerrada').length;
      if (count < PARTIDAS_POR_RODADA) return rod;
      return atual;
    }, rodsAsc[rodsAsc.length - 1]);
  }, [rodadas, sorted]);

  const initialOpen = useMemo(() => {
    const init: Record<number, boolean> = {};
    for (const rod of rodadas) {
      const count = sorted.filter(p => p.rodada === rod && p.status === 'encerrada').length;
      const completa = count >= PARTIDAS_POR_RODADA;
      init[rod] = !completa || rod === rodadaAtual;
    }
    return init;
  }, [rodadas, sorted, rodadaAtual]);

  const [open, setOpen] = useState<Record<number, boolean>>(initialOpen);
  const toggle = (rod: number) => setOpen(o => ({ ...o, [rod]: !o[rod] }));

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const partidasNoMes = useMemo(() => {
    return sorted.filter(p => {
      if (!p.data) return false;
      const d = new Date(p.data + 'T12:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  }, [sorted, currentMonth, currentYear]);

  const changeMonth = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const partidasPorDia = useMemo(() => {
    const map: Record<string, Partida[]> = {};
    partidasNoMes.forEach(p => {
      if (!map[p.data]) map[p.data] = [];
      map[p.data].push(p);
    });
    return map;
  }, [partidasNoMes]);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Resultados & Jogos</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', color: 'var(--text)' }}>Rodadas</h1>
        </div>
      </div>

      <div className="container">
        {/* VISÃO CALENDÁRIO */}
        <section style={{ marginBottom: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📅 Calendário de Jogos</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface2)', padding: '0.4rem 0.8rem', borderRadius: 8 }}>
              <button onClick={() => changeMonth(-1)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>◀</button>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', minWidth: 120, textAlign: 'center' }}>
                {months[currentMonth]} {currentYear}
              </span>
              <button onClick={() => changeMonth(1)} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>▶</button>
            </div>
          </div>

          {partidasNoMes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'var(--surface2)', borderRadius: 8 }}>
              Nenhuma partida agendada para este mês.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {Object.entries(partidasPorDia).sort((a, b) => a[0].localeCompare(b[0])).map(([data, ps]) => (
                <div key={data} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '0.5rem', paddingBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)' }}>
                      {data.split('-')[2]}/{data.split('-')[1]}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {ps.map(p => (
                      <div key={p.id} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', minWidth: 30 }}>{p.hora}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
                          <EscudoTime time={times.find(t => t.id === p.time_casa_id)} size={14} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{p.placar_casa}×{p.placar_visitante}</span>
                          <EscudoTime time={times.find(t => t.id === p.time_visitante_id)} size={14} />
                        </div>
                        <span style={{ color: 'var(--amarelo)', fontSize: '0.6rem', fontWeight: 700 }}>R{p.rodada}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LISTA DE RODADAS */}
        {rodadas.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            Nenhuma partida cadastrada ainda. <a href="/admin/partidas" style={{ color: 'var(--verde)' }}>Cadastrar →</a>
          </p>
        )}

        {rodadas.map(rod => {
          const ps = sorted.filter(p => p.rodada === rod);
          // Rodada completa = 10 partidas de fato ENCERRADAS
          const countEncerradas = ps.filter(p => p.status === 'encerrada').length;
          const completa = countEncerradas >= PARTIDAS_POR_RODADA;
          const isOpen = open[rod] ?? true;
          const encerradas = countEncerradas;
          const emAndamento = ps.filter(p => p.status === 'ao_vivo').length;
          const adiadas = ps.filter(p => p.status === 'adiada').length;

          return (
            <section key={rod} style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => toggle(rod)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  background: isOpen ? 'var(--surface)' : 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  padding: '.85rem 1.25rem', cursor: 'pointer',
                  transition: 'all .15s', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1 }}>
                  {rod}ª Rodada
                </span>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', flex: 1 }}>
                  {ps.length} partida(s) · {encerradas} encerrada(s)
                  {adiadas > 0 && <span style={{ color: 'var(--amarelo-card)', marginLeft: '.5rem' }}>· {adiadas} adiada(s)</span>}
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
