import { getPartidas, getTimes, getEstadios, getJogadores } from '@/lib/data';
import { TimesClient } from './TimesClient';

export const dynamic = 'force-dynamic';

// Data de corte usada em "Vieram": fim da 1ª rodada — chegadas registradas
// depois dessa data são consideradas reforços "no meio da temporada".
const CORTE_RODADA_1 = '2026-01-29';

export default async function TimesPage() {
  const [partidas, times, estadios, jogadores] = await Promise.all([
    getPartidas(), getTimes(), getEstadios(), getJogadores(),
  ]);

  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  // ── Público por time ───────────────────────────────────────────────────────
  interface JogoPublico {
    rodada: number;
    data: string;
    adversario: string;
    placar_casa: number;
    placar_visitante: number;
    publico: number;
  }

  const publicoMap: Record<string, {
    casa: {
      total: number;
      jogos: number;
      jogosLista: JogoPublico[];
      porEstadio: Record<string, { total: number; jogos: number; nome: string }>;
    };
    visitante: { total: number; jogos: number };
    totalMinutos: number; // soma dos minutos de todas as partidas do time (casa + fora)
  }> = {};

  times.forEach(t => {
    publicoMap[t.id] = {
      casa: { total: 0, jogos: 0, jogosLista: [], porEstadio: {} },
      visitante: { total: 0, jogos: 0 },
      totalMinutos: 0,
    };
  });

  for (const p of encerradas) {
    const acr1 = p.acrescimo_primeiro ?? 0;
    const acr2 = p.acrescimo_segundo ?? 0;
    const minPartida = 45 + acr1 + 45 + acr2;

    // Acumular minutos totais para ambos os times
    if (publicoMap[p.time_casa_id])      publicoMap[p.time_casa_id].totalMinutos      += minPartida;
    if (publicoMap[p.time_visitante_id]) publicoMap[p.time_visitante_id].totalMinutos += minPartida;

    if (p.publico > 0) {
      // Casa
      if (publicoMap[p.time_casa_id]) {
        const adversarioTime = times.find(t => t.id === p.time_visitante_id);
        publicoMap[p.time_casa_id].casa.total  += p.publico;
        publicoMap[p.time_casa_id].casa.jogos++;
        publicoMap[p.time_casa_id].casa.jogosLista.push({
          rodada: p.rodada,
          data: p.data,
          adversario: adversarioTime?.nome ?? p.time_visitante_id,
          placar_casa: p.placar_casa,
          placar_visitante: p.placar_visitante,
          publico: p.publico,
        });
        const estadio = estadios.find(e => e.id === p.estadio_id);
        const estNome = estadio?.nome ?? p.estadio_id;
        if (!publicoMap[p.time_casa_id].casa.porEstadio[p.estadio_id]) {
          publicoMap[p.time_casa_id].casa.porEstadio[p.estadio_id] = { total: 0, jogos: 0, nome: estNome };
        }
        publicoMap[p.time_casa_id].casa.porEstadio[p.estadio_id].total += p.publico;
        publicoMap[p.time_casa_id].casa.porEstadio[p.estadio_id].jogos++;
      }
      // Visitante
      if (publicoMap[p.time_visitante_id]) {
        publicoMap[p.time_visitante_id].visitante.total += p.publico;
        publicoMap[p.time_visitante_id].visitante.jogos++;
      }
    }
  }

  // ── Estatísticas dos jogadores ─────────────────────────────────────────────
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
    ultimoJogoRodada: number | null;
  }

  const jogadorStatsMap: Record<string, JogadorStats> = {};
  jogadores.forEach(j => {
    jogadorStatsMap[j.id] = {
      jogador_id: j.id, gols: 0, gols_contra: 0, gols_sofridos: 0,
      assistencias: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0,
      minutos: 0, partidas: 0, ultimoJogoRodada: null,
    };
  });

  for (const p of encerradas) {
    const acr1 = p.acrescimo_primeiro ?? 0;
    const acr2 = p.acrescimo_segundo ?? 0;
    const totalPartida = 45 + acr1 + 45 + acr2;

    const todosEsc = [
      ...p.escalacao_casa.map(e => ({ ...e, timeId: p.time_casa_id })),
      ...p.escalacao_visitante.map(e => ({ ...e, timeId: p.time_visitante_id })),
    ];

    for (const esc of todosEsc) {
      const s = jogadorStatsMap[esc.jogador_id];
      if (!s) continue;
      const vermelho = p.cartoes.find(c => c.jogador_id === esc.jogador_id && c.tipo === 'vermelho');
      const minVerm = vermelho?.minuto ?? Infinity;
      let mins: number;
      if (esc.titular) {
        const sub = p.substituicoes.find(sub => sub.sai_id === esc.jogador_id);
        mins = Math.min(sub?.minuto ?? totalPartida, minVerm, totalPartida);
      } else {
        const entrada = p.substituicoes.find(sub => sub.entra_id === esc.jogador_id);
        if (!entrada) continue;
        const saida = p.substituicoes.find(sub => sub.sai_id === esc.jogador_id);
        mins = Math.min(saida?.minuto ?? totalPartida, minVerm, totalPartida) - entrada.minuto;
        if (mins <= 0) continue;
      }
      s.partidas++;
      s.minutos += mins;
      // Última rodada em que o jogador de fato esteve em campo
      if (s.ultimoJogoRodada === null || p.rodada > s.ultimoJogoRodada) {
        s.ultimoJogoRodada = p.rodada;
      }
    }

    for (const g of p.gols) {
      if (g.tipo === 'contra') {
        if (jogadorStatsMap[g.jogador_id]) jogadorStatsMap[g.jogador_id].gols_contra++;
        if (g.goleiro_id && jogadorStatsMap[g.goleiro_id]) jogadorStatsMap[g.goleiro_id].gols_sofridos++;
      } else {
        if (jogadorStatsMap[g.jogador_id]) jogadorStatsMap[g.jogador_id].gols++;
        if (g.assistencia_id && jogadorStatsMap[g.assistencia_id]) jogadorStatsMap[g.assistencia_id].assistencias++;
        if (g.goleiro_id && jogadorStatsMap[g.goleiro_id]) jogadorStatsMap[g.goleiro_id].gols_sofridos++;
      }
    }

    for (const c of p.cartoes) {
      if (!jogadorStatsMap[c.jogador_id]) continue;
      if (c.tipo === 'amarelo') jogadorStatsMap[c.jogador_id].cartoes_amarelos++;
      else if (c.tipo === 'vermelho') jogadorStatsMap[c.jogador_id].cartoes_vermelhos++;
    }
  }

  const nomeTimeOuVazio = (timeId: string | null | undefined): string | null => {
    if (!timeId || timeId === 'outros') return null;
    return times.find(t => t.id === timeId)?.nome ?? null;
  };

  // ── Montar timesData ───────────────────────────────────────────────────────
  const timesData = times.map(t => {
    const pub = publicoMap[t.id] ?? {
      casa: { total: 0, jogos: 0, jogosLista: [], porEstadio: {} },
      visitante: { total: 0, jogos: 0 },
      totalMinutos: 0,
    };

    // Ativos: time_atual === t.id
    const ativos = jogadores.filter(j => j.time_atual === t.id);

    // "Vieram" — combina dois grupos:
    // (A) jogadores que já passaram por aqui (2º clube ou posterior), mas já saíram
    // (B) qualquer jogador (ativo ou não) cuja chegada mais recente a este time
    //     ocorreu depois do fim da 1ª rodada (reforço no meio da temporada)
    const vieramExistentes = jogadores.filter(j => {
      if (j.time_atual === t.id) return false;
      const idx = j.transferencias.findIndex(tr => tr.time_id === t.id);
      if (idx < 0) return false;
      return idx > 0;
    });
    const idsVieramExistentes = new Set(vieramExistentes.map(j => j.id));

    const vieramRecentes = jogadores.filter(j => {
      if (idsVieramExistentes.has(j.id)) return false; // evita duplicar
      const transferenciasAqui = j.transferencias.filter(tr => tr.time_id === t.id);
      if (transferenciasAqui.length === 0) return false;
      const chegadaMaisRecente = [...transferenciasAqui].sort((a, b) => b.data.localeCompare(a.data))[0];
      return chegadaMaisRecente.data > CORTE_RODADA_1;
    });

    // "Foram embora" — passaram por aqui e já não estão mais no time
    const foramEmboraBase = jogadores.filter(j => {
      if (j.time_atual === t.id) return false;
      const idx = j.transferencias.findIndex(tr => tr.time_id === t.id);
      return idx >= 0;
    });

    return {
      time: t,
      publicoCasa: pub.casa,
      publicoVisitante: pub.visitante,
      totalMinutos: pub.totalMinutos,
      ativos: ativos.map(j => ({ ...j, stats: jogadorStatsMap[j.id] })),
      foramEmbora: foramEmboraBase.map(j => {
        // Última passagem (stint) por este time — para o caso de idas e vindas
        let idxUltimaPassagem = -1;
        j.transferencias.forEach((tr, i) => { if (tr.time_id === t.id) idxUltimaPassagem = i; });
        const proximoRegistro = idxUltimaPassagem >= 0 ? j.transferencias[idxUltimaPassagem + 1] : undefined;

        let destinoId: string | null = proximoRegistro?.time_id ?? null;
        let dataDestino: string | null = proximoRegistro?.data ?? null;

        // Sem registro explícito de saída, mas o cadastro já aponta outro time atual
        if (!proximoRegistro && j.time_atual && j.time_atual !== t.id) {
          destinoId = j.time_atual;
          dataDestino = null; // data exata desconhecida sem um registro de transferência
        }

        return {
          ...j,
          stats: jogadorStatsMap[j.id],
          destino: nomeTimeOuVazio(destinoId),
          dataDestino,
        };
      }),
      vieram: [
        ...vieramExistentes.map(j => {
          const trans = j.transferencias.filter(tr => tr.time_id === t.id);
          const origemId = j.transferencias[0]?.time_id ?? null;
          return {
            ...j,
            stats: jogadorStatsMap[j.id],
            transferencias_aqui: trans,
            origem: nomeTimeOuVazio(origemId),
          };
        }),
        ...vieramRecentes.map(j => {
          const trans = j.transferencias.filter(tr => tr.time_id === t.id);
          return {
            ...j,
            stats: jogadorStatsMap[j.id],
            transferencias_aqui: trans,
            origem: null, // origem em branco para reforços incluídos apenas pelo critério de data
          };
        }),
      ],
    };
  });

  return <TimesClient timesData={timesData} />;
}
