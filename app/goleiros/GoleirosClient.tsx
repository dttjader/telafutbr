'use client';
import { useState } from 'react';
import { Time } from '@/lib/types';
import { EscudoTime } from '@/components/EscudoTime';

export interface CicloGoleiro {
  numero: number;
  duracao: number; // minutos
  dataInicio: string;
  dataFim: string | null; // null = ciclo em aberto
  aberto: boolean;
}

export interface StatGoleiro {
  jogador: {
    id: string;
    nome: string;
    numero?: number;
    time_atual: string;
  };
  timeNome: string;
  timeSigla: string;
  timeCor: string;
  timeCorSec: string;
  totalMinutos: number;
  totalPartidas: number;
  cicloAtualMin: number;
  numeroCicloAtual: number;
  maiorCiclo: CicloGoleiro;
  ciclos: CicloGoleiro[];
}

interface Props {
  lista: StatGoleiro[];
  times: Time[];
}

type Ordem = 'ciclo_atual' | 'maior_ciclo' | 'total';

function formatData(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatMin(min: number) {
  if (min < 90) return `${min}'`;
  const partidas = Math.floor(min / 90);
  const resto = min % 90;
  if (resto === 0) return `${min}' (~${partidas}j)`;
  return `${min}'`;
}

// Barra de progresso do ciclo relativa ao maior ciclo da lista
function BarraCiclo({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.max((valor / max) * 100, 2) : 0;
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

export function GoleirosClient({ lista, times }: Props) {
  const [ordem, setOrdem] = useState<Ordem>('ciclo_atual');
  const [goleiroBerto, setGoleiroAberto] = useState<string | null>(null);

  const sorted = [...lista].sort((a, b) => {
    if (ordem === 'maior_ciclo') return b.maiorCiclo.duracao - a.maiorCiclo.duracao;
    if (ordem === 'total') return b.totalMinutos - a.totalMinutos;
    return b.cicloAtualMin - a.cicloAtualMin;
  });

  const maxCicloAtual = Math.max(...lista.map(s => s.cicloAtualMin), 1);
  const maxMaiorCiclo = Math.max(...lista.map(s => s.maiorCiclo.duracao), 1);

  const toggleGoleiro = (id: string) =>
    setGoleiroAberto(prev => (prev === id ? null : id));

  const ordemBtns: { key: Ordem; label: string }[] = [
    { key: 'ciclo_atual', label: 'Ciclo Atual' },
    { key: 'maior_ciclo', label: 'Maior Ciclo' },
    { key: 'total', label: 'Total de Minutos' },
  ];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#0a0a0a 0%,#071a07 50%,#0a0a0a 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '2.5rem 0 2rem',
        marginBottom: '2rem',
      }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>
            Ranking de Goleiros
          </p>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: '.5rem' }}>
            Minutos Sem Sofrer Gols
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Ciclos contínuos de minutos sem tomar gol — calculados sobre o tempo efetivo em campo
          </p>
        </div>
      </div>

      <div className="container">
        {/* Ordenação */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginRight: '.25rem' }}>Ordenar por:</span>
          {ordemBtns.map(b => (
            <button
              key={b.key}
              onClick={() => setOrdem(b.key)}
              className={`btn btn-sm ${ordem === b.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {b.label}
            </button>
          ))}
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {lista.length} goleiro(s)
          </span>
        </div>

        {lista.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>
            Nenhum goleiro com partidas registradas.
          </p>
        )}

        {/* Lista de goleiros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {sorted.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            const isAberto = goleiroBerto === s.jogador.id;
            const maiorCicloEAtual = s.maiorCiclo.aberto;
            // Na aba "Maior Ciclo" a barra compara com o recorde do próprio goleiro (sempre 100%)
            // Nas demais abas continua comparando com o melhor da lista
            const maxRef = ordem === 'maior_ciclo' ? s.maiorCiclo.duracao : maxCicloAtual;
            const valorBarra = ordem === 'maior_ciclo' ? s.maiorCiclo.duracao : s.cicloAtualMin;

            return (
              <div key={s.jogador.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${isAberto ? 'rgba(0,168,79,.35)' : 'var(--border)'}`, transition: 'border-color .2s' }}>
                {/* Linha principal — clicável */}
                <button
                  onClick={() => toggleGoleiro(s.jogador.id)}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: isAberto ? 'rgba(0,168,79,.06)' : 'var(--surface)',
                    border: 'none', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    transition: 'background .2s',
                  }}
                >
                  {/* Posição */}
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', color: 'var(--text-muted)', minWidth: 32, textAlign: 'center' }}>
                    {i + 1}
                  </span>

                  {/* Escudo + nome */}
                  <EscudoTime time={time} size={40} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                      {s.jogador.nome}
                      {s.jogador.numero && (
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', color: 'var(--verde)' }}>
                          #{s.jogador.numero}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                      {s.timeNome} · {s.totalPartidas} partida(s)
                    </div>
                    <div style={{ marginTop: '.4rem' }}>
                      <BarraCiclo valor={valorBarra} max={maxRef} cor={s.timeCor} />
                    </div>
                  </div>

                  {/* Ciclo atual */}
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: s.cicloAtualMin === 0 ? 'var(--rebaixamento)' : 'var(--verde)', lineHeight: 1 }}>
                      {s.cicloAtualMin}'
                    </div>
                    <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      Ciclo Atual #{s.numeroCicloAtual}
                    </div>
                  </div>

                  {/* Divisor */}
                  <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />

                  {/* Maior ciclo */}
                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>
                      {s.maiorCiclo.duracao}'
                    </div>
                    <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.1rem' }}>
                      Maior Ciclo #{s.maiorCiclo.numero}
                    </div>
                    {maiorCicloEAtual ? (
                      <div style={{ fontSize: '.65rem', color: 'var(--verde)', fontWeight: 700 }}>
                        ↑ ciclo atual
                      </div>
                    ) : (
                      <div style={{ fontSize: '.65rem', color: '#555' }}>
                        {formatData(s.maiorCiclo.dataInicio)}
                        {s.maiorCiclo.dataFim && s.maiorCiclo.dataFim !== s.maiorCiclo.dataInicio
                          ? ` → ${formatData(s.maiorCiclo.dataFim)}`
                          : ''}
                      </div>
                    )}
                  </div>

                  {/* Seta */}
                  <span style={{
                    color: 'var(--text-muted)', fontSize: '1.1rem',
                    transform: isAberto ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s', flexShrink: 0,
                  }}>▾</span>
                </button>

                {/* Detalhe de ciclos */}
                {isAberto && (
                  <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--amarelo)' }}>
                      Histórico de Ciclos — {s.jogador.nome}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                      {s.ciclos.map((ciclo) => {
                        const isMaior = ciclo.numero === s.maiorCiclo.numero;
                        const isAtual = ciclo.aberto;
                        const maxDuracao = Math.max(...s.ciclos.map(c => c.duracao), 1);

                        return (
                          <div
                            key={ciclo.numero}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '.75rem',
                              padding: '.65rem 1rem',
                              background: isAtual
                                ? 'rgba(0,168,79,.08)'
                                : isMaior
                                  ? 'rgba(255,223,0,.06)'
                                  : 'var(--surface)',
                              border: `1px solid ${isAtual ? 'rgba(0,168,79,.25)' : isMaior ? 'rgba(255,223,0,.2)' : 'var(--border)'}`,
                              borderRadius: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            {/* Número do ciclo */}
                            <span style={{
                              fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem',
                              color: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : 'var(--text-muted)',
                              minWidth: 28, textAlign: 'center',
                            }}>
                              #{ciclo.numero}
                            </span>

                            {/* Badges */}
                            <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0 }}>
                              {isAtual && (
                                <span style={{
                                  fontSize: '.65rem', padding: '.1rem .45rem', borderRadius: 4,
                                  background: 'rgba(0,168,79,.2)', color: 'var(--verde)',
                                  border: '1px solid rgba(0,168,79,.35)', fontWeight: 700,
                                  letterSpacing: '.05em',
                                }}>ATUAL</span>
                              )}
                              {isMaior && (
                                <span style={{
                                  fontSize: '.65rem', padding: '.1rem .45rem', borderRadius: 4,
                                  background: 'rgba(255,223,0,.12)', color: 'var(--amarelo)',
                                  border: '1px solid rgba(255,223,0,.25)', fontWeight: 700,
                                  letterSpacing: '.05em',
                                }}>RECORDE</span>
                              )}
                            </div>

                            {/* Datas */}
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                                {ciclo.dataInicio ? formatData(ciclo.dataInicio) : '—'}
                                {' '}→{' '}
                                {ciclo.aberto
                                  ? <span style={{ color: 'var(--verde)', fontWeight: 700 }}>em aberto</span>
                                  : formatData(ciclo.dataFim ?? '')}
                              </div>

                              {/* Mini barra */}
                              <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 4, marginTop: '.3rem', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.max((ciclo.duracao / maxDuracao) * 100, 2)}%`,
                                  height: '100%',
                                  background: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : '#444',
                                  borderRadius: 3,
                                }} />
                              </div>
                            </div>

                            {/* Duração */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{
                                fontFamily: "'Bebas Neue',sans-serif",
                                fontSize: '1.4rem',
                                color: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : 'var(--text)',
                                lineHeight: 1,
                              }}>
                                {ciclo.duracao}'
                              </div>
                              <div style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>
                                {formatMin(ciclo.duracao)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumo total */}
                    <div style={{
                      marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap',
                      padding: '.75rem 1rem', background: 'var(--surface)', borderRadius: 8,
                      border: '1px solid var(--border)', fontSize: '.82rem',
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Total de minutos em campo: <strong style={{ color: 'var(--amarelo)' }}>{s.totalMinutos}'</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Total de ciclos: <strong style={{ color: 'var(--text)' }}>{s.ciclos.length}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Gols sofridos: <strong style={{ color: 'var(--rebaixamento)' }}>
                          {s.ciclos.length - 1}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.25rem',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: '.72rem', color: 'var(--text-muted)',
          display: 'flex', flexWrap: 'wrap', gap: '.75rem',
        }}>
          <span>
            <strong style={{ color: 'var(--verde)' }}>Ciclo atual</strong> — minutos sem sofrer gol desde o último gol sofrido
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            <strong style={{ color: 'var(--amarelo)' }}>Maior ciclo</strong> — recorde pessoal de minutos invicto
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            Clique no nome do goleiro para ver o histórico completo de ciclos
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            Minutos calculados sobre o tempo efetivo em campo (90min + acréscimos de cada partida)
          </span>
        </div>
      </div>
    </div>
  );
                  }
