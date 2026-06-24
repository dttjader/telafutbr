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

export interface Props { // Exportada para garantir compatibilidade
  totalJogos: number;
  totalGols: number;
  totalGolsCasa: number;
  totalGolsVis: number;
  placaresFrequentes: { placar: string; count: number; vitVisitante: number; isEmpate: boolean }[];
  rankingEstadio: { nome: string; cidade: string; estado: string; gols: number; jogos: number; media: number }[];
  rankingCidade?: { nome: string; estado: string; gols: number; jogos: number; media: number }[]; // Opcional
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

// ... (SubSections e TabelaTecnicos permanecem iguais)

export function DadosClient({ // Alterado para Named Export
  totalJogos, totalGols, totalGolsCasa, totalGolsVis,
  placaresFrequentes,
  rankingEstadio, rankingCidade = [], rankingEstado, // Valor padrão []
  rankingTecnicos, totalRodadas, tecnicos, times,
  totalArbitros, totalArbitrosPrincipais,
}: Props) {
  
  const mediaTotal = totalJogos > 0 ? (totalGols / totalJogos).toFixed(2) : '—';
  const mediaCasa  = totalJogos > 0 ? (totalGolsCasa / totalJogos).toFixed(2) : '—';
  const mediaVis   = totalJogos > 0 ? (totalGolsVis  / totalJogos).toFixed(2) : '—';
  const maxPlacar  = placaresFrequentes[0]?.count ?? 1;
  const maxEstadio = rankingEstadio[0]?.media ?? 1;
  const maxCidade  = rankingCidade[0]?.media  ?? 1;
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

  // ... (TabelaTecnicos permanece igual)

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

        {/* Estádios, Cidades e Estados */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          
          {/* Estádios */}
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

          {/* Cidades e Estados Agrupados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Cidades */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
              {secTitle('🏙️ Média de gols por cidade')}
              {rankingCidade.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Sem dados.</p>}
              {rankingCidade.map((c, i) => (
                <div key={`${c.nome}-${c.estado}`} style={{ marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem', fontSize: '.85rem' }}>
                    <span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', marginRight: '.4rem' }}>{i + 1}.</span>
                      <strong>{c.nome}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '.75rem', marginLeft: '.4rem' }}>({c.estado}) · {c.jogos}j</span>
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{c.media.toFixed(2)}</span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6 }}>
                    <div style={barStyle(c.media / maxCidade, '#3b82f6')} />
                  </div>
                </div>
              ))}
            </div>

            {/* Estados */}
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
