import { getJogadores, getPartidas, getTimes } from '@/lib/data';
import { Partida, Jogador } from '@/lib/types';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

const POSICAO_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral',
  VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

interface Stats {
  jogador: Jogador;
  partidas: number;
  titular: number;
  reserva: number;
  minutos: number;
  gols: number;
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  minutos_com_amarelo: number;
}

function calcularMinutos(
  jogadorId: string,
  partida: Partida,
  ehTitular: boolean,
): number {
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;

  const subs = partida.substituicoes;

  if (ehTitular) {
    // Titular — começa no 0, pode sair substituído
    const sub = subs.find(s => s.sai_id === jogadorId);
    if (sub) return sub.minuto;
    return totalPartida;
  } else {
    // Reserva — entra substituído, pode sair depois
    const entrada = subs.find(s => s.entra_id === jogadorId);
    if (!entrada) return 0;
    const minutosEntrada = entrada.minuto;
    // Verifica se foi substituído depois
    const saida = subs.find(s => s.sai_id === jogadorId);
    if (saida) return saida.minuto - minutosEntrada;
    return totalPartida - minutosEntrada;
  }
}

function calcularMinutosComAmarelo(
  jogadorId: string,
  partida: Partida,
  minutosJogados: number,
  minutoEntrada: number,
): number {
  const amarelos = partida.cartoes.filter(
    c => c.jogador_id === jogadorId && c.tipo === 'amarelo'
  );
  if (amarelos.length === 0) return 0;
  const primeiroAmarelo = Math.min(...amarelos.map(c => c.minuto));
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;
  const saidaEfetiva = minutoEntrada + minutosJogados;
  return saidaEfetiva - primeiroAmarelo;
}

export default async function AnaliticoPage() {
  const [jogadores, partidas, times] = await Promise.all([
    getJogadores(), getPartidas(), getTimes(),
  ]);

  const encerradas = partidas.filter(p => p.status === 'encerrada');

  // Calcular estatísticas por jogador
  const statsMap: Record<string, Stats> = {};

  for (const j of jogadores) {
    statsMap[j.id] = {
      jogador: j,
      partidas: 0, titular: 0, reserva: 0, minutos: 0,
      gols: 0, assistencias: 0,
      cartoes_amarelos: 0, cartoes_vermelhos: 0, minutos_com_amarelo: 0,
    };
  }

  for (const p of encerradas) {
    const todosEscalados = [
      ...p.escalacao_casa.map(e => ({ ...e, timeId: p.time_casa_id })),
      ...p.escalacao_visitante.map(e => ({ ...e, timeId: p.time_visitante_id })),
    ];

    for (const esc of todosEscalados) {
      const s = statsMap[esc.jogador_id];
      if (!s) continue;

      const mins = calcularMinutos(esc.jogador_id, p, esc.titular);
      if (mins === 0 && !esc.titular) continue;

      s.partidas++;
      if (esc.titular) s.titular++; else s.reserva++;
      s.minutos += mins;

      // Minuto de entrada
      const entradaSub = p.substituicoes.find(sub => sub.entra_id === esc.jogador_id);
      const minutoEntrada = esc.titular ? 0 : (entradaSub?.minuto ?? 0);

      const minsAmarelo = calcularMinutosComAmarelo(esc.jogador_id, p, mins, minutoEntrada);
      s.minutos_com_amarelo += Math.max(0, minsAmarelo);
    }

    // Gols
    for (const g of p.gols) {
      if (g.tipo !== 'contra') {
        if (statsMap[g.jogador_id]) statsMap[g.jogador_id].gols++;
        if (g.assistencia_id && statsMap[g.assistencia_id]) statsMap[g.assistencia_id].assistencias++;
      }
    }

    // Cartões
    for (const c of p.cartoes) {
      if (!statsMap[c.jogador_id]) continue;
      if (c.tipo === 'amarelo') statsMap[c.jogador_id].cartoes_amarelos++;
      else statsMap[c.jogador_id].cartoes_vermelhos++;
    }
  }

  const lista = Object.values(statsMap)
    .filter(s => s.partidas > 0)
    .sort((a, b) => b.minutos - a.minutos || b.partidas - a.partidas);

  const posicoes = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Analítico de Jogadores</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.9rem' }}>
            {lista.length} jogador(es) com partidas registradas · {encerradas.length} partida(s) encerrada(s)
          </p>
        </div>
      </div>

      <div className="container">
        {lista.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            Nenhum jogador com partidas registradas ainda.
          </p>
        )}

        {/* Por posição */}
        {posicoes.map(pos => {
          const jogPos = lista.filter(s => s.jogador.posicao === pos);
          if (jogPos.length === 0) return null;
          return (
            <section key={pos} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                {POSICAO_LABEL[pos]}
                <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontFamily: 'Barlow, sans-serif', fontWeight: 400 }}>{jogPos.length} jogador(es)</span>
              </h2>

              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                    <tr>
                      {[
                        ['Jogador', 'left', 180],
                        ['Time', 'left', 130],
                        ['Nac.', 'center', 50],
                        ['Idade', 'center', 50],
                        ['P', 'center', 40],
                        ['T', 'center', 40],
                        ['R', 'center', 40],
                        ['Min', 'center', 55],
                        ['Gols', 'center', 50],
                        ['Ast.', 'center', 50],
                        ['🟨', 'center', 44],
                        ['🟥', 'center', 44],
                        ['Min c/ 🟨', 'center', 80],
                      ].map(([h, align, w]) => (
                        <th key={h as string} style={{ padding: '.6rem .8rem', textAlign: align as 'left' | 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap', width: w as number }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jogPos.map((s, i) => {
                      const time = times.find(t => t.id === s.jogador.time_atual);
                      return (
                        <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                          {/* Nome */}
                          <td style={{ padding: '.55rem .8rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.jogador.nome}</div>
                            {s.jogador.numero && (
                              <div style={{ fontSize: '.7rem', color: 'var(--verde)' }}>#{s.jogador.numero}</div>
                            )}
                          </td>
                          {/* Time */}
                          <td style={{ padding: '.55rem .8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                              <EscudoTime time={time ?? undefined} size={22} />
                              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{time?.sigla ?? '—'}</span>
                            </div>
                          </td>
                          {/* Nac */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem' }}>
                            <span title={s.jogador.nacionalidade}>
                              {s.jogador.nacionalidade === 'Estrangeiro' ? '🌍' : '🇧🇷'}
                            </span>
                          </td>
                          {/* Idade */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', color: 'var(--text-muted)' }}>
                            {s.jogador.idade ?? '—'}
                          </td>
                          {/* Partidas */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem' }}>
                            {s.partidas}
                          </td>
                          {/* Titular */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', color: 'var(--verde)' }}>
                            {s.titular}
                          </td>
                          {/* Reserva */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', color: 'var(--text-muted)' }}>
                            {s.reserva}
                          </td>
                          {/* Minutos */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>
                            {s.minutos}
                          </td>
                          {/* Gols */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', fontWeight: 600, color: s.gols > 0 ? 'var(--libertadores)' : 'var(--text-muted)' }}>
                            {s.gols}
                          </td>
                          {/* Assistências */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', color: s.assistencias > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                            {s.assistencias}
                          </td>
                          {/* Cartão amarelo */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', fontWeight: 600, color: s.cartoes_amarelos > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {s.cartoes_amarelos}
                          </td>
                          {/* Cartão vermelho */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', fontWeight: 600, color: s.cartoes_vermelhos > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>
                            {s.cartoes_vermelhos}
                          </td>
                          {/* Minutos com amarelo */}
                          <td style={{ textAlign: 'center', padding: '.55rem .4rem', color: s.minutos_com_amarelo > 0 ? '#f59e0b' : 'var(--text-muted)', fontSize: '.85rem' }}>
                            {s.minutos_com_amarelo > 0 ? `${s.minutos_com_amarelo}'` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        {/* Legenda */}
        <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <span><strong style={{ color: 'var(--text)' }}>P</strong> Partidas</span>
          <span><strong style={{ color: 'var(--verde)' }}>T</strong> Titular</span>
          <span><strong style={{ color: 'var(--text)' }}>R</strong> Reserva</span>
          <span><strong style={{ color: 'var(--amarelo)' }}>Min</strong> Minutos jogados (45min/tempo + acréscimos)</span>
          <span><strong style={{ color: 'var(--text)' }}>Ast.</strong> Assistências</span>
          <span><strong style={{ color: '#f59e0b' }}>Min c/ 🟨</strong> Minutos jogados após receber cartão amarelo</span>
        </div>
      </div>
    </div>
  );
}
