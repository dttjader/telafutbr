'use client';
import { useState } from 'react';
import { EscudoTime } from '@/components/EscudoTime';
import { Time } from '@/lib/types';
import { Config, zonaClassificacao } from '@/lib/config';

interface TabelaRow {
  time_id: string; pontos: number; jogos: number; vitorias: number;
  empates: number; derrotas: number; gols_pro: number; gols_contra: number;
  posicao: number; saldo: number;
}

interface Props {
  tabela: TabelaRow[];
  times: Time[];
  config: Config;
  rodadas: number[];
  posicoesPorRodada: Record<string, number[]>;
  formaTime: Record<string, string[]>;
  timesRecentes: string[];
}

const formaColor: Record<string, string> = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' };
const zonaColor: Record<string, string> = {
  libertadores: 'var(--libertadores)', 'libertadores-direta': '#a3e635',
  sulamericana: 'var(--sulamericana)', 'sulamericana-direta': '#60a5fa',
  rebaixamento: 'var(--rebaixamento)', neutro: 'transparent',
};
const zonaRowBg: Record<string, string> = {
  libertadores: 'rgba(34,197,94,.04)', 'libertadores-direta': 'rgba(163,230,53,.04)',
  sulamericana: 'rgba(59,130,246,.03)', 'sulamericana-direta': 'rgba(96,165,250,.03)',
  rebaixamento: 'rgba(239,68,68,.04)', neutro: 'transparent',
};

// ── Cores das linhas do gráfico: cada time usa sua própria cor primária ──────
// Quando duas ou mais equipes têm a mesma cor primária (ou muito parecida),
// misturamos progressivamente com a cor SECUNDÁRIA do próprio time para
// diferenciar as linhas sem perder a identidade visual de cada clube.
function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const c = (hex || '').replace('#', '').trim();
  const valido = /^[0-9a-fA-F]{6}$/.test(c);
  if (!valido) return { r: 136, g: 136, b: 136 };
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}
function rgbParaHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function misturarCores(corA: string, corB: string, peso: number): string {
  const a = hexParaRgb(corA);
  const b = hexParaRgb(corB);
  return rgbParaHex(
    a.r + (b.r - a.r) * peso,
    a.g + (b.g - a.g) * peso,
    a.b + (b.b - a.b) * peso,
  );
}

export function TabelaClient({ tabela, times, config, rodadas, posicoesPorRodada, formaTime, timesRecentes }: Props) {
  const [showChart, setShowChart] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);
  const totalTimes = times.length || 20;

  // Times with at least 1 match in chart
  const timesComDados = tabela.map(r => r.time_id);

  // Monta o mapa de cores: cor primária do time e, em caso de repetição entre
  // times diferentes, mistura gradualmente com a cor secundária (25%, 50%, 75%)
  const timeColorMap: Record<string, string> = {};
  const ocorrenciasPorCor: Record<string, number> = {};
  timesComDados.forEach(id => {
    const time = times.find(t => t.id === id);
    const primaria = time?.cor_primaria ?? '#888888';
    const secundaria = time?.cor_secundaria ?? '#ffffff';
    const chave = primaria.toLowerCase();
    const ocorrencia = ocorrenciasPorCor[chave] ?? 0;
    ocorrenciasPorCor[chave] = ocorrencia + 1;

    timeColorMap[id] = ocorrencia === 0
      ? primaria
      : misturarCores(primaria, secundaria, Math.min(0.25 * ocorrencia, 0.75));
  });

  // Chart dimensions
  const W = 900, H = 340, PAD_L = 32, PAD_R = 16, PAD_T = 16, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxPos = timesComDados.length || 20;
  const nRodadas = rodadas.length;
  const rowHeight = chartH / (maxPos - 1);

  const xScale = (i: number) => PAD_L + (nRodadas <= 1 ? chartW / 2 : (i / (nRodadas - 1)) * chartW);
  const yScale = (pos: number) => PAD_T + ((pos - 1) / (maxPos - 1)) * chartH;

  const pathForTime = (timeId: string) => {
    const positions = posicoesPorRodada[timeId] ?? [];
    if (positions.length === 0) return '';
    return positions.map((pos, i) => {
      const x = xScale(i);
      const y = yScale(pos);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Classificação Geral</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Tabela</h1>
        </div>
      </div>

      <div className="container">
        {/* Legenda */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            ['libertadores', `Libertadores (${config.libertadores.vagas_tabela} vagas)`],
            ['sulamericana', `Sul-Americana (${config.sulamericana.vagas_tabela} vagas)`],
            ['rebaixamento', `Rebaixamento (${config.rebaixamento.vagas} times)`],
          ].map(([z, l]) => (
            <span key={z} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: zonaColor[z], display: 'inline-block' }} />{l}
            </span>
          ))}
          <button
            onClick={() => setShowChart(s => !s)}
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
          >
            {showChart ? '📋 Ocultar gráfico' : '📈 Evolução por rodada'}
          </button>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', marginBottom: showChart ? '1.5rem' : 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
              <tr>
                {['#', 'Time', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Forma'].map(h => (
                  <th key={h} style={{ padding: '.7rem .9rem', textAlign: h === 'Time' ? 'left' : 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.9rem', letterSpacing: '.08em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map(row => {
                const zona = zonaClassificacao(row.posicao, row.time_id, config, totalTimes);
                const t = times.find(t => t.id === row.time_id);
                const isRecente = timesRecentes.includes(row.time_id);
                const forma = formaTime[row.time_id] ?? [];
                const vagaDireta = [...config.libertadores.vagas_diretas, ...config.sulamericana.vagas_diretas]
                  .find(v => v.time_id === row.time_id);
                return (
                  <tr key={row.time_id} style={{ borderBottom: '1px solid #1e1e1e', background: zonaRowBg[zona] }}>
                    <td style={{ padding: '.6rem .9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <span style={{ width: 3, height: 22, borderRadius: 2, background: zonaColor[zona], display: 'inline-block' }} />
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem' }}>{row.posicao}</span>
                      </div>
                    </td>
                    <td style={{ padding: '.6rem .9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
                        <EscudoTime time={t ?? undefined} size={30} />
                        <span style={{ fontWeight: 600 }}>{t?.nome}</span>
                        {isRecente && <span style={{ fontSize: '.6rem', background: 'rgba(255,223,0,.15)', color: 'var(--amarelo)', padding: '.1rem .35rem', borderRadius: 3, fontWeight: 700 }}>RECENTE</span>}
                        {vagaDireta && <span title={vagaDireta.motivo} style={{ fontSize: '.6rem', background: 'rgba(163,230,53,.15)', color: '#a3e635', padding: '.1rem .35rem', borderRadius: 3, fontWeight: 700, cursor: 'help' }}>⭐ VAGA DIRETA</span>}
                      </div>
                      {vagaDireta && <div style={{ fontSize: '.68rem', color: '#a3e635', opacity: .8, marginTop: '.1rem', paddingLeft: 36 }}>{vagaDireta.motivo}</div>}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--amarelo)', padding: '.6rem .9rem' }}>{row.pontos}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.jogos}</td>
                    <td style={{ textAlign: 'center', color: 'var(--libertadores)', fontWeight: 600, padding: '.6rem .9rem' }}>{row.vitorias}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.empates}</td>
                    <td style={{ textAlign: 'center', color: 'var(--rebaixamento)', fontWeight: 600, padding: '.6rem .9rem' }}>{row.derrotas}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.gols_pro}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.gols_contra}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, padding: '.6rem .9rem', color: row.saldo > 0 ? 'var(--libertadores)' : row.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                      {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                    </td>
                    <td style={{ textAlign: 'center', padding: '.6rem .5rem' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {forma.length === 0
                          ? <span style={{ fontSize: '.7rem', color: '#444' }}>—</span>
                          : forma.map((r, i) => (
                            <span key={i} style={{ width: 16, height: 16, borderRadius: 3, background: formaColor[r], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{r}</span>
                          ))
                        }
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tabela.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Gráfico de evolução */}
        {showChart && rodadas.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--amarelo)' }}>📈 Evolução da classificação por rodada</h3>
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Passe o mouse sobre uma linha para destacar o time.</p>

            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 400, display: 'block' }}>
                {/* Grid horizontal (posições) */}
                {Array.from({ length: maxPos }, (_, i) => i + 1).map(pos => (
                  <g key={pos}>
                    <line x1={PAD_L} y1={yScale(pos)} x2={W - PAD_R} y2={yScale(pos)}
                      stroke="#222" strokeWidth={pos === 1 ? 1.5 : 0.5} />
                    <text x={PAD_L - 4} y={yScale(pos) + 4} textAnchor="end"
                      fill={pos === 1 ? 'var(--libertadores)' : pos === maxPos ? 'var(--rebaixamento)' : '#555'}
                      fontSize={9} fontFamily="Barlow,sans-serif">{pos}º</text>
                  </g>
                ))}

                {/* Grid vertical (rodadas) */}
                {rodadas.map((rod, i) => (
                  <g key={rod}>
                    <line x1={xScale(i)} y1={PAD_T} x2={xScale(i)} y2={H - PAD_B} stroke="#1e1e1e" strokeWidth={1} />
                    <text x={xScale(i)} y={H - PAD_B + 14} textAnchor="middle"
                      fill="#555" fontSize={9} fontFamily="Bebas Neue,sans-serif">{rod}</text>
                  </g>
                ))}

                {/* Zona libertadores background — topo do gráfico até a metade
                    do caminho entre a última vaga e a primeira posição neutra */}
                {(() => {
                  const y1 = yScale(1);
                  const y2 = yScale(config.libertadores.vagas_tabela);
                  return <rect x={PAD_L} y={y1} width={chartW} height={y2 - y1 + rowHeight / 2}
                    fill="rgba(34,197,94,.04)" />;
                })()}

                {/* Zona rebaixamento background — mesma lógica da zona de
                    libertadores, mas espelhada: a borda de cima (que faz divisa
                    com a zona neutra) fica no meio do caminho entre as posições,
                    e a borda de baixo vai até o fim do gráfico */}
                {(() => {
                  const y1 = yScale(maxPos - config.rebaixamento.vagas + 1) - rowHeight / 2;
                  const y2 = yScale(maxPos);
                  return <rect x={PAD_L} y={y1} width={chartW} height={y2 - y1}
                    fill="rgba(239,68,68,.04)" />;
                })()}

                {/* Linhas dos times */}
                {timesComDados.map(timeId => {
                  const cor = timeColorMap[timeId];
                  const isHovered = hoveredTime === timeId;
                  const isDimmed = hoveredTime !== null && !isHovered;
                  const positions = posicoesPorRodada[timeId] ?? [];
                  if (positions.length === 0) return null;
                  return (
                    <g key={timeId} style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredTime(timeId)}
                      onMouseLeave={() => setHoveredTime(null)}>
                      <path
                        d={pathForTime(timeId)}
                        fill="none"
                        stroke={cor}
                        strokeWidth={isHovered ? 3 : 1.5}
                        strokeOpacity={isDimmed ? 0.08 : isHovered ? 1 : 0.6}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* Ponto na última posição */}
                      {positions.length > 0 && (() => {
                        const last = positions[positions.length - 1];
                        const x = xScale(positions.length - 1);
                        const y = yScale(last);
                        return (
                          <circle cx={x} cy={y} r={isHovered ? 5 : 3}
                            fill={cor} opacity={isDimmed ? 0.08 : 1} />
                        );
                      })()}
                      {/* Label no hover */}
                      {isHovered && positions.length > 0 && (() => {
                        const last = positions[positions.length - 1];
                        const x = xScale(positions.length - 1);
                        const y = yScale(last);
                        const t = times.find(t => t.id === timeId);
                        return (
                          <text x={x + 7} y={y + 4} fill={cor} fontSize={10}
                            fontFamily="Bebas Neue,sans-serif" fontWeight="bold">
                            {t?.sigla ?? timeId}
                          </text>
                        );
                      })()}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legenda times */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.75rem' }}>
              {timesComDados.map(timeId => {
                const t = times.find(t => t.id === timeId);
                const cor = timeColorMap[timeId];
                const isHovered = hoveredTime === timeId;
                return (
                  <span key={timeId}
                    onMouseEnter={() => setHoveredTime(timeId)}
                    onMouseLeave={() => setHoveredTime(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.3rem',
                      fontSize: '.72rem', cursor: 'pointer',
                      padding: '.15rem .4rem', borderRadius: 4,
                      background: isHovered ? `${cor}22` : 'transparent',
                      border: `1px solid ${isHovered ? cor : 'transparent'}`,
                      transition: 'all .15s',
                    }}>
                    <span style={{ width: 16, height: 3, background: cor, borderRadius: 2, display: 'inline-block' }} />
                    {t?.sigla ?? timeId}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
