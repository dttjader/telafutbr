'use client';
import { useMemo, useState } from 'react';

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

export interface GolDetalhe {
  jogadorNome: string;
  timeSigla: string;
  adversarioSigla: string;
  partidaId: string;
  rodada: number;
  data: string;
  placarCasa: number;
  placarVisitante: number;
  mandanteSigla: string;
  visitanteSigla: string;
  minuto: number;
  acrescimo: number;
}

export interface GolPorNumero {
  numero: number;
  gols: number;
  jogos: GolDetalhe[];
}

export interface DescricaoGol {
  descricao: string;
  quantidade: number;
  jogos: GolDetalhe[];
}

export interface TipoGolResumo {
  tipo: string;
  label: string;
  quantidade: number;
  jogos: GolDetalhe[];
}

interface Props {
  categorias: CategoriaGols[];
  segmentos: SegmentoTempo[];
  golsPorNumero: GolPorNumero[];
  totalGols: number;
  descricoesGolsNormais: DescricaoGol[];
  tiposResumo: TipoGolResumo[];
}

const POSICAO_COR: Record<string, string> = {
  GOL: '#f59e0b', ZAG: '#3b82f6', LAT: '#22c55e', VOL: '#8b5cf6', MEI: '#ec4899', ATA: '#ef4444',
};

const TIPO_COR: Record<string, string> = {
  falta: '#a78bfa',
  contra: 'var(--rebaixamento)',
  penalti: 'var(--amarelo)',
  penalti_perdido: '#f97316',
  penalti_defendido: '#60a5fa',
};

const TIPO_EMOJI: Record<string, string> = {
  falta: '🎯',
  contra: '🔴',
  penalti: '🥅',
  penalti_perdido: '❌',
  penalti_defendido: '🧤',
};

const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

function formatData(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// Lista de gols exibida dentro do modal (jogador + partida: rodada, placar, adversário)
function ListaDeJogos({ itens }: { itens: GolDetalhe[] }) {
  if (itens.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhum registro encontrado.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {itens.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .75rem', background: 'var(--surface2)', borderRadius: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', minWidth: 46 }}>
            {it.minuto}{it.acrescimo > 0 ? `+${it.acrescimo}` : ''}&apos;
          </span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 600 }}>{it.jogadorNome}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              {it.timeSigla} vs {it.adversarioSigla} · Rodada {it.rodada} · {formatData(it.data)}
            </div>
          </div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.95rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {it.mandanteSigla} {it.placarCasa} × {it.placarVisitante} {it.visitanteSigla}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GolsClient({ categorias, segmentos, golsPorNumero, totalGols, descricoesGolsNormais, tiposResumo }: Props) {
  const [categoriaAberta, setCategoriaAberta] = useState<CategoriaGols | null>(null);
  const [modalJogos, setModalJogos] = useState<{ titulo: string; itens: GolDetalhe[] } | null>(null);

  const maxCategoria = Math.max(...categorias.map(c => c.gols), 1);
  const maxDescricao = Math.max(...descricoesGolsNormais.map(d => d.quantidade), 1);

  // ── Tabela de tempo: totais gerais + agrupamento 1º/2º tempo ────────────────
  const tempoStats = useMemo(() => {
    const totalGolsSeg = segmentos.reduce((s, seg) => s + seg.gols, 0);
    const totalAstSeg = segmentos.reduce((s, seg) => s + seg.assistencias, 0);
    const pct = (v: number, total: number) => total > 0 ? (v / total) * 100 : 0;

    const primeiroTempo = segmentos.slice(0, 4);
    const segundoTempo = segmentos.slice(4, 8);
    const somaGrupo = (grupo: SegmentoTempo[]) => ({
      gols: grupo.reduce((s, g) => s + g.gols, 0),
      assistencias: grupo.reduce((s, g) => s + g.assistencias, 0),
    });

    return {
      totalGolsSeg, totalAstSeg, pct,
      primeiroTempo: somaGrupo(primeiroTempo),
      segundoTempo: somaGrupo(segundoTempo),
    };
  }, [segmentos]);

  // Colunas da tabela invertida: os 8 blocos de tempo, com uma coluna de
  // resumo "1º Tempo" inserida após o bloco 45+ e "2º Tempo" após o 90+ —
  // mesmo agrupamento que a versão anterior mostrava como linhas.
  interface ColunaTempo {
    label: string;
    gols: number;
    assistencias: number;
    isGrupo: boolean;
  }
  const colunasTempo: ColunaTempo[] = useMemo(() => {
    const seg = (s: SegmentoTempo): ColunaTempo => ({ label: s.label, gols: s.gols, assistencias: s.assistencias, isGrupo: false });
    const grupo = (label: string, dados: { gols: number; assistencias: number }): ColunaTempo => ({ label, gols: dados.gols, assistencias: dados.assistencias, isGrupo: true });
    return [
      ...segmentos.slice(0, 4).map(seg),
      grupo('1º Tempo', tempoStats.primeiroTempo),
      ...segmentos.slice(4, 8).map(seg),
      grupo('2º Tempo', tempoStats.segundoTempo),
    ];
  }, [segmentos, tempoStats]);

  const colunaStyle = (isGrupo: boolean): React.CSSProperties => isGrupo ? {
    background: 'rgba(0,168,79,.06)',
    borderLeft: '1px solid var(--verde)',
    borderRight: '1px solid var(--verde)',
  } : {};

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

        {/* 0. Resumo por tipo de gol */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📌 Resumo por Tipo de Gol
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Clique em um item para ver a lista de jogos.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
            {/* Gols normais — lista de descrições padrão, sem somatório */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚽</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--verde)', letterSpacing: '.04em' }}>
                  Gols — por Descrição
                </span>
              </div>
              <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Descrições padrão utilizadas no registro de cada gol normal.
              </p>
              {descricoesGolsNormais.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhum gol registrado ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {descricoesGolsNormais.map(d => (
                    <button
                      key={d.descricao}
                      onClick={() => setModalJogos({ titulo: d.descricao, itens: d.jogos })}
                      style={{ textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem', gap: '.5rem' }}>
                        <span style={{ color: 'var(--text)' }}>{d.descricao}</span>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', flexShrink: 0 }}>{d.quantidade}</span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 5 }}>
                        <div style={{ width: `${(d.quantidade / maxDescricao) * 100}%`, height: '100%', background: 'var(--verde)', borderRadius: 3 }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demais tipos — cards clicáveis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '.75rem', alignContent: 'start' }}>
              {tiposResumo.map(s => {
                const cor = TIPO_COR[s.tipo] ?? 'var(--verde)';
                return (
                  <button
                    key={s.tipo}
                    onClick={() => setModalJogos({ titulo: s.label, itens: s.jogos })}
                    style={{
                      textAlign: 'center', cursor: 'pointer', font: 'inherit', color: 'inherit',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem 1rem',
                      transition: 'border-color .15s',
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: '.3rem', lineHeight: 1 }}>{TIPO_EMOJI[s.tipo]}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: cor, lineHeight: 1 }}>{s.quantidade}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.35rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

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

        {/* 2. Gols e assistências por parte do tempo — linhas = Gols/Assistências, colunas = blocos de tempo */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            ⏱️ Gols e Assistências por Parte do Tempo
          </h2>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  <th style={{ padding: '.65rem .75rem', textAlign: 'left', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.88rem', letterSpacing: '.06em', color: 'var(--text-muted)' }} />
                  {colunasTempo.map(col => (
                    <th key={col.label} style={{
                      padding: '.65rem .6rem', textAlign: 'center',
                      fontFamily: "'Bebas Neue',sans-serif",
                      fontSize: col.isGrupo ? '1rem' : '.88rem',
                      letterSpacing: '.06em',
                      color: col.isGrupo ? 'var(--verde)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      ...colunaStyle(col.isGrupo),
                    }}>
                      {col.isGrupo ? col.label : `${col.label}'`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '.6rem .75rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem', color: 'var(--amarelo)', whiteSpace: 'nowrap' }}>
                    ⚽ Gols
                  </td>
                  {colunasTempo.map(col => (
                    <td key={col.label} style={{ textAlign: 'center', padding: '.6rem .6rem', ...colunaStyle(col.isGrupo) }}>
                      <div style={{
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: col.isGrupo ? '1.35rem' : '1.15rem',
                        color: col.isGrupo ? 'var(--verde)' : 'var(--amarelo)',
                      }}>
                        {col.gols}
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                        {tempoStats.pct(col.gols, tempoStats.totalGolsSeg).toFixed(1)}%
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '.6rem .75rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem', color: '#60a5fa', whiteSpace: 'nowrap' }}>
                    🎯 Assistências
                  </td>
                  {colunasTempo.map(col => (
                    <td key={col.label} style={{ textAlign: 'center', padding: '.6rem .6rem', ...colunaStyle(col.isGrupo) }}>
                      <div style={{
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: col.isGrupo ? '1.35rem' : '1.15rem',
                        color: col.isGrupo ? 'var(--verde)' : '#60a5fa',
                      }}>
                        {col.assistencias}
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                        {tempoStats.pct(col.assistencias, tempoStats.totalAstSeg).toFixed(1)}%
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Gols por número da camisa — cards clicáveis */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            👕 Gols por Número da Camisa
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Considera o número usado por cada jogador em cada partida específica (escalação), não o número atual do cadastro. Clique em um card para ver os jogos.
          </p>
          {golsPorNumero.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum gol registrado ainda.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: '.6rem' }}>
              {golsPorNumero.map((n, i) => {
                const destaque = i < 3;
                return (
                  <button
                    key={n.numero}
                    onClick={() => setModalJogos({ titulo: `Camisa ${n.numero}`, itens: n.jogos })}
                    style={{
                      textAlign: 'center', cursor: 'pointer', font: 'inherit', color: 'inherit',
                      background: destaque ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                      border: `1px solid ${destaque ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                      borderRadius: 10, padding: '.85rem .5rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35rem',
                      transition: 'border-color .15s',
                    }}
                  >
                    {destaque && <span style={{ fontSize: '.68rem', lineHeight: 1 }}>{medalha(i)}</span>}
                    <span style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
                      border: '2px solid var(--verde)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)', flexShrink: 0,
                    }}>
                      {n.numero}
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', color: 'var(--amarelo)', lineHeight: 1 }}>
                      {n.gols}
                    </span>
                    <span style={{ fontSize: '.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {n.gols === 1 ? 'gol' : 'gols'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal — jogadores da categoria de posição/sub-posição selecionada */}
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

      {/* Modal — lista de gols (jogador + partida) para tipo/descrição/número da camisa */}
      {modalJogos && (
        <div
          onClick={() => setModalJogos(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--amarelo)' }}>{modalJogos.titulo}</h3>
              <button onClick={() => setModalJogos(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {modalJogos.itens.length} registro(s)
            </p>
            <ListaDeJogos itens={modalJogos.itens} />
          </div>
        </div>
      )}
    </div>
  );
}
