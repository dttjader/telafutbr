'use client';
import { useState } from 'react';
import Link from 'next/link';
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
  placaresFrequentes: { placar: string; count: number; vitVisitante: number; isEmpate: boolean }[];
  rankingEstadio: { nome: string; cidade: string; estado: string; gols: number; jogos: number; media: number }[];
  rankingEstado: { uf: string; gols: number; jogos: number; media: number }[];
  rankingTecnicos: RankingTecnico[];
  totalRodadas: number;
  tecnicos: { id: string; nome: string; time_atual: string | null; ativo: boolean; historico: any[] }[];
  times: Time[];
  totalArbitros: number;
  totalArbitrosPrincipais: number;
}

const barStyle = (pct: number, cor: string): React.CSSProperties => ({
  width: `${Math.max(pct * 100, 3)}%`, height: 8, background: cor, borderRadius: 4, transition: 'width .4s',
});

const secTitle = (text: string) => (
  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>{text}</h2>
);

const SubSections = ({ totalJogos, totalGols, totalArbitros, totalArbitrosPrincipais }: {
  totalJogos: number; totalGols: number; totalArbitros: number; totalArbitrosPrincipais: number;
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
    {[
      {
        href: '/dados/artilharia',
        emoji: '⚽',
        titulo: 'Artilharia',
        desc: 'Rankings de gols, assistências e G/90',
        cor: 'var(--amarelo)',
        bg: 'rgba(255,223,0,.06)',
        border: 'rgba(255,223,0,.2)',
        meta: `${totalGols} gols em ${totalJogos} partidas`,
      },
      {
        href: '/dados/goleiros',
        emoji: '🧤',
        titulo: 'Goleiros',
        desc: 'Ciclos de minutos sem sofrer gols',
        cor: '#22c55e',
        bg: 'rgba(34,197,94,.06)',
        border: 'rgba(34,197,94,.2)',
        meta: null,
      },
      {
        href: '/dados/analitico',
        emoji: '🔬',
        titulo: 'Analítico',
        desc: 'Estatísticas individuais por jogador',
        cor: '#3b82f6',
        bg: 'rgba(59,130,246,.06)',
        border: 'rgba(59,130,246,.2)',
        meta: null,
      },
      {
        href: '/dados/times',
        emoji: '🛡️',
        titulo: 'Times',
        desc: 'Público, elenco, transferências e melhor time',
        cor: '#f97316',
        bg: 'rgba(249,115,22,.06)',
        border: 'rgba(249,115,22,.2)',
        meta: null,
      },
      {
        href: '/dados/arbitros',
        emoji: '🟢',
        titulo: 'Árbitros',
        desc: 'Corpo de arbitragem, cartões e histórico por partida',
        cor: '#a78bfa',
        bg: 'rgba(167,139,250,.06)',
        border: 'rgba(167,139,250,.2)',
        meta: totalArbitros > 0 ? `${totalArbitrosPrincipais} árbitro(s) principal(is)` : null,
      },
    ].map(s => (
      <Link key={s.href} href={s.href} style={{
        display: 'block',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '1.25rem',
        textDecoration: 'none',
        transition: 'all .2s',
      }}
        className="dados-sub-card"
      >
        <div style={{ fontSize: '2rem', marginBottom: '.5rem', lineHeight: 1 }}>{s.emoji}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: s.cor, letterSpacing: '.05em', marginBottom: '.25rem' }}>
          {s.titulo}
        </div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.desc}</div>
        {s.meta && (
          <div style={{ marginTop: '.5rem', fontSize: '.72rem', color: s.cor, opacity: .8 }}>{s.meta}</div>
        )}
        <div style={{ marginTop: '.75rem', fontSize: '.72rem', color: s.cor, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Ver →
        </div>
      </Link>
    ))}
  </div>
);

export function DadosClient({
  totalJogos, totalGols, totalGolsCasa, totalGolsVis,
  placaresFrequentes,
  rankingEstadio, rankingEstado,
  rankingTecnicos, totalRodadas, tecnicos, times,
  totalArbitros, totalArbitrosPrincipais,
}: Props) {
  const mediaTotal = totalJogos > 0 ? (totalGols / totalJogos).toFixed(2) : '—';
  const mediaCasa  = totalJogos > 0 ? (totalGolsCasa / totalJogos).toFixed(2) : '—';
  const mediaVis   = totalJogos > 0 ? (totalGolsVis  / totalJogos).toFixed(2) : '—';
  const maxPlacar  = placaresFrequentes[0]?.count ?? 1;
  const maxEstadio = rankingEstadio[0]?.media ?? 1;
  const maxEstado  = rankingEstado[0]?.media  ?? 1;

  const limiar50 = Math.ceil(totalRodadas * 0.5);
  const tecConsolidados   = rankingTecnicos.filter(r => r.j >= limiar50);
  const tecIntermediarios = rankingTecnicos.filter(r => r.j > 3 && r.j < limiar50);
  const tecEstrantes      = rankingTecnicos.filter(r => r.j <= 3);

  const nomeTecnico   = (id: string) => tecnicos.find(t => t.id === id)?.nome ?? id;
  const timeDoTecnico = (id: string) => {
    const t = tecnicos.find(t => t.id === id);
    return t?.time_atual ? times.find(tm => tm.id === t.time_atual) : undefined;
  };
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  const TabelaTecnicos = ({ dados, subtitulo }: { dados: RankingTecnico[]; subtitulo: string }) => {
    if (dados.length === 0) return (
      <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '.35rem 0 1.25rem' }}>
        {subtitulo}: nenhum técnico nesta faixa.
      </p>
    );
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.75rem',
          marginBottom: '.75rem', padding: '.45rem .9rem',
          background: 'var(--surface2)', borderRadius: 6,
          borderLeft: '3px solid var(--verde)',
        }}>
          <span style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{subtitulo}</span>
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{dados.length} técnico(s)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
              <tr>
                {['#', 'Técnico', 'Time', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts', 'Aprov.', '🟨', '🟥'].map(h => (
                  <th key={h} style={{
                    padding: '.6rem .75rem',
                    textAlign: h === 'Técnico' || h === 'Time' ? 'left' : 'center',
                    fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem',
                    letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((r, i) => {
                const time  = timeDoTecnico(r.tecnico_id);
                const saldo = r.gp - r.gc;
                return (
                  <tr key={r.tecnico_id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{ padding: '.5rem .75rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)' }}>{medalha(i)}</td>
                    <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>{nomeTecnico(r.tecnico_id)}</td>
                    <td style={{ padding: '.5rem .75rem' }}>
                      {time
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                            <EscudoTime time={time} size={22} />
                            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{time.sigla}</span>
                          </div>
                        : <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>—</span>
                      }
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
                        color:      r.aproveitamento >= 60 ? 'var(--libertadores)'  : r.aproveitamento >= 40 ? '#f59e0b'              : 'var(--rebaixamento)',
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
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <style>{`
        .dados-sub-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.35);
        }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas Gerais</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Visão Geral</h1>
        </div>
      </div>

      <div className="container">

        {/* Atalhos para sub-seções */}
        <SubSections
          totalJogos={totalJogos}
          totalGols={totalGols}
          totalArbitros={totalArbitros}
          totalArbitrosPrincipais={totalArbitrosPrincipais}
        />

        {/* Cards resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Partidas',               valor: totalJogos,    cor: 'var(--amarelo)' },
            { label: 'Total de gols',           valor: totalGols,     cor: 'var(--verde)'   },
            { label: 'Média gols/jogo',         valor: mediaTotal,    cor: 'var(--verde)'   },
            { label: 'Gols mandante',           valor: totalGolsCasa, cor: '#60a5fa'        },
            { label: 'Média gols/jogo (casa)',  valor: mediaCasa,     cor: '#60a5fa'        },
            { label: 'Gols visitante',          valor: totalGolsVis,  cor: '#f59e0b'        },
            { label: 'Média gols/jogo (vis.)',  valor: mediaVis,      cor: '#f59e0b'        },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: s.cor, lineHeight: 1 }}>{s.valor}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.3rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Placares frequentes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>🏆 Placares mais frequentes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {placaresFrequentes.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados.</p>}
            {placaresFrequentes.map(d => (
              <div key={d.placar} style={{ background: 'var(--surface2)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem', color: 'var(--text)' }}>{d.placar}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--verde)' }}>{d.count} ocorrência(s)</div>
                    {d.isEmpate ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Empate</div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {d.vitVisitante} vitória(s) do visitante
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
        </div>

        {/* Estádios e estados */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
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
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
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
          </div>
        </div>

        {/* Ranking técnicos */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>🧑‍💼 Ranking de Técnicos</h2>
            {totalRodadas > 0 && (
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                {totalRodadas} rodada(s) · mínimo para consolidado: {limiar50} jogos (≥50%)
              </span>
            )}
          </div>
          {rankingTecnicos.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma partida com técnico registrado.</p>}
          {rankingTecnicos.length > 0 && (
            <>
              <TabelaTecnicos dados={tecConsolidados}   subtitulo={`Consolidados — ${limiar50}+ jogos (≥ 50% das rodadas)`} />
              <TabelaTecnicos dados={tecIntermediarios} subtitulo={`Em construção — 4 a ${Math.max(limiar50 - 1, 4)} jogos`} />
              <TabelaTecnicos dados={tecEstrantes}      subtitulo="Estreantes — até 3 jogos" />
              <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
                * Aproveitamento = (pontos / pontos possíveis) × 100 · 🟨/🟥 = cartões recebidos pelo técnico em campo
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
                      }
