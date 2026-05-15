import { getPartidas, getTimes } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ConfrontosPage() {
  const [partidas, times] = await Promise.all([getPartidas(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada')
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));

  const n = times.length;
  const idx: Record<string, number> = {};
  times.forEach((t, i) => { idx[t.id] = i; });

  // Para cada par (i,j), registrar a ordem da partida (mais recente = índice 0)
  // encerradas já está ordenado por data desc
  const ordemPartida: Record<string, number> = {};
  let contador = 0;
  for (const p of encerradas) {
    const i = idx[p.time_casa_id], j = idx[p.time_visitante_id];
    if (i === undefined || j === undefined) continue;
    ordemPartida[`${i}-${j}`] = contador++;
  }
  // As últimas 5 partidas = as primeiras 5 no array encerradas (mais recentes)
  const ultimas5PartidasIds = new Set(encerradas.slice(0, 5).map(p => `${idx[p.time_casa_id]}-${idx[p.time_visitante_id]}`));

  const placar: ({ gc: number; gv: number; data: string } | null)[][] =
    Array.from({ length: n }, () => Array(n).fill(null));

  let totPart = 0, totManVit = 0, totEmp = 0, totVisVit = 0, totGols = 0, totGolsMan = 0, totGolsVis = 0;

  for (const p of encerradas) {
    const i = idx[p.time_casa_id], j = idx[p.time_visitante_id];
    if (i === undefined || j === undefined) continue;
    placar[i][j] = { gc: p.placar_casa, gv: p.placar_visitante, data: p.data };
    totPart++; totGols += p.placar_casa + p.placar_visitante;
    totGolsMan += p.placar_casa; totGolsVis += p.placar_visitante;
    if (p.placar_casa > p.placar_visitante) totManVit++;
    else if (p.placar_casa < p.placar_visitante) totVisVit++;
    else totEmp++;
  }

  // Resumo geral por time
  const resumo = times.map((_, i) => {
    let j2 = 0, v = 0, e = 0, d = 0, gm = 0, gs = 0;
    for (let j = 0; j < n; j++) {
      const cm = placar[i][j];
      if (cm) { j2++; gm += cm.gc; gs += cm.gv; if (cm.gc > cm.gv) v++; else if (cm.gc < cm.gv) d++; else e++; }
      const cv = placar[j][i];
      if (cv) { j2++; gm += cv.gv; gs += cv.gc; if (cv.gv > cv.gc) v++; else if (cv.gv < cv.gc) d++; else e++; }
    }
    return { j: j2, v, e, d, gm, gs, pts: v * 3 + e };
  });

  // Resumo mandante/visitante por time, com últimas partidas
  const resumoCasa = times.map((time, i) => {
    let j2 = 0, v = 0, e = 0, d = 0, gm = 0, gs = 0;
    const jogos: { data: string; resultado: 'V' | 'E' | 'D' }[] = [];
    for (let j = 0; j < n; j++) {
      const p = placar[i][j];
      if (!p) continue;
      j2++; gm += p.gc; gs += p.gv;
      const res: 'V' | 'E' | 'D' = p.gc > p.gv ? 'V' : p.gc < p.gv ? 'D' : 'E';
      if (p.gc > p.gv) v++; else if (p.gc < p.gv) d++; else e++;
      jogos.push({ data: p.data, resultado: res });
    }
    jogos.sort((a, b) => b.data.localeCompare(a.data));
    return { j: j2, v, e, d, gm, gs, pts: v * 3 + e, ultimos5: jogos.slice(0, 5) };
  });

  const resumoFora = times.map((time, i) => {
    let j2 = 0, v = 0, e = 0, d = 0, gm = 0, gs = 0;
    const jogos: { data: string; resultado: 'V' | 'E' | 'D' }[] = [];
    for (let j = 0; j < n; j++) {
      const p = placar[j][i];
      if (!p) continue;
      j2++; gm += p.gv; gs += p.gc;
      const res: 'V' | 'E' | 'D' = p.gv > p.gc ? 'V' : p.gv < p.gc ? 'D' : 'E';
      if (p.gv > p.gc) v++; else if (p.gv < p.gc) d++; else e++;
      jogos.push({ data: p.data, resultado: res });
    }
    jogos.sort((a, b) => b.data.localeCompare(a.data));
    return { j: j2, v, e, d, gm, gs, pts: v * 3 + e, ultimos5: jogos.slice(0, 5) };
  });

  // Sort indices by pts desc for the resumo tables
  const sortedIdxCasa = [...times.map((_, i) => i)]
    .filter(i => resumoCasa[i].j > 0)
    .sort((a, b) => resumoCasa[b].pts - resumoCasa[a].pts || (resumoCasa[b].gm - resumoCasa[b].gs) - (resumoCasa[a].gm - resumoCasa[a].gs));
  const sortedIdxFora = [...times.map((_, i) => i)]
    .filter(i => resumoFora[i].j > 0)
    .sort((a, b) => resumoFora[b].pts - resumoFora[a].pts || (resumoFora[b].gm - resumoFora[b].gs) - (resumoFora[a].gm - resumoFora[a].gs));

  const stats = [
    { l: 'Partidas', v: totPart },
    { l: 'Vit. mandante', v: totManVit, cor: '#1a7a40' },
    { l: 'Empates', v: totEmp },
    { l: 'Vit. visitante', v: totVisVit, cor: '#a81a1a' },
    { l: 'Total de gols', v: totGols },
    { l: 'Gols mandante', v: totGolsMan },
    { l: 'Gols visitante', v: totGolsVis },
  ];

  const cellStyle = (gc: number, gv: number): React.CSSProperties => {
    if (gc > gv) return { color: '#1a5fa8', fontWeight: 600 };
    if (gc < gv) return { color: '#a81a1a', fontWeight: 600 };
    return { color: 'var(--text-muted)' };
  };

  // 5 shades of green for last 5 home games (index 0 = most recent = darkest)
  const homeShadeBg = ['rgba(0,168,79,.35)', 'rgba(0,168,79,.25)', 'rgba(0,168,79,.16)', 'rgba(0,168,79,.09)', 'rgba(0,168,79,.04)'];
  const awayShadeBg = ['rgba(59,130,246,.35)', 'rgba(59,130,246,.25)', 'rgba(59,130,246,.16)', 'rgba(59,130,246,.09)', 'rgba(59,130,246,.04)'];
  const resColor: Record<string, string> = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' };

  const th: React.CSSProperties = { border: '1px solid #2a2a2a', textAlign: 'center', padding: '3px 2px', fontSize: 11, background: 'var(--surface2)', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: "'Bebas Neue',sans-serif", letterSpacing: '.05em' };
  const td: React.CSSProperties = { border: '1px solid #222', textAlign: 'center', padding: '3px 1px', fontSize: 12, lineHeight: 1.4 };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2rem 0 1.5rem', marginBottom: '1.5rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.3rem' }}>Quadro de Jogos</p>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>Confrontos Diretos 2026</h1>
        </div>
      </div>

      <div className="container">
        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, marginBottom: '1.5rem' }}>
          {stats.map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.2 }}>{s.l}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: s.cor ?? 'var(--amarelo)', lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span><span style={{ color: '#1a5fa8', fontWeight: 700 }}>2×0</span> Vitória mandante</span>
          <span><span style={{ color: '#a81a1a', fontWeight: 700 }}>0×2</span> Vitória visitante</span>
          <span><span style={{ color: 'var(--text-muted)' }}>1×1</span> Empate</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: 'rgba(255,223,0,.18)', border: '1px solid rgba(255,223,0,.4)', borderRadius: 2, display: 'inline-block' }} />
            Últimas 5 partidas disputadas
          </span>
          <span style={{ marginLeft: 'auto' }}>Mandante (linha) × Visitante (coluna)</span>
        </div>

        {/* Cross table */}
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 900 }}>
            <colgroup>
              <col style={{ width: 36 }} />
              {times.map(t => <col key={t.id} style={{ width: 36 }} />)}
              {['P', 'V', 'E', 'D', 'GM', 'GS', 'Pts'].map(h => <col key={h} style={{ width: 30 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...th, fontSize: 8 }}>↓Casa/Vis→</th>
                {times.map(t => (
                  <th key={t.id} style={{ ...th, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 56, verticalAlign: 'bottom', padding: '4px 1px', fontSize: 9 }}>{t.id}</th>
                ))}
                {['P', 'V', 'E', 'D', 'GM', 'GS', 'Pts'].map(h => (
                  <th key={h} style={{ ...th, background: '#1a2a1a', color: 'var(--verde)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 56, verticalAlign: 'bottom', padding: '4px 1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time, i) => {
                const r = resumo[i];
                return (
                  <tr key={time.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{ ...td, background: 'var(--surface2)', fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, fontWeight: 600, position: 'sticky', left: 0, zIndex: 1, color: 'var(--text)' }}>{time.id}</td>
                    {times.map((_, j) => {
                      if (i === j) return <td key={j} style={{ ...td, background: '#1a1a1a' }}>—</td>;
                      const p = placar[i][j];
                      if (!p) return <td key={j} style={{ ...td, color: '#333' }}></td>;
                      const isUltima5 = ultimas5PartidasIds.has(`${i}-${j}`);
                      return (
                        <td key={j} style={{
                          ...td,
                          ...cellStyle(p.gc, p.gv),
                          background: isUltima5 ? 'rgba(255,223,0,.18)' : 'transparent',
                          outline: isUltima5 ? '1px solid rgba(255,223,0,.4)' : 'none',
                        }}>
                          {p.gc}×{p.gv}
                        </td>
                      );
                    })}
                    <td style={{ ...td, background: '#111', color: 'var(--text-muted)' }}>{r.j}</td>
                    <td style={{ ...td, background: '#111', color: '#22c55e', fontWeight: 600 }}>{r.v}</td>
                    <td style={{ ...td, background: '#111', color: 'var(--text-muted)' }}>{r.e}</td>
                    <td style={{ ...td, background: '#111', color: '#ef4444', fontWeight: 600 }}>{r.d}</td>
                    <td style={{ ...td, background: '#111', color: 'var(--text-muted)' }}>{r.gm}</td>
                    <td style={{ ...td, background: '#111', color: 'var(--text-muted)' }}>{r.gs}</td>
                    <td style={{ ...td, background: '#0d1a0d', color: 'var(--amarelo)', fontFamily: "'Bebas Neue',sans-serif", fontSize: 12 }}>{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo mandante/visitante — ranked by pts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { titulo: '📋 Como Mandante', sortedIdx: sortedIdxCasa, resumoArr: resumoCasa, shades: homeShadeBg },
            { titulo: '✈️ Como Visitante', sortedIdx: sortedIdxFora, resumoArr: resumoFora, shades: awayShadeBg },
          ].map(({ titulo, sortedIdx, resumoArr, shades }) => (
            <div key={titulo} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)' }}>
                {titulo}
              </div>

              {/* Legenda dos últimos 5 */}
              <div style={{ padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center', fontSize: '.68rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span>Últimos 5 jogos:</span>
                {shades.map((bg, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 12, height: 12, background: bg, border: '1px solid rgba(255,255,255,.1)', borderRadius: 2, display: 'inline-block' }} />
                    {i === 0 ? 'mais recente' : i === 4 ? 'mais antigo' : ''}
                  </span>
                ))}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['#', 'Time', 'J', 'V', 'E', 'D', 'GM', 'GS', 'Pts', 'Últ. 5'].map(h => (
                      <th key={h} style={{ padding: '5px 7px', textAlign: h === 'Time' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '.78rem', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedIdx.map((i, pos) => {
                    const r = resumoArr[i];
                    const u5 = r.ultimos5;
                    // Background based on recency rank
                    const recentIdx = sortedIdx.indexOf(i); // position in sorted list
                    // find if this team appears in last 5 dates as home/away
                    return (
                      <tr key={times[i].id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '5px 7px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{pos + 1}</td>
                        <td style={{ padding: '5px 7px', fontFamily: "'Bebas Neue',sans-serif", letterSpacing: '.04em', color: 'var(--text)', fontSize: '.9rem' }}>{times[i].id}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--text-muted)', fontSize: '.85rem' }}>{r.j}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--libertadores)', fontWeight: 600, fontSize: '.85rem' }}>{r.v}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--text-muted)', fontSize: '.85rem' }}>{r.e}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--rebaixamento)', fontWeight: 600, fontSize: '.85rem' }}>{r.d}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--text-muted)', fontSize: '.85rem' }}>{r.gm}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', color: 'var(--text-muted)', fontSize: '.85rem' }}>{r.gs}</td>
                        <td style={{ textAlign: 'center', padding: '5px 5px', fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: 'var(--amarelo)' }}>{r.pts}</td>
                        {/* Últimos 5 como quadradinhos coloridos */}
                        <td style={{ padding: '4px 6px' }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                            {u5.length === 0
                              ? <span style={{ color: '#444', fontSize: '.7rem' }}>—</span>
                              : u5.map((jogo, ji) => (
                                <span key={ji} title={jogo.resultado === 'V' ? 'Vitória' : jogo.resultado === 'E' ? 'Empate' : 'Derrota'}
                                  style={{ width: 14, height: 14, borderRadius: 2, background: shades[ji], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: resColor[jogo.resultado], border: '1px solid rgba(255,255,255,.08)' }}>
                                  {jogo.resultado}
                                </span>
                              ))
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
