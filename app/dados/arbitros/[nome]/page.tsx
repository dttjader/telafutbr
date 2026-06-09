import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPartidas, getTimes, getEstadios, getJogadores, getTecnicos } from '@/lib/data';
import { Arbitragem } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CargoArbitro = 'principal' | 'assistente1' | 'assistente2' | 'quarto' | 'var';

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

function getCargosNaPartida(nome: string, arbitragem: Arbitragem): CargoArbitro[] {
  const cargos: CargoArbitro[] = [];
  if (arbitragem.principal?.trim() === nome)   cargos.push('principal');
  if (arbitragem.assistente1?.trim() === nome) cargos.push('assistente1');
  if (arbitragem.assistente2?.trim() === nome) cargos.push('assistente2');
  if (arbitragem.quarto?.trim() === nome)      cargos.push('quarto');
  if (arbitragem.var?.trim() === nome)         cargos.push('var');
  return cargos;
}

export default async function ArbitroDetalhePage({ params }: { params: Promise<{ nome: string }> }) {
  const { nome: nomeSlug } = await params;
  const nomeArbitro = decodeURIComponent(nomeSlug);

  const [partidas, times, estadios, jogadores, tecnicos] = await Promise.all([
    getPartidas(), getTimes(), getEstadios(), getJogadores(), getTecnicos(),
  ]);

  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .filter(p => {
      const arb = p.arbitragem;
      return [arb.principal, arb.assistente1, arb.assistente2, arb.quarto, arb.var]
        .some(v => v?.trim() === nomeArbitro);
    })
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  if (encerradas.length === 0) notFound();

  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const nomeTec = (id: string | undefined) => id ? (tecnicos.find(t => t.id === id)?.nome ?? id) : null;

  // Estatísticas totais
  let totalGols = 0, totalAmarelos = 0, totalVermelhos = 0;
  const cargosUsados = new Set<CargoArbitro>();

  for (const p of encerradas) {
    totalGols += p.placar_casa + p.placar_visitante;
    for (const c of p.cartoes) {
      if (c.tipo === 'amarelo' || c.tipo === 'amarelo_tecnico') totalAmarelos++;
      else if (c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico') totalVermelhos++;
    }
    getCargosNaPartida(nomeArbitro, p.arbitragem).forEach(c => cargosUsados.add(c));
  }

  const isPrincipal = cargosUsados.has('principal');

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <Link href="/dados/arbitros" style={{ fontSize: '.78rem', color: 'var(--verde)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginBottom: '1rem' }}>
            ← Voltar aos Árbitros
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: isPrincipal ? 'rgba(0,168,79,.15)' : 'var(--surface2)', border: `2px solid ${isPrincipal ? 'var(--verde)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
              {isPrincipal ? '🟢' : '🚩'}
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', lineHeight: 1, marginBottom: '.5rem' }}>{nomeArbitro}</h1>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {Array.from(cargosUsados).map(c => (
                  <span key={c} style={{ fontSize: '.72rem', padding: '.2rem .55rem', borderRadius: 4, background: c === 'principal' ? 'rgba(0,168,79,.15)' : 'var(--surface2)', border: `1px solid ${c === 'principal' ? 'rgba(0,168,79,.3)' : 'var(--border)'}`, color: c === 'principal' ? 'var(--verde)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {CARGO_EMOJI[c]} {CARGO_LABEL[c]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Cards de stats */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Partidas',  valor: encerradas.length,                                      cor: 'var(--amarelo)'      },
              { label: 'Gols',      valor: totalGols,                                              cor: 'var(--verde)'        },
              { label: 'G/Jogo',    valor: (totalGols / encerradas.length).toFixed(2),             cor: 'var(--verde)'        },
              { label: 'Amarelos',  valor: totalAmarelos,                                          cor: '#f59e0b'             },
              { label: '🟨/Jogo',   valor: (totalAmarelos / encerradas.length).toFixed(2),        cor: '#f59e0b'             },
              { label: 'Vermelhos', valor: totalVermelhos,                                         cor: 'var(--rebaixamento)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem 1.25rem', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.8rem', color: s.cor, lineHeight: 1 }}>{s.valor}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.2rem', textTransform: 'uppercase', letterSpacing: '.07em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>
          Histórico de Partidas
          <span style={{ fontSize: '.85rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '.75rem' }}>
            {encerradas.length} partida(s)
          </span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {encerradas.map(p => {
            const tc = times.find(t => t.id === p.time_casa_id);
            const tv = times.find(t => t.id === p.time_visitante_id);
            const est = estadios.find(e => e.id === p.estadio_id);
            const cargos = getCargosNaPartida(nomeArbitro, p.arbitragem);

            const amarelos  = p.cartoes.filter(c => c.tipo === 'amarelo' || c.tipo === 'amarelo_tecnico');
            const vermelhos = p.cartoes.filter(c => c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico');
            const todosCartoes = [...p.cartoes].sort((a, b) => a.minuto - b.minuto);

            const gols   = p.placar_casa + p.placar_visitante;
            const dataFmt = p.data ? p.data.split('-').reverse().join('/') : '—';

            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Cabeçalho da partida */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Placar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flex: 1, minWidth: 200 }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{tc?.sigla ?? p.time_casa_id}</span>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                      <span>{p.placar_casa}</span>
                      <span style={{ color: 'var(--verde)', fontSize: '1rem' }}>×</span>
                      <span>{p.placar_visitante}</span>
                    </div>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{tv?.sigla ?? p.time_visitante_id}</span>
                  </div>

                  {/* Meta info */}
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div style={{ marginBottom: '.15rem' }}>Rodada {p.rodada} · {dataFmt} · {p.hora}</div>
                    {est && <div>{est.nome} · {est.cidade}/{est.estado}</div>}
                  </div>

                  {/* Cargo nesta partida */}
                  <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                    {cargos.map(c => (
                      <span key={c} style={{ fontSize: '.68rem', padding: '.15rem .45rem', borderRadius: 4, background: c === 'principal' ? 'rgba(0,168,79,.12)' : 'var(--surface2)', border: `1px solid ${c === 'principal' ? 'rgba(0,168,79,.25)' : 'var(--border)'}`, color: c === 'principal' ? 'var(--verde)' : 'var(--text-muted)', fontWeight: 700 }}>
                        {CARGO_EMOJI[c]} {CARGO_LABEL[c]}
                      </span>
                    ))}
                  </div>

                  {/* Link para a partida */}
                  <Link href={`/partida/${p.id}`} style={{ fontSize: '.75rem', color: 'var(--verde)', textDecoration: 'none', border: '1px solid rgba(0,168,79,.3)', borderRadius: 5, padding: '.25rem .6rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Ver partida →
                  </Link>
                </div>

                {/* Resumo rápido */}
                <div style={{ padding: '.6rem 1.25rem', background: 'var(--surface2)', display: 'flex', gap: '1.5rem', fontSize: '.8rem', color: 'var(--text-muted)', borderBottom: todosCartoes.length > 0 ? '1px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
                  <span>⚽ <strong style={{ color: 'var(--text)' }}>{gols}</strong> gol(is)</span>
                  <span>🟨 <strong style={{ color: amarelos.length > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{amarelos.length}</strong> amarelo(s)</span>
                  <span>🟥 <strong style={{ color: vermelhos.length > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{vermelhos.length}</strong> vermelho(s)</span>
                </div>

                {/* Lista de cartões com motivos */}
                {todosCartoes.length > 0 && (
                  <div style={{ padding: '.75rem 1.25rem' }}>
                    <p style={{ fontSize: '.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: '.6rem' }}>
                      Cartões
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                      {todosCartoes.map((c, i) => {
                        const isVermelho = c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico';
                        const isTecnico  = c.tipo === 'amarelo_tecnico' || c.tipo === 'vermelho_tecnico';
                        const corBorda   = isVermelho ? 'var(--rebaixamento)' : 'var(--amarelo)';
                        const icone      = isVermelho ? '🟥' : '🟨';
                        const timeDoCartao = times.find(t => t.id === c.time_id);
                        const tecnicoId  = (c as any).tecnico_id as string | undefined;

                        const nomePunido = isTecnico && tecnicoId
                          ? (nomeTec(tecnicoId) ?? nomeJog(c.jogador_id))
                          : nomeJog(c.jogador_id);

                        const tipoLabel: Record<string, string> = {
                          amarelo: '', vermelho: '',
                          amarelo_tecnico: 'Técnico', vermelho_tecnico: 'Técnico',
                        };

                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.45rem .75rem', background: 'var(--surface2)', borderRadius: 7, borderLeft: `3px solid ${corBorda}`, fontSize: '.83rem' }}>
                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', minWidth: 44, flexShrink: 0 }}>
                              {c.minuto}{(c as any).acrescimo > 0 ? `+${(c as any).acrescimo}` : ''}'
                            </span>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icone}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                                <strong>{nomePunido}</strong>
                                {tipoLabel[c.tipo] && (
                                  <span style={{ fontSize: '.68rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '.05rem .3rem', color: 'var(--text-muted)' }}>
                                    {tipoLabel[c.tipo]}
                                  </span>
                                )}
                              </div>
                              {c.motivo && (
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.15rem', fontStyle: 'italic' }}>
                                  {c.motivo}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '.1rem .35rem', fontFamily: "'Bebas Neue',sans-serif" }}>
                              {timeDoCartao?.sigla ?? c.time_id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {todosCartoes.length === 0 && (
                  <div style={{ padding: '.75rem 1.25rem', fontSize: '.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum cartão nesta partida.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
                    }
