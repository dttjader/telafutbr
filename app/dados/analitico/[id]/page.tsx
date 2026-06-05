import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getJogadores, getPartidas, getTimes, getEstadios } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

const POS_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral',
  VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

const NAC_FLAG: Record<string, string> = {
  Brasileiro: '🇧🇷', Argentino: '🇦🇷', Uruguaio: '🇺🇾',
  Chileno: '🇨🇱', Paraguaio: '🇵🇾', Colombiano: '🇨🇴', 'Outros Países': '🌍',
};

function calcularMinutos(jogadorId: string, partida: any, ehTitular: boolean): number {
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;
  const vermelho = partida.cartoes.find((c: any) => c.jogador_id === jogadorId && c.tipo === 'vermelho');
  const minutoVermelho = vermelho?.minuto ?? Infinity;
  if (ehTitular) {
    const sub = partida.substituicoes.find((s: any) => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida);
  } else {
    const entrada = partida.substituicoes.find((s: any) => s.entra_id === jogadorId);
    if (!entrada) return 0;
    const saida = partida.substituicoes.find((s: any) => s.sai_id === jogadorId);
    const minutoSaida = saida ? Math.min(saida.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida) - entrada.minuto;
  }
}

export default async function JogadorPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jogadores, partidas, times, estadios] = await Promise.all([
    getJogadores(), getPartidas(), getTimes(), getEstadios(),
  ]);

  const jogador = jogadores.find(j => j.id === id);
  if (!jogador) notFound();

  const time = times.find(t => t.id === jogador.time_atual);
  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  interface EventoTimeline {
    tipo: 'entrada' | 'saida' | 'gol' | 'gol_contra' | 'assistencia' | 'amarelo' | 'vermelho';
    minuto: number;
    acrescimo?: number;
    descricao: string;
  }

  interface PartidaTimeline {
    partida: any;
    timeCasa: any;
    timeVis: any;
    estadio: any;
    titular: boolean;
    minutos: number;
    minutoEntrada: number;
    minutoSaida: number | null;
    eventos: EventoTimeline[];
  }

  const historicoPartidas: PartidaTimeline[] = [];

  for (const p of encerradas) {
    const todosEsc = [
      ...p.escalacao_casa.map((e: any) => ({ ...e, timeId: p.time_casa_id })),
      ...p.escalacao_visitante.map((e: any) => ({ ...e, timeId: p.time_visitante_id })),
    ];
    const esc = todosEsc.find((e: any) => e.jogador_id === id);
    if (!esc) continue;

    const acr1 = p.acrescimo_primeiro ?? 0;
    const acr2 = p.acrescimo_segundo ?? 0;
    const totalPartida = 45 + acr1 + 45 + acr2;

    const subEntrada = p.substituicoes.find((s: any) => s.entra_id === id);
    const subSaida = p.substituicoes.find((s: any) => s.sai_id === id);
    const vermelhoPartida = p.cartoes.find((c: any) => c.jogador_id === id && c.tipo === 'vermelho');
    const minutoEntrada = esc.titular ? 0 : (subEntrada?.minuto ?? 0);
    const minutoSaidaSub = subSaida?.minuto ?? null;
    const minutoSaidaVerm = vermelhoPartida?.minuto ?? null;
    const minutoSaida = minutoSaidaSub !== null && minutoSaidaVerm !== null
      ? Math.min(minutoSaidaSub, minutoSaidaVerm)
      : minutoSaidaSub ?? minutoSaidaVerm;
    const mins = calcularMinutos(id, p, esc.titular);

    const eventos: EventoTimeline[] = [];

    if (!esc.titular && subEntrada) eventos.push({ tipo: 'entrada', minuto: subEntrada.minuto, descricao: 'Entrou em campo' });
    if (subSaida && (!minutoSaidaVerm || subSaida.minuto <= (minutoSaidaVerm ?? Infinity))) {
      eventos.push({ tipo: 'saida', minuto: subSaida.minuto, descricao: 'Substituído' });
    }

    for (const g of p.gols) {
      if (g.jogador_id === id) {
        eventos.push({ tipo: g.tipo === 'contra' ? 'gol_contra' : 'gol', minuto: g.minuto, acrescimo: g.acrescimo, descricao: g.tipo === 'contra' ? 'Gol contra' : g.tipo === 'penalti' ? 'Gol de pênalti' : g.tipo === 'falta' ? 'Gol de falta' : 'Gol' });
      }
      if (g.assistencia_id === id) {
        eventos.push({ tipo: 'assistencia', minuto: g.minuto, acrescimo: g.acrescimo, descricao: `Assistência para ${jogadores.find(j => j.id === g.jogador_id)?.nome ?? '?'}` });
      }
    }

    for (const c of p.cartoes) {
      if (c.jogador_id === id) {
        eventos.push({ tipo: c.tipo === 'amarelo' ? 'amarelo' : 'vermelho', minuto: c.minuto, descricao: c.motivo || (c.tipo === 'amarelo' ? 'Cartão amarelo' : 'Cartão vermelho') });
      }
    }

    eventos.sort((a, b) => a.minuto - b.minuto);

    historicoPartidas.push({
      partida: p,
      timeCasa: times.find(t => t.id === p.time_casa_id),
      timeVis: times.find(t => t.id === p.time_visitante_id),
      estadio: estadios.find(e => e.id === p.estadio_id),
      titular: esc.titular,
      minutos: mins,
      minutoEntrada,
      minutoSaida,
      eventos,
    });
  }

  const totalGols    = historicoPartidas.reduce((acc, h) => acc + h.eventos.filter(e => e.tipo === 'gol').length, 0);
  const totalAssist  = historicoPartidas.reduce((acc, h) => acc + h.eventos.filter(e => e.tipo === 'assistencia').length, 0);
  const totalAmarelos  = historicoPartidas.reduce((acc, h) => acc + h.eventos.filter(e => e.tipo === 'amarelo').length, 0);
  const totalVermelhos = historicoPartidas.reduce((acc, h) => acc + h.eventos.filter(e => e.tipo === 'vermelho').length, 0);
  const totalMinutos   = historicoPartidas.reduce((acc, h) => acc + h.minutos, 0);

  const eventoIcon:  Record<string, string> = { entrada: '↑', saida: '↓', gol: '⚽', gol_contra: '🔴', assistencia: '🎯', amarelo: '🟨', vermelho: '🟥' };
  const eventoColor: Record<string, string> = { entrada: 'var(--libertadores)', saida: 'var(--rebaixamento)', gol: '#fbbf24', gol_contra: 'var(--rebaixamento)', assistencia: '#60a5fa', amarelo: '#f59e0b', vermelho: 'var(--rebaixamento)' };

  const nac = jogador.nacionalidade ?? 'Brasileiro';
  const nacFlag = NAC_FLAG[nac] ?? '🌍';
  const isEstrangeiro = nac !== 'Brasileiro';

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          {/* Link de volta aponta para /dados/analitico */}
          <Link href="/dados/analitico" style={{ fontSize: '.78rem', color: 'var(--verde)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginBottom: '1rem' }}>
            ← Voltar ao Analítico
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <EscudoTime time={time ?? undefined} size={72} />
            <div>
              <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1 }}>{jogador.nome}</h1>
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {jogador.numero && <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)' }}>#{jogador.numero}</span>}
                <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '.15rem .5rem', fontSize: '.78rem', color: 'var(--text-muted)' }}>{POS_LABEL[jogador.posicao]}</span>
                {jogador.idade && <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{jogador.idade} anos</span>}
                {isEstrangeiro && <span style={{ fontSize: '.78rem' }}>{nacFlag} {nac}</span>}
                <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{time?.nome ?? '—'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Partidas',      valor: historicoPartidas.length, cor: 'var(--amarelo)'      },
              { label: 'Minutos',       valor: totalMinutos,             cor: 'var(--verde)'         },
              { label: 'Gols',          valor: totalGols,                cor: '#fbbf24'              },
              { label: 'Assistências',  valor: totalAssist,              cor: '#60a5fa'              },
              { label: 'Amarelos',      valor: totalAmarelos,            cor: '#f59e0b'              },
              { label: 'Vermelhos',     valor: totalVermelhos,           cor: 'var(--rebaixamento)'  },
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
        {historicoPartidas.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Nenhuma partida registrada para este jogador.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {historicoPartidas.map(({ partida: p, timeCasa, timeVis, estadio, titular, minutos, minutoEntrada, minutoSaida, eventos }) => {
            const acr1 = p.acrescimo_primeiro ?? 0;
            const acr2 = p.acrescimo_segundo ?? 0;
            const totalPartida = 45 + acr1 + 45 + acr2;
            const jogadorEhCasa = p.escalacao_casa.some((e: any) => e.jogador_id === id);
            const meuTime    = jogadorEhCasa ? timeCasa : timeVis;
            const adversario = jogadorEhCasa ? timeVis  : timeCasa;
            const meuPlacar  = jogadorEhCasa ? p.placar_casa : p.placar_visitante;
            const advPlacar  = jogadorEhCasa ? p.placar_visitante : p.placar_casa;
            const resultado: 'V' | 'E' | 'D' = meuPlacar > advPlacar ? 'V' : meuPlacar < advPlacar ? 'D' : 'E';
            const resCor = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' }[resultado];
            const resBg  = { V: 'rgba(34,197,94,.1)',  E: 'rgba(245,158,11,.1)', D: 'rgba(239,68,68,.1)' }[resultado];

            const barWidth = (minutos / totalPartida) * 100;
            const barStart = (minutoEntrada / totalPartida) * 100;

            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ background: resBg, border: `1px solid ${resCor}`, borderRadius: 6, padding: '.2rem .6rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: resCor, minWidth: 32, textAlign: 'center' }}>{resultado}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flex: 1 }}>
                    <EscudoTime time={meuTime ?? undefined} size={28} />
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{meuTime?.sigla}</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.3rem', color: resCor }}>{meuPlacar} × {advPlacar}</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{adversario?.sigla}</span>
                    <EscudoTime time={adversario ?? undefined} size={28} />
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div>{p.data.split('-').reverse().join('/')} · Rodada {p.rodada}</div>
                    {estadio && <div>{estadio.nome}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '.72rem', background: titular ? 'rgba(0,168,79,.15)' : 'rgba(255,255,255,.07)', color: titular ? 'var(--verde)' : 'var(--text-muted)', border: `1px solid ${titular ? 'rgba(0,168,79,.3)' : 'var(--border)'}`, borderRadius: 4, padding: '.15rem .5rem' }}>
                      {titular ? 'Titular' : 'Reserva'}
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)' }}>{minutos}&apos;</span>
                  </div>
                </div>

                <div style={{ padding: '.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: '.3rem' }}>
                    <span>0&apos;</span><span>45+{acr1}&apos;</span><span>90+{acr2}&apos;</span>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: '#222', borderRadius: 4, overflow: 'visible' }}>
                    <div style={{ position: 'absolute', left: '45.45%', top: -2, width: 1, height: 12, background: '#444', zIndex: 1 }} />
                    <div style={{ position: 'absolute', left: `${barStart}%`, width: `${barWidth}%`, height: '100%', background: 'var(--verde)', borderRadius: 4, minWidth: 4 }} />
                    {eventos.map((ev, ei) => {
                      const pos = (ev.minuto / totalPartida) * 100;
                      return (
                        <div key={ei} title={`${ev.minuto}' - ${ev.descricao}`} style={{ position: 'absolute', left: `${Math.min(pos, 98)}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: eventoColor[ev.tipo], border: '2px solid var(--surface2)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, cursor: 'default' }} />
                      );
                    })}
                  </div>
                </div>

                {eventos.length > 0 ? (
                  <div style={{ padding: '.75rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                    {eventos.map((ev, ei) => (
                      <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'var(--surface2)', border: `1px solid ${eventoColor[ev.tipo]}33`, borderRadius: 6, padding: '.3rem .65rem', fontSize: '.8rem' }}>
                        <span>{eventoIcon[ev.tipo]}</span>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: eventoColor[ev.tipo], fontSize: '.95rem' }}>{ev.minuto}{ev.acrescimo ? `+${ev.acrescimo}` : ''}&apos;</span>
                        <span style={{ color: 'var(--text-muted)' }}>{ev.descricao}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '.75rem 1.25rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem eventos registrados nesta partida.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
