'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

export type CargoArbitro = 'principal' | 'assistente1' | 'assistente2' | 'quarto' | 'var';

export interface ArbitroPrincipal {
  nome: string;
  jogos: number;
  gols: number;
  amarelos: number;
  vermelhos: number;
}

export interface ArbitroAuxiliar {
  nome: string;
  cargos: Partial<Record<CargoArbitro, { jogos: number; gols: number; amarelos: number; vermelhos: number }>>;
  totalJogos: number;
  totalAmarelos: number;
  totalVermelhos: number;
}

interface Props {
  principaisData: ArbitroPrincipal[];
  auxiliaresData: ArbitroAuxiliar[];
  totalArbitros: number;
  totalPartidas: number;
}

const CARGO_LABEL: Record<CargoArbitro, string> = {
  principal:   'Árbitro Principal',
  assistente1: 'Assistente 1',
  assistente2: 'Assistente 2',
  quarto:      '4º Árbitro',
  var:         'VAR',
};

const CARGO_EMOJI: Record<CargoArbitro, string> = {
  principal:   '🟢',
  assistente1: '🚩',
  assistente2: '🚩',
  quarto:      '📋',
  var:         '📺',
};

const cargosOrdenados: CargoArbitro[] = ['principal', 'assistente1', 'assistente2', 'quarto', 'var'];

// Colunas pelas quais a tabela de Árbitros Principais pode ser reclassificada
type OrdenarPor = 'nome' | 'jogos' | 'gols' | 'g_jogo' | 'amarelos' | 'amarelos_jogo' | 'vermelhos' | 'vermelhos_jogo';

const COLUNAS: { campo: OrdenarPor; label: string; align: 'left' | 'center' }[] = [
  { campo: 'nome',            label: 'Árbitro', align: 'left'   },
  { campo: 'jogos',           label: 'Jogos',    align: 'center' },
  { campo: 'gols',            label: 'Gols',     align: 'center' },
  { campo: 'g_jogo',          label: 'G/Jogo',   align: 'center' },
  { campo: 'amarelos',        label: '🟨',       align: 'center' },
  { campo: 'amarelos_jogo',   label: '🟨/J',     align: 'center' },
  { campo: 'vermelhos',       label: '🟥',       align: 'center' },
  { campo: 'vermelhos_jogo',  label: '🟥/J',     align: 'center' },
];

function valorCampo(a: ArbitroPrincipal, campo: OrdenarPor): number | string {
  switch (campo) {
    case 'nome': return a.nome.toLowerCase();
    case 'jogos': return a.jogos;
    case 'gols': return a.gols;
    case 'g_jogo': return a.jogos > 0 ? a.gols / a.jogos : 0;
    case 'amarelos': return a.amarelos;
    case 'amarelos_jogo': return a.jogos > 0 ? a.amarelos / a.jogos : 0;
    case 'vermelhos': return a.vermelhos;
    case 'vermelhos_jogo': return a.jogos > 0 ? a.vermelhos / a.jogos : 0;
  }
}

export function ArbitrosClient({ principaisData, auxiliaresData, totalArbitros, totalPartidas }: Props) {
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('jogos');
  const [direcao, setDirecao] = useState<1 | -1>(-1); // -1 = decrescente, 1 = crescente

  const toggleSort = (campo: OrdenarPor) => {
    if (campo === ordenarPor) {
      setDirecao(d => (d === 1 ? -1 : 1));
    } else {
      setOrdenarPor(campo);
      // Nome começa em ordem alfabética (A→Z); números começam do maior para o menor
      setDirecao(campo === 'nome' ? 1 : -1);
    }
  };

  const principaisOrdenados = useMemo(() => {
    return [...principaisData].sort((a, b) => {
      const va = valorCampo(a, ordenarPor);
      const vb = valorCampo(b, ordenarPor);
      if (typeof va === 'string' && typeof vb === 'string') return direcao * va.localeCompare(vb);
      return direcao * ((va as number) - (vb as number));
    });
  }, [principaisData, ordenarPor, direcao]);

  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Corpo de Arbitragem</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Árbitros</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.85rem' }}>
            {totalArbitros} árbitro(s) registrado(s) · {totalPartidas} partida(s) encerrada(s)
          </p>
        </div>
      </div>

      <div className="container">

        {/* Árbitros Principais */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            🟢 Árbitros Principais
            <span style={{ fontSize: '.8rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
              {principaisData.length} árbitro(s)
            </span>
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
            Clique em uma coluna para reclassificar a tabela.
          </p>

          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  <th style={{ padding: '.65rem .9rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.88rem', letterSpacing: '.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>#</th>
                  {COLUNAS.map(col => {
                    const ativo = ordenarPor === col.campo;
                    return (
                      <th
                        key={col.campo}
                        onClick={() => toggleSort(col.campo)}
                        style={{
                          padding: '.65rem .9rem',
                          textAlign: col.align,
                          fontFamily: "'Bebas Neue',sans-serif",
                          fontSize: '.88rem',
                          letterSpacing: '.07em',
                          color: ativo ? 'var(--amarelo)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {col.label}
                        <span style={{ marginLeft: 4, fontSize: '.7rem', opacity: ativo ? 1 : .4 }}>
                          {ativo ? (direcao === 1 ? '↑' : '↓') : '↕'}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {principaisOrdenados.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum árbitro principal registrado.</td></tr>
                )}
                {principaisOrdenados.map((a, i) => {
                  const slug = encodeURIComponent(a.nome);
                  const gJogo = a.jogos > 0 ? a.gols / a.jogos : 0;
                  const amarelosJogo = a.jogos > 0 ? a.amarelos / a.jogos : 0;
                  const vermelhosJogo = a.jogos > 0 ? a.vermelhos / a.jogos : 0;
                  return (
                    <tr key={a.nome} style={{ borderBottom: '1px solid #1e1e1e', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td style={{ padding: '.6rem .9rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{medalha(i)}</td>
                      <td style={{ padding: '.6rem .9rem' }}>
                        <Link href={`/dados/arbitros/${slug}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                          {a.nome}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.15rem', color: 'var(--amarelo)', padding: '.6rem .5rem' }}>{a.jogos}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem' }}>{a.gols}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--verde)' }}>{gJogo.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: '#f59e0b', fontWeight: 600 }}>{a.amarelos}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: '#f59e0b' }}>{amarelosJogo.toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--rebaixamento)', fontWeight: 600 }}>{a.vermelhos || '—'}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--rebaixamento)' }}>{a.vermelhos > 0 ? vermelhosJogo.toFixed(2) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Auxiliares */}
        {auxiliaresData.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              🚩 Auxiliares & VAR
              <span style={{ fontSize: '.8rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
                {auxiliaresData.length} árbitro(s)
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {auxiliaresData.map(a => {
                const slug = encodeURIComponent(a.nome);
                return (
                  <div key={a.nome} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <Link href={`/dados/arbitros/${slug}`} style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                        {a.nome}
                      </Link>
                      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
                        {cargosOrdenados.filter(c => a.cargos[c]).map(c => (
                          <span key={c} style={{ fontSize: '.7rem', padding: '.15rem .45rem', borderRadius: 4, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {CARGO_EMOJI[c]} {CARGO_LABEL[c]} · {a.cargos[c]!.jogos}j
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.82rem', color: 'var(--text-muted)' }}>
                      <span><span style={{ color: 'var(--amarelo)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem' }}>{a.totalJogos}</span> jogos</span>
                      <span><span style={{ color: '#f59e0b', fontWeight: 600 }}>{a.totalAmarelos}</span> 🟨</span>
                      {a.totalVermelhos > 0 && <span><span style={{ color: 'var(--rebaixamento)', fontWeight: 600 }}>{a.totalVermelhos}</span> 🟥</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
