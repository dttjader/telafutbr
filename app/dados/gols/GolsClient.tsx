'use client';
import { useState } from 'react';

export interface CategoriaGols {
  key: string;
  label: string;
  posicao: string;
  gols: number;
  jogadores: { jogador_id: string; nome: string; timeSigla: string; timeId: string; gols: number }[];
}

export interface SegmentoTempo {
  label: string;
  gols: number;
  assistencias: number;
}

export interface GolPorNumero {
  numero: number;
  gols: number;
}

interface Props {
  categorias: CategoriaGols[];
  segmentos: SegmentoTempo[];
  golsPorNumero: GolPorNumero[];
  totalGols: number;
}

const POSICAO_COR: Record<string, string> = {
  GOL: '#f59e0b', ZAG: '#3b82f6', LAT: '#22c55e', VOL: '#8b5cf6', MEI: '#ec4899', ATA: '#ef4444',
};

const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

export function GolsClient({ categorias, segmentos, golsPorNumero, totalGols }: Props) {
  const [categoriaAberta, setCategoriaAberta] = useState<CategoriaGols | null>(null);

  const maxCategoria = Math.max(...categorias.map(c => c.gols), 1);
  const maxSegmentoGols = Math.max(...segmentos.map(s => s.gols), 1);
  const maxSegmentoAst = Math.max(...segmentos.map(s => s.assistencias), 1);
  const maxNumero = Math.max(...golsPorNumero.map(n => n.gols), 1);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Gols</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.85rem' }}>{totalGols} gol(s) computados nesta análise</p>
        </div>
      </div>

      <div className="container">

        {/* 1. Ranking por posição/sub-posição */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🎯 Gols por Posição e Sub-posição
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Clique em uma categoria para ver os jogadores.
          </p>

          {categorias.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum gol registrado ainda.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '.75rem' }}>
              {categorias.map(cat => {
                const cor = POSICAO_COR[cat.posicao] ?? 'var(--verde)';
                const pct = (cat.gols / maxCategoria) * 100;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoriaAberta(cat)}
                    style={{
                      textAlign: 'left', cursor: 'pointer',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '1rem 1.1rem',
                      display: 'flex', flexDirection: 'column', gap: '.5rem',
                      transition: 'border-color .15s', font: 'inherit', color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.5rem' }}>
                      <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{cat.label}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: cor, flexShrink: 0 }}>{cat.gols}</span>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 5 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                      {cat.jogadores.length} jogador(es) · ver detalhes →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Gols e assistências por parte do tempo */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            ⏱️ Gols e Assistências por Parte do Tempo
          </h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--amarelo)', display: 'inline-block' }} />Gols
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#60a5fa', display: 'inline-block' }} />Assistências
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
              {segmentos.map(seg => (
                <div key={seg.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '.8rem', marginBottom: '.3rem', flexWrap: 'wrap', gap: '.3rem' }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem' }}>{seg.label}&apos;</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--amarelo)' }}>{seg.gols}</strong> gols · <strong style={{ color: '#60a5fa' }}>{seg.assistencias}</strong> assist.
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                    <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 7 }}>
                      <div style={{ width: `${(seg.gols / maxSegmentoGols) * 100}%`, height: '100%', background: 'var(--amarelo)', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 7 }}>
                      <div style={{ width: `${(seg.assistencias / maxSegmentoAst) * 100}%`, height: '100%', background: '#60a5fa', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Gols por número da camisa */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            👕 Gols por Número da Camisa
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Considera o número usado por cada jogador em cada partida específica (escalação), não o número atual do cadastro.
          </p>
          {golsPorNumero.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum gol registrado ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {golsPorNumero.map((n, i) => {
                const destaque = i < 3;
                return (
                  <div key={n.numero} style={{
                    display: 'flex', alignItems: 'center', gap: '.85rem',
                    background: destaque ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                    border: `1px solid ${destaque ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '.7rem 1rem',
                  }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', minWidth: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {medalha(i)}
                    </span>
                    <span style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--verde)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)', flexShrink: 0,
                    }}>
                      {n.numero}
                    </span>
                    <div style={{ flex: 1, minWidth: 60 }}>
                      <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 6 }}>
                        <div style={{ width: `${(n.gols / maxNumero) * 100}%`, height: '100%', background: 'var(--verde)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.3rem', color: 'var(--amarelo)', minWidth: 40, textAlign: 'right' }}>
                      {n.gols}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal — jogadores da categoria selecionada */}
      {categoriaAberta && (
        <div
          onClick={() => setCategoriaAberta(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--amarelo)' }}>{categoriaAberta.label}</h3>
              <button onClick={() => setCategoriaAberta(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {categoriaAberta.gols} gol(s) · {categoriaAberta.jogadores.length} jogador(es)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {categoriaAberta.jogadores.map((j, i) => (
                <div key={j.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', background: 'var(--surface2)', borderRadius: 8 }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: 'var(--text-muted)', minWidth: 24, textAlign: 'center' }}>{i + 1}º</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{j.nome}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{j.timeSigla}</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{j.gols}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
