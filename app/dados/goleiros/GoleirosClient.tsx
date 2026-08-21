'use client';
import { useState } from 'react';
import { Time } from '@/lib/types';
import { EscudoTime } from '@/components/EscudoTime';

export interface CicloGoleiro {
  numero: number;
  duracao: number;
  dataInicio: string;
  rodadaInicio: number;
  adversarioInicio: string;
  minutoInicio: number;
  dataFim: string | null;
  rodadaFim: number | null;
  adversarioFim: string | null;
  minutoFim: number | null;
  minutoFimAcrescimo: number;
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
  sav: number;              // Defesas (Sav) lançadas na aba Stats, somadas nas partidas encerradas
  golsSofridosTotal: number; // Total de gols sofridos (mesma contagem usada no Analítico)
}

interface Props {
  lista: StatGoleiro[];
  times: Time[];
}

type Ordem = 'ciclo_atual' | 'maior_ciclo' | 'total';

function formatData(d: string) {
  if (!d) return '-';
  const partes = d.split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function formatMin(min: number) {
  if (min < 90) return min + "'";
  const partidas = Math.floor(min / 90);
  const resto = min % 90;
  if (resto === 0) return min + "' (~" + partidas + 'j)';
  return min + "'";
}

// Retorna '—' quando o denominador é zero (sem defesas nem gols sofridos
// lançados ainda) — evita divisão por zero.
function formatPct(num: number, den: number): string {
  if (den <= 0) return '—';
  return `${((num / den) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function BarraCiclo({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.max((valor / max) * 100, 2) : 0;
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: cor, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

function PontoPartida({
  rodada, adversario, minuto, acrescimo, tipo, aberto,
}: {
  rodada: number | null;
  adversario: string | null;
  minuto: number | null;
  acrescimo?: number;
  tipo: 'inicio' | 'fim';
  aberto?: boolean;
}) {
  if (!rodada && !adversario) return <span style={{ color: '#444' }}>-</span>;

  const minLabel = minuto !== null
    ? minuto + (acrescimo ? '+' + acrescimo : '') + "'"
    : '-';

  const corTipo = tipo === 'inicio'
    ? 'var(--verde)'
    : aberto ? 'var(--verde)' : 'var(--rebaixamento)';

  const icone = tipo === 'inicio' ? String.fromCodePoint(9654) : aberto ? '...' : String.fromCodePoint(9917);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '.7rem', color: corTipo }}>{icone}</span>
      {rodada && (
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', color: 'var(--text-muted)' }}>
          {'R' + rodada}
        </span>
      )}
      {adversario && (
        <span style={{ fontSize: '.75rem', color: 'var(--text)' }}>{'vs ' + adversario}</span>
      )}
      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.9rem', color: corTipo }}>
        {minLabel}
      </span>
    </span>
  );
}

// ── Tabela de Aproveitamento (SAV%) ──────────────────────────────────────────
// Migrada da aba Dados/Analítico ("Vínculos e Índices"): SAV% = defesas ÷
// (defesas + gols sofridos). Só entram goleiros com pelo menos uma defesa ou
// um gol sofrido lançado.
function AproveitamentoSavTable({ lista, times }: { lista: StatGoleiro[]; times: Time[] }) {
  const dados = [...lista]
    .filter(s => s.sav > 0 || s.golsSofridosTotal > 0)
    .sort((a, b) => {
      const denA = a.sav + a.golsSofridosTotal;
      const denB = b.sav + b.golsSofridosTotal;
      const pctA = denA > 0 ? a.sav / denA : -1;
      const pctB = denB > 0 ? b.sav / denB : -1;
      return pctB - pctA;
    });

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
          <tr>
            {['Goleiro', 'Time', 'Defesas (Sav)', 'Gols Sofridos', 'SAV%'].map(h => (
              <th key={h} style={{
                padding: '.55rem .6rem',
                textAlign: (h === 'Goleiro' || h === 'Time') ? 'left' : 'center',
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '.82rem',
                letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum goleiro com defesas ou gols sofridos lançados na aba Stats.</td></tr>
          ) : dados.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            return (
              <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                <td style={{ padding: '.5rem .6rem', fontWeight: 600 }}>{s.jogador.nome}</td>
                <td style={{ padding: '.5rem .6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <EscudoTime time={time} size={20} />
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--verde)', fontWeight: 600 }}>{s.sav || '—'}</td>
                <td style={{ textAlign: 'center', color: s.golsSofridosTotal > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{s.golsSofridosTotal || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#a78bfa' }}>{formatPct(s.sav, s.sav + s.golsSofridosTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GoleirosClient({ lista, times }: Props) {
  const [ordem, setOrdem] = useState<Ordem>('ciclo_atual');
  const [goleiroAberto, setGoleiroAberto] = useState<string | null>(null);

  const sorted = [...lista].sort((a, b) => {
    if (ordem === 'maior_ciclo') return b.maiorCiclo.duracao - a.maiorCiclo.duracao;
    if (ordem === 'total') return b.totalMinutos - a.totalMinutos;
    return b.cicloAtualMin - a.cicloAtualMin;
  });

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
            Ciclos continuos de minutos sem tomar gol - calculados sobre o tempo efetivo em campo
          </p>
        </div>
      </div>

      <div className="container">
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginRight: '.25rem' }}>Ordenar por:</span>
          {ordemBtns.map(b => (
            <button
              key={b.key}
              onClick={() => setOrdem(b.key)}
              className={'btn btn-sm ' + (ordem === b.key ? 'btn-primary' : 'btn-ghost')}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {sorted.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            const isAberto = goleiroAberto === s.jogador.id;
            const maiorCicloEAtual = s.maiorCiclo.aberto;
            const maxRef = ordem === 'ciclo_atual' ? s.maiorCiclo.duracao : maxMaiorCiclo;
            const valorBarra = ordem === 'maior_ciclo' ? s.maiorCiclo.duracao : s.cicloAtualMin;

            return (
              <div key={s.jogador.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid ' + (isAberto ? 'rgba(0,168,79,.35)' : 'var(--border)'), transition: 'border-color .2s' }}>
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
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', color: 'var(--text-muted)', minWidth: 32, textAlign: 'center' }}>
                    {i + 1}
                  </span>

                  <EscudoTime time={time} size={40} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                      {s.jogador.nome}
                      {s.jogador.numero && (
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', color: 'var(--verde)' }}>
                          {'#' + s.jogador.numero}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                      {s.timeNome + ' - ' + s.totalPartidas + ' partida(s)'}
                    </div>
                    <div style={{ marginTop: '.4rem' }}>
                      <BarraCiclo valor={valorBarra} max={maxRef} cor={s.timeCor} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: s.cicloAtualMin === 0 ? 'var(--rebaixamento)' : 'var(--verde)', lineHeight: 1 }}>
                      {s.cicloAtualMin}&apos;
                    </div>
                    <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      {'Ciclo Atual #' + s.numeroCicloAtual}
                    </div>
                  </div>

                  <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />

                  <div style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>
                      {s.maiorCiclo.duracao}&apos;
                    </div>
                    <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.1rem' }}>
                      {'Maior Ciclo #' + s.maiorCiclo.numero}
                    </div>
                    {maiorCicloEAtual ? (
                      <div style={{ fontSize: '.65rem', color: 'var(--verde)', fontWeight: 700 }}>
                        {String.fromCodePoint(8593) + ' ciclo atual'}
                      </div>
                    ) : (
                      <div style={{ fontSize: '.65rem', color: '#555' }}>
                        {formatData(s.maiorCiclo.dataInicio)}
                        {s.maiorCiclo.dataFim && s.maiorCiclo.dataFim !== s.maiorCiclo.dataInicio
                          ? ' -> ' + formatData(s.maiorCiclo.dataFim)
                          : ''}
                      </div>
                    )}
                  </div>

                  <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />

                  {/* Total de minutos - sempre visivel, independente da ordenacao escolhida */}
                  <div style={{ textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: '#60a5fa', lineHeight: 1 }}>
                      {s.totalMinutos}&apos;
                    </div>
                    <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                      Total de Minutos
                    </div>
                  </div>

                  <span style={{
                    color: 'var(--text-muted)', fontSize: '1.1rem',
                    transform: isAberto ? 'rotate(180deg)' : 'none',
                    transition: 'transform .2s', flexShrink: 0,
                  }}>
                    {String.fromCodePoint(9662)}
                  </span>
                </button>

                {isAberto && (
                  <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--amarelo)' }}>
                      {'Historico de Ciclos - ' + s.jogador.nome}
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
                              padding: '.75rem 1rem',
                              background: isAtual
                                ? 'rgba(0,168,79,.08)'
                                : isMaior
                                  ? 'rgba(255,223,0,.06)'
                                  : 'var(--surface)',
                              border: '1px solid ' + (isAtual ? 'rgba(0,168,79,.25)' : isMaior ? 'rgba(255,223,0,.2)' : 'var(--border)'),
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.55rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem',
                                color: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : 'var(--text-muted)',
                                minWidth: 28,
                              }}>
                                {'#' + ciclo.numero}
                              </span>

                              {isAtual && (
                                <span style={{
                                  fontSize: '.65rem', padding: '.1rem .45rem', borderRadius: 4,
                                  background: 'rgba(0,168,79,.2)', color: 'var(--verde)',
                                  border: '1px solid rgba(0,168,79,.35)', fontWeight: 700,
                                }}>ATUAL</span>
                              )}
                              {isMaior && (
                                <span style={{
                                  fontSize: '.65rem', padding: '.1rem .45rem', borderRadius: 4,
                                  background: 'rgba(255,223,0,.12)', color: 'var(--amarelo)',
                                  border: '1px solid rgba(255,223,0,.25)', fontWeight: 700,
                                }}>RECORDE</span>
                              )}

                              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <span style={{
                                  fontFamily: "'Bebas Neue',sans-serif",
                                  fontSize: '1.4rem',
                                  color: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : 'var(--text)',
                                  lineHeight: 1,
                                }}>
                                  {ciclo.duracao}&apos;
                                </span>
                                <span style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginLeft: '.3rem' }}>
                                  {formatMin(ciclo.duracao)}
                                </span>
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto 1fr',
                              alignItems: 'center',
                              gap: '.5rem',
                              marginBottom: '.5rem',
                            }}>
                              <div style={{ background: 'rgba(0,168,79,.07)', border: '1px solid rgba(0,168,79,.15)', borderRadius: 6, padding: '.4rem .6rem' }}>
                                <div style={{ fontSize: '.6rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: '.2rem' }}>
                                  Inicio
                                </div>
                                <PontoPartida
                                  rodada={ciclo.rodadaInicio}
                                  adversario={ciclo.adversarioInicio}
                                  minuto={ciclo.minutoInicio}
                                  tipo="inicio"
                                />
                                <div style={{ fontSize: '.65rem', color: '#555', marginTop: '.2rem' }}>
                                  {formatData(ciclo.dataInicio)}
                                </div>
                              </div>

                              <div style={{ color: 'var(--text-muted)', fontSize: '.9rem', textAlign: 'center' }}>
                                {String.fromCodePoint(8594)}
                              </div>

                              <div style={{
                                background: isAtual ? 'rgba(0,168,79,.07)' : 'rgba(239,68,68,.07)',
                                border: '1px solid ' + (isAtual ? 'rgba(0,168,79,.15)' : 'rgba(239,68,68,.15)'),
                                borderRadius: 6, padding: '.4rem .6rem',
                              }}>
                                <div style={{ fontSize: '.6rem', color: isAtual ? 'var(--verde)' : 'var(--rebaixamento)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: '.2rem' }}>
                                  {isAtual ? 'Em aberto' : 'Gol sofrido'}
                                </div>
                                <PontoPartida
                                  rodada={ciclo.rodadaFim}
                                  adversario={ciclo.adversarioFim}
                                  minuto={ciclo.minutoFim}
                                  acrescimo={ciclo.minutoFimAcrescimo}
                                  tipo="fim"
                                  aberto={isAtual}
                                />
                                <div style={{ fontSize: '.65rem', color: '#555', marginTop: '.2rem' }}>
                                  {isAtual ? 'ultimo jogo registrado' : formatData(ciclo.dataFim ?? '')}
                                </div>
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                              <div style={{
                                width: Math.max((ciclo.duracao / maxDuracao) * 100, 2) + '%',
                                height: '100%',
                                background: isAtual ? 'var(--verde)' : isMaior ? 'var(--amarelo)' : '#444',
                                borderRadius: 3,
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap',
                      padding: '.75rem 1rem', background: 'var(--surface)', borderRadius: 8,
                      border: '1px solid var(--border)', fontSize: '.82rem',
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Total em campo: <strong style={{ color: 'var(--amarelo)' }}>{s.totalMinutos}&apos;</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Ciclos: <strong style={{ color: 'var(--text)' }}>{s.ciclos.length}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Gols sofridos: <strong style={{ color: 'var(--rebaixamento)' }}>{s.ciclos.length - 1}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 🧤 Aproveitamento (SAV%) — migrado de Dados/Analítico */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🧤 Aproveitamento (SAV%)
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 720 }}>
            SAV% = defesas (Sav, lançadas na aba Stats de cada partida) ÷ (defesas + gols sofridos). Mostra apenas
            goleiros com pelo menos uma defesa ou um gol sofrido registrado.
          </p>
          <AproveitamentoSavTable lista={lista} times={times} />
        </section>

        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.25rem',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: '.72rem', color: 'var(--text-muted)',
          display: 'flex', flexWrap: 'wrap', gap: '.75rem',
        }}>
          <span><strong style={{ color: 'var(--verde)' }}>Ciclo atual</strong> - minutos sem sofrer gol desde o ultimo gol sofrido</span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            <strong style={{ color: 'var(--amarelo)' }}>Maior ciclo</strong> - recorde pessoal de minutos invicto
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            <strong style={{ color: '#60a5fa' }}>Total de minutos</strong> - soma de todo o tempo em que o goleiro esteve em campo
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            Minutos calculados sobre o tempo efetivo (90min + acrescimos por partida)
          </span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            <strong style={{ color: '#a78bfa' }}>SAV%</strong> - percentual de defesas em relação ao total de defesas + gols sofridos
          </span>
        </div>
      </div>
    </div>
  );
}
