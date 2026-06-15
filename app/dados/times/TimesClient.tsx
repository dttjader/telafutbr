'use client';
import { useState, useMemo } from 'react';
import { EscudoTime } from '@/components/EscudoTime';
import { Time, Jogador } from '@/lib/types';

interface JogadorStats {
  jogador_id: string;
  gols: number;
  gols_contra: number;
  gols_sofridos: number;
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  minutos: number;
  partidas: number;
}

interface JogadorComStats extends Jogador {
  stats: JogadorStats;
  transferencias_aqui?: { time_id: string; data: string }[];
}

interface TimeData {
  time: Time;
  publicoCasa: {
    total: number;
    jogos: number;
    porEstadio: Record<string, { total: number; jogos: number; nome: string }>;
  };
  publicoVisitante: { total: number; jogos: number };
  ativos: JogadorComStats[];
  foramEmbora: JogadorComStats[];
  vieram: JogadorComStats[];
}

interface Props {
  timesData: TimeData[];
}

const POS_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral',
  VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

const SUB_POS_LABEL: Record<string, string> = {
  GOL: 'GOL', ZAG: 'ZAG', LD: 'LD', LE: 'LE',
  VOL: 'VOL', MC: 'MC', MO: 'MO', CA: 'CA', PD: 'PD', PE: 'PE',
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR');
}

function posColor(posicao: string): string {
  const m: Record<string, string> = {
    GOL: '#f59e0b', ZAG: '#3b82f6', LAT: '#22c55e',
    VOL: '#8b5cf6', MEI: '#ec4899', ATA: '#ef4444',
  };
  return m[posicao] ?? '#888';
}

// ── Melhor Time ──────────────────────────────────────────────────────────────
function calcBestTeam(jogadores: JogadorComStats[]) {
  // score para cada critério
  const scoreCriterioJogoLimpo = (j: JogadorComStats) => {
    if (j.stats.minutos === 0) return -Infinity;
    const totalCartoes = j.stats.cartoes_amarelos + j.stats.cartoes_vermelhos * 3;
    const jogoLimpo = totalCartoes === 0 ? j.stats.minutos : j.stats.minutos / (totalCartoes + 1);
    return jogoLimpo + j.stats.gols * 15;
  };

  const scoreGoleiro = (j: JogadorComStats) => {
    if (j.stats.minutos === 0) return -Infinity;
    if (j.stats.gols_sofridos === 0) return j.stats.minutos;
    return j.stats.minutos / j.stats.gols_sofridos;
  };

  const pick = (lista: JogadorComStats[], score: (j: JogadorComStats) => number, n: number) =>
    [...lista]
      .filter(j => j.stats.partidas > 0)
      .sort((a, b) => score(b) - score(a))
      .slice(0, n);

  const goleiros = jogadores.filter(j => j.posicao === 'GOL');
  const zagueiros = jogadores.filter(j => j.posicao === 'ZAG');
  const lateraisD = jogadores.filter(j => j.posicao === 'LAT' && (j.sub_posicao === 'LD' || !j.sub_posicao));
  const lateraisE = jogadores.filter(j => j.posicao === 'LAT' && j.sub_posicao === 'LE');
  const mc = jogadores.filter(j => j.posicao === 'MEI' && (j.sub_posicao === 'MC' || j.sub_posicao === 'VOL' || (!j.sub_posicao && j.posicao === 'MEI')));
  const mo = jogadores.filter(j => j.posicao === 'MEI' && j.sub_posicao === 'MO');
  const vol = jogadores.filter(j => j.posicao === 'VOL');
  const ca = jogadores.filter(j => j.posicao === 'ATA' && j.sub_posicao === 'CA');
  const pd = jogadores.filter(j => j.posicao === 'ATA' && j.sub_posicao === 'PD');
  const pe = jogadores.filter(j => j.posicao === 'ATA' && j.sub_posicao === 'PE');
  // Fallback: se não há sub_posicao para atacante, distribuir
  const atacantesSemSub = jogadores.filter(j => j.posicao === 'ATA' && !j.sub_posicao);

  const bestGol = pick(goleiros, scoreGoleiro, 1)[0] ?? null;
  const bestZag = pick(zagueiros, scoreCriterioJogoLimpo, 2);
  const bestLD = pick(lateraisD.length ? lateraisD : jogadores.filter(j => j.posicao === 'LAT'), scoreCriterioJogoLimpo, 1)[0] ?? null;
  const bestLE = pick(lateraisE.length ? lateraisE : [], scoreCriterioJogoLimpo, 1)[0] ?? null;

  // Meias centrais: volantes + MC
  const meiaCentralPool = [...vol, ...mc].filter((j, i, arr) => arr.findIndex(x => x.id === j.id) === i);
  const bestMC = pick(meiaCentralPool, scoreCriterioJogoLimpo, 2);

  const moPool = mo.length ? mo : jogadores.filter(j => j.posicao === 'MEI');
  const usedIds = new Set(bestMC.map(j => j.id));
  const bestMO = pick(moPool.filter(j => !usedIds.has(j.id)), scoreCriterioJogoLimpo, 1)[0] ?? null;

  const caPool = ca.length ? ca : atacantesSemSub;
  const pdPool = pd.length ? pd : atacantesSemSub;
  const pePool = pe.length ? pe : atacantesSemSub;
  const usedAtaIds = new Set<string>();
  const bestCA = pick(caPool, scoreCriterioJogoLimpo, 1)[0] ?? null;
  if (bestCA) usedAtaIds.add(bestCA.id);
  const bestPD = pick(pdPool.filter(j => !usedAtaIds.has(j.id)), scoreCriterioJogoLimpo, 1)[0] ?? null;
  if (bestPD) usedAtaIds.add(bestPD.id);
  const bestPE = pick(pePool.filter(j => !usedAtaIds.has(j.id)), scoreCriterioJogoLimpo, 1)[0] ?? null;

  return { bestGol, bestZag, bestLD, bestLE, bestMC, bestMO, bestCA, bestPD, bestPE };
}

// ── Cartão de jogador para melhor time ────────────────────────────────────────
function BestPlayerCard({ jogador, label, cor }: { jogador: JogadorComStats | null; label: string; cor: string }) {
  if (!jogador) return (
    <div style={{
      background: 'var(--surface2)', border: '1px dashed var(--border)',
      borderRadius: 8, padding: '.6rem .75rem', textAlign: 'center',
      minWidth: 100, flex: 1,
    }}>
      <div style={{ fontSize: '.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '.3rem' }}>{label}</div>
      <div style={{ fontSize: '.75rem', color: '#444' }}>—</div>
    </div>
  );

  const minVal = jogador.stats.minutos;
  const gs = jogador.posicao === 'GOL'
    ? (jogador.stats.gols_sofridos > 0 ? (minVal / jogador.stats.gols_sofridos).toFixed(0) + "'/" + 'gol' : '∞ min/gol')
    : null;
  const subPosLabel = jogador.sub_posicao && SUB_POS_LABEL[jogador.sub_posicao] ? SUB_POS_LABEL[jogador.sub_posicao] : null;

  return (
    <div style={{
      background: `${cor}10`, border: `1px solid ${cor}33`,
      borderRadius: 8, padding: '.65rem .75rem', textAlign: 'center',
      minWidth: 100, flex: 1, position: 'relative',
    }}>
      <div style={{ fontSize: '.58rem', color: cor, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.07em', marginBottom: '.25rem' }}>
        {label}
        {subPosLabel && <span style={{ marginLeft: '.3rem', opacity: .8 }}>({subPosLabel})</span>}
      </div>
      {jogador.numero && (
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: cor, lineHeight: 1, marginBottom: '.15rem' }}>
          #{jogador.numero}
        </div>
      )}
      <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.2rem' }}>
        {jogador.nome.split(' ').pop()}
      </div>
      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
        {jogador.stats.partidas}j · {minVal}'
        {gs && <div style={{ color: cor, marginTop: '.1rem' }}>{gs}</div>}
        {!gs && jogador.stats.gols > 0 && <div style={{ color: '#22c55e', marginTop: '.1rem' }}>⚽ {jogador.stats.gols}</div>}
      </div>
    </div>
  );
}

export function TimesClient({ timesData }: Props) {
  const [selectedTimeId, setSelectedTimeId] = useState<string>(timesData[0]?.time.id ?? '');
  const [abaJog, setAbaJog] = useState<'ativos' | 'vieram' | 'foramEmbora'>('ativos');

  const data = useMemo(() => timesData.find(d => d.time.id === selectedTimeId) ?? null, [timesData, selectedTimeId]);

  const mediaCasa = data && data.publicoCasa.jogos > 0
    ? Math.round(data.publicoCasa.total / data.publicoCasa.jogos) : null;
  const mediaVisitante = data && data.publicoVisitante.jogos > 0
    ? Math.round(data.publicoVisitante.total / data.publicoVisitante.jogos) : null;

  const bestTeam = useMemo(() => {
    if (!data) return null;
    return calcBestTeam(data.ativos);
  }, [data]);

  if (!data) return (
    <div className="container" style={{ paddingTop: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
      Nenhum time encontrado.
    </div>
  );

  const { time, publicoCasa, publicoVisitante, ativos, foramEmbora, vieram } = data;

  const estadiosList = Object.values(publicoCasa.porEstadio).sort((a, b) => b.jogos - a.jogos);

  const jogadoresExibidos = abaJog === 'ativos' ? ativos : abaJog === 'vieram' ? vieram : foramEmbora;

  // ── Melhor time layout ────────────────────────────────────────────────────
  const BT = bestTeam;
  const corTime = time.cor_primaria;

  const tabStyle = (ativo: boolean) => ({
    padding: '.35rem .8rem',
    fontFamily: "'Bebas Neue',sans-serif",
    fontSize: '.9rem',
    letterSpacing: '.05em',
    borderRadius: 6,
    border: `1px solid ${ativo ? corTime : 'var(--border)'}`,
    background: ativo ? `${corTime}18` : 'transparent',
    color: ativo ? corTime : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all .15s',
  } as React.CSSProperties);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${time.cor_primaria}18 50%, #0a0a0a 100%)`,
        borderBottom: '1px solid var(--border)',
        padding: '2.5rem 0 2rem',
        marginBottom: '2rem',
      }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: corTime, textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>
            Perfil do Time
          </p>
          {/* Seletor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <EscudoTime time={time} size={64} />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1 }}>{time.nome}</h1>
              <div style={{ marginTop: '.75rem' }}>
                <select
                  value={selectedTimeId}
                  onChange={e => setSelectedTimeId(e.target.value)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', padding: '.45rem .85rem',
                    fontSize: '.9rem', fontFamily: 'Barlow, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  {timesData.map(d => (
                    <option key={d.time.id} value={d.time.id}>{d.time.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">

        {/* ── Público ─────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
            👥 Público
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>

            {/* Casa */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
                🏠 Média como Mandante
              </div>
              {publicoCasa.jogos === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados</p>
              ) : (
                <>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color: corTime, lineHeight: 1 }}>
                    {fmt(mediaCasa!)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                    {publicoCasa.jogos} jogo(s) · total: {fmt(publicoCasa.total)}
                  </div>
                </>
              )}
            </div>

            {/* Visitante */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
                ✈️ Média como Visitante
              </div>
              {publicoVisitante.jogos === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados</p>
              ) : (
                <>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color: '#60a5fa', lineHeight: 1 }}>
                    {fmt(mediaVisitante!)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                    {publicoVisitante.jogos} jogo(s) · total: {fmt(publicoVisitante.total)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Por estádio */}
          {estadiosList.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.75rem' }}>
                🏟️ Média por Estádio (Mandante)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {estadiosList.map(est => {
                  const media = est.jogos > 0 ? Math.round(est.total / est.jogos) : 0;
                  const maxMedia = Math.round(estadiosList[0] ? estadiosList[0].total / estadiosList[0].jogos : 1);
                  const pct = maxMedia > 0 ? (media / maxMedia) * 100 : 0;
                  return (
                    <div key={est.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem', fontSize: '.85rem' }}>
                        <span>{est.nome} <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>· {est.jogos}j</span></span>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: corTime }}>{fmt(media)}</span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 5 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: corTime, borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Jogadores ───────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
            👤 Jogadores
          </h2>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1rem' }}>
            <button style={tabStyle(abaJog === 'ativos')} onClick={() => setAbaJog('ativos')}>
              ✅ Ativos ({ativos.length})
            </button>
            <button style={tabStyle(abaJog === 'vieram')} onClick={() => setAbaJog('vieram')}>
              📥 Vieram para cá ({vieram.length})
            </button>
            <button style={tabStyle(abaJog === 'foramEmbora')} onClick={() => setAbaJog('foramEmbora')}>
              📤 Foram embora ({foramEmbora.length})
            </button>
          </div>

          {jogadoresExibidos.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              Nenhum jogador nesta categoria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead style={{ background: 'var(--surface2)', borderBottom: `2px solid ${corTime}` }}>
                  <tr>
                    {['#', 'Jogador', 'Pos.', 'P', 'Min', '⚽', 'Ast.', '🟨', '🟥',
                      abaJog === 'vieram' ? 'Chegou' : abaJog === 'foramEmbora' ? 'Passou por aqui' : 'Time Atual'
                    ].map(h => (
                      <th key={h} style={{
                        padding: '.55rem .65rem',
                        textAlign: h === 'Jogador' ? 'left' : 'center',
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: '.82rem', letterSpacing: '.06em',
                        color: 'var(--text-muted)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jogadoresExibidos.map((j, i) => {
                    const s = j.stats;
                    const subPos = j.sub_posicao && SUB_POS_LABEL[j.sub_posicao] ? SUB_POS_LABEL[j.sub_posicao] : null;
                    const cor = posColor(j.posicao);
                    const ultimaTransf = abaJog === 'vieram'
                      ? j.transferencias_aqui?.sort((a, b) => b.data.localeCompare(a.data))[0]
                      : j.transferencias.filter(tr => tr.time_id === time.id).sort((a, b) => b.data.localeCompare(a.data))[0];
                    return (
                      <tr key={j.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                        <td style={{ padding: '.5rem .65rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>
                          {j.numero ?? '—'}
                        </td>
                        <td style={{ padding: '.5rem .65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {j.nome}
                          {j.idade && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginLeft: '.4rem' }}>{j.idade}a</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>
                          <span style={{ background: `${cor}18`, color: cor, border: `1px solid ${cor}33`, borderRadius: 4, fontSize: '.68rem', padding: '.15rem .4rem', fontWeight: 700 }}>
                            {subPos ?? j.posicao}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{s.partidas || '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)', padding: '.5rem .5rem' }}>
                          {s.minutos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.gols > 0 ? '#22c55e' : 'var(--text-muted)', fontWeight: s.gols > 0 ? 600 : 400 }}>
                          {s.gols || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.assistencias > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                          {s.assistencias || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.cartoes_amarelos > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                          {s.cartoes_amarelos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.cartoes_vermelhos > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {s.cartoes_vermelhos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {ultimaTransf?.data ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Melhor Time ─────────────────────────────────────────────────────── */}
        {BT && ativos.some(j => j.stats.partidas > 0) && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '.5rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
              ⭐ Melhor Time da Temporada
            </h2>
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Goleiro: menor média de gols sofridos · Demais: jogo limpo (min/cartão) + gols marcados · Sub-posição usada como critério de seleção
            </p>

            <div style={{ background: 'var(--surface)', border: `1px solid ${corTime}33`, borderRadius: 12, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* decoração */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: `${corTime}06`, borderRadius: '50%', transform: 'translate(60px,-60px)', pointerEvents: 'none' }} />

              {/* Campo: 4-2-3-1 aproximado */}

              {/* Goleiro */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '.65rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.4rem', fontWeight: 700 }}>Goleiro</div>
                <div style={{ display: 'flex', gap: '.6rem' }}>
                  <BestPlayerCard jogador={BT.bestGol} label="GOL" cor="#f59e0b" />
                </div>
              </div>

              {/* Defensores */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '.65rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.4rem', fontWeight: 700 }}>Defesa</div>
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  <BestPlayerCard jogador={BT.bestLD} label="LAT DIR" cor="#3b82f6" />
                  {BT.bestZag[0] && <BestPlayerCard jogador={BT.bestZag[0]} label="ZAG" cor="#3b82f6" />}
                  {BT.bestZag[1] && <BestPlayerCard jogador={BT.bestZag[1]} label="ZAG" cor="#3b82f6" />}
                  {BT.bestLE
                    ? <BestPlayerCard jogador={BT.bestLE} label="LAT ESQ" cor="#3b82f6" />
                    : BT.bestLD && <div style={{ flex: 1, minWidth: 90, opacity: .3, fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sem LE</div>
                  }
                </div>
              </div>

              {/* Meio */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '.65rem', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.4rem', fontWeight: 700 }}>Meio-campo</div>
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  {BT.bestMC[0] && <BestPlayerCard jogador={BT.bestMC[0]} label="MC" cor="#8b5cf6" />}
                  {BT.bestMC[1] && <BestPlayerCard jogador={BT.bestMC[1]} label="MC" cor="#8b5cf6" />}
                  <BestPlayerCard jogador={BT.bestMO} label="MO" cor="#ec4899" />
                </div>
              </div>

              {/* Ataque */}
              <div>
                <div style={{ fontSize: '.65rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.4rem', fontWeight: 700 }}>Ataque</div>
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  <BestPlayerCard jogador={BT.bestPE} label="PONTA ESQ" cor="#ef4444" />
                  <BestPlayerCard jogador={BT.bestCA} label="CENTROAVANTE" cor="#ef4444" />
                  <BestPlayerCard jogador={BT.bestPD} label="PONTA DIR" cor="#ef4444" />
                </div>
              </div>

              {/* Legenda */}
              <div style={{ marginTop: '1.25rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '.68rem', color: 'var(--text-muted)' }}>
                <span>⚽ Gols marcados na temporada</span>
                <span>📅 Partidas jogadas · minutos em campo</span>
                <span style={{ color: '#f59e0b' }}>GOL: ∞ min/gol = zero gols sofridos</span>
              </div>
            </div>
          </section>
        )}

        {ativos.every(j => j.stats.partidas === 0) && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '.85rem' }}>
            Nenhuma partida encerrada com jogadores deste time para montar o melhor time.
          </div>
        )}

      </div>
    </div>
  );
}
