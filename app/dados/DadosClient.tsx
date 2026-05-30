'use client';
import { EscudoTime } from '@/components/EscudoTime';
import { Time } from '@/lib/types';

interface RankingTecnico {
  tecnico_id: string; j: number; v: number; e: number; d: number;
  gp: number; gc: number; amarelos: number; vermelhos: number;
  pts: number; aproveitamento: number;
}

interface Props {
  totalJogos: number;
  totalGols: number;
  totalGolsCasa: number;
  totalGolsVis: number;
  placaresFrequentes: { placar: string; count: number; vitoriasVisitante: number; isEmpate: boolean }[];
  rankingEstadio: { nome: string; cidade: string; estado: string; gols: number; jogos: number; media: number }[];
  rankingEstado: { uf: string; gols: number; jogos: number; media: number }[];
  rankingArbitros: { nome: string; jogos: number; gols: number; amarelos: number; vermelhos: number }[];
  rankingTecnicos: RankingTecnico[];
  tecnicos: { id: string; nome: string; time_atual: string | null; ativo: boolean; historico: any[] }[];
  times: Time[];
}

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', ...style }}>
    {children}
  </div>
);

const secTitle = (text: string) => (
  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>{text}</h2>
);

export function DadosClient({
  totalJogos, totalGols, totalGolsCasa, totalGolsVis,
  placaresFrequentes,
  rankingEstadio, rankingEstado, rankingArbitros, rankingTecnicos, tecnicos, times,
}: Props) {
  const mediaTotal = totalJogos > 0 ? (totalGols / totalJogos).toFixed(2) : '—';
  const mediaCasa = totalJogos > 0 ? (totalGolsCasa / totalJogos).toFixed(2) : '—';
  const mediaVis = totalJogos > 0 ? (totalGolsVis / totalJogos).toFixed(2) : '—';
  const maxPlacar = placaresFrequentes[0]?.count ?? 1;
  const maxEstadio = rankingEstadio[0]?.media ?? 1;
  const maxEstado = rankingEstado[0]?.media ?? 1;

  const barStyle = (pct: number, cor: string): React.CSSProperties => ({
    width: `${Math.max(pct * 100, 3)}%`, height: 8, background: cor, borderRadius: 4, transition: 'width .4s',
  });

  const nomeTecnico = (id: string) => tecnicos.find(t => t.id === id)?.nome ?? id;
  const timeDoTecnico = (id: string) => {
    const t = tecnicos.find(t => t.id === id);
    return t?.time_atual ? times.find(tm => tm.id === t.time_atual) : undefined;
  };
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas Gerais</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Dados</h1>
        </div>
      </div>

      <div className="container">
        {/* Cards de resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Partidas', valor: totalJogos, cor: 'var(--amarelo)' },
            { label: 'Total de gols', valor: totalGols, cor: 'var(--verde)' },
            { label: 'Média gols/jogo', valor: mediaTotal, cor: 'var(--verde)' },
            { label: 'Gols mandante', valor: totalGolsCasa, cor: '#60a5fa' },
            { label: 'Média gols/jogo (casa)', valor: mediaCasa, cor: '#60a5fa' },
            { label: 'Gols visitante', valor: totalGolsVis, cor: '#f59e0b' },
            { label: 'Média gols/jogo (vis.)', valor: mediaVis, cor: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: s.cor, lineHeight: 1 }}>{s.valor}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.3rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Placares Frequentes */}
        {card(
          <>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏆 Placares mais frequentes (Geral)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {placaresFrequentes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados.</p>}
              {placaresFrequentes.map((d) => (
                <div key={d.placar} style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', color: 'var(--text)' }}>{d.placar}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--verde)' }}>{d.count} ocorrências</div>
                      {!d.isEmpate && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {d.vitoriasVisitante} vitórias do visitante
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: 4, height: 6 }}>
                    <div style={barStyle(d.count / maxPlacar, 'var(--verde)')} />
                  </div>
                </div>
              ))}
            </div>
          </>,
          { marginBottom: '2rem' }
        )}

        {/* Estádios e estados */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          {card(
            <>
              {secTitle('🏟️ Média de gols por estádio')}
              {rankingEstadio.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sem dados.</p>}
              {rankingEstadio.map((e, i) => (
                <div key={e.nome} style={{ marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.85rem' }}>
                    <span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', marginRight: '.4rem' }}>{i + 1}.</span>
                      <strong>{e.nome}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginLeft: '.5rem' }}>{e.cidade}/{e.estado} · {e.jogos} jogo(s)</span>
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{e.media.toFixed(2)}</span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6 }}>
                    <div style={barStyle(e.media / maxEstadio, 'var(--verde)')} />
                  </div>
                </div>
              ))}
            </>
          )}
          {card(
            <>
              {secTitle('📍 Média de gols por estado')}
              {rankingEstado.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sem dados.</p>}
              {rankingEstado.map((e, i) => (
                <div key={e.uf} style={{ marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.85rem' }}>
                    <span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', marginRight: '.4rem' }}>{i + 1}.</span>
                      <strong>{e.uf}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginLeft: '.4rem' }}>· {e.jogos}j</span>
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{e.media.toFixed(2)}</span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6 }}>
                    <div style={barStyle(e.media / maxEstado, '#f59e0b')} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Árbitros */}
        {card(
          <>
            {secTitle('🟢 Gols e cartões por árbitro')}
            {rankingArbitros.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sem dados.</p>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                  <tr>
                    {['Árbitro', 'Jogos', 'Gols', 'Gols/jogo', '🟨', '🟨/jogo', '🟥', '🟥/jogo'].map(h => (
                      <th key={h} style={{ padding: '.6rem .9rem', textAlign: h === 'Árbitro' ? 'left' : 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingArbitros.map((a, i) => (
                    <tr key={a.nome} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td style={{ padding: '.5rem .9rem', fontWeight: 600 }}>{a.nome}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{a.jogos}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{a.gols}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: 'var(--verde)' }}>{(a.gols / a.jogos).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: '#f59e0b', fontWeight: 600 }}>{a.amarelos}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: '#f59e0b' }}>{(a.amarelos / a.jogos).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: 'var(--rebaixamento)', fontWeight: 600 }}>{a.vermelhos}</td>
                      <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: 'var(--rebaixamento)' }}>{(a.vermelhos / a.jogos).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>,
          { marginBottom: '2rem' }
        )}

        {/* Ranking Técnicos */}
        {card(
          <>
            {secTitle('🧑‍💼 Ranking de Técnicos')}
            {rankingTecnicos.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma partida com técnico registrado.</p>}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                  <tr>
                    {['#', 'Técnico', 'Time', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts', 'Aprov.', '🟨', '🟥'].map(h => (
                      <th key={h} style={{ padding: '.6rem .75rem', textAlign: h === 'Técnico' || h === 'Time' ? 'left' : 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingTecnicos.map((r, i) => {
                    const time = timeDoTecnico(r.tecnico_id);
                    const saldo = r.gp - r.gc;
                    return (
                      <tr key={r.tecnico_id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                        <td style={{ padding: '.5rem .75rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)' }}>{medalha(i)}</td>
                        <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>{nomeTecnico(r.tecnico_id)}</td>
                        <td style={{ padding: '.5rem .75rem' }}>
                          {time ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                              <EscudoTime time={time} size={22} />
                              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{time.sigla}</span>
                            </div>
                          ) : <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{r.j}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: 'var(--libertadores)', fontWeight: 600 }}>{r.v}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{r.e}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: 'var(--rebaixamento)', fontWeight: 600 }}>{r.d}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{r.gp}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{r.gc}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontWeight: 600, color: saldo > 0 ? 'var(--libertadores)' : saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                          {saldo > 0 ? `+${saldo}` : saldo}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem', color: 'var(--amarelo)' }}>{r.pts}</td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>
                          <span style={{
                            background: r.aproveitamento >= 60 ? 'rgba(34,197,94,.12)' : r.aproveitamento >= 40 ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
                            color: r.aproveitamento >= 60 ? 'var(--libertadores)' : r.aproveitamento >= 40 ? '#f59e0b' : 'var(--rebaixamento)',
                            padding: '.15rem .4rem', borderRadius: 4, fontSize: '.82rem', fontWeight: 700,
                          }}>{r.aproveitamento}%</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: r.amarelos > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: r.amarelos > 0 ? 600 : 400 }}>
                          {r.amarelos > 0 ? r.amarelos : '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: r.vermelhos > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)', fontWeight: r.vermelhos > 0 ? 600 : 400 }}>
                          {r.vermelhos > 0 ? r.vermelhos : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rankingTecnicos.length > 0 && (
              <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.75rem' }}>
                * Aproveitamento = (pontos / pontos possíveis) × 100 · 🟨/🟥 = cartões recebidos pelo técnico em campo
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
                      }
