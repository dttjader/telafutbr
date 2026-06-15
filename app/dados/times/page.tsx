import { getPartidas, getTimes, getEstadios, getJogadores } from '@/lib/data';
import { TimesClient } from './TimesClient';

export const dynamic = 'force-dynamic';

export default async function TimesPage() {
  const [partidas, times, estadios, jogadores] = await Promise.all([
    getPartidas(), getTimes(), getEstadios(), getJogadores(),
  ]);

  const encerradas = partidas.filter(p => p.status === 'encerrada');

  // ── Público por time ───────────────────────────────────────────────────────
  const publicoMap: Record<string, {
    casa: { total: number; jogos: number; porEstadio: Record<string, { total: number; jogos: number; nome: string }> };
    visitante: { total: number; jogos: number };
  }> = {};

  times.forEach(t => {
    publicoMap[t.id] = {
      casa: { total: 0, jogos: 0, porEstadio: {} },
      visitante: { total: 0, jogos: 0 },
    };
  });

  for (const p of encerradas) {
    if (p.publico > 0) {
      // Casa
      if (publicoMap[p.time_casa_id]) {
        publicoMap[p.time_casa_id].casa.total += p.publico;
        publicoMap[p.time_casa_id].casa.jogos++;
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

  // ── Jogadores do time ──────────────────────────────────────────────────────
  // Ativos: time_atual === timeId (mas não 'outros')
  // Transferidos para cá: alguma transferencia com time_id === timeId mas time_atual !== timeId
  // Foram embora: mesma coisa, mas de saída

  // ── Estatísticas dos jogadores por time ────────────────────────────────────
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

  const jogadorStatsMap: Record<string, JogadorStats> = {};
  jogadores.forEach(j => {
    jogadorStatsMap[j.id] = {
      jogador_id: j.id, gols: 0, gols_contra: 0, gols_sofridos: 0,
      assistencias: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0,
      minutos: 0, partidas: 0,
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

  // Serializar os dados para o client
  const timesData = times.map(t => {
    const pub = publicoMap[t.id] ?? { casa: { total: 0, jogos: 0, porEstadio: {} }, visitante: { total: 0, jogos: 0 } };

    // Jogadores ativos no time
    const ativos = jogadores.filter(j => j.time_atual === t.id);

    // Jogadores que vieram para cá (transferências com time_id === t.id mas que não são mais o time atual, ou que estão aqui)
    const vieramParaCa = jogadores.filter(j =>
      j.time_atual !== t.id &&
      j.transferencias.some(tr => tr.time_id === t.id)
    );

    // Jogadores que saíram (estiveram aqui mas foram embora = tem uma transferencia aqui mas o time_atual é outro)
    // Já coberto por vieramParaCa na outra perspectiva
    // Para o time atual: quem JÁ passou por aqui e saiu
    const foramEmbora = jogadores.filter(j =>
      j.time_atual !== t.id &&
      j.transferencias.some(tr => tr.time_id === t.id)
    );

    return {
      time: t,
      publicoCasa: pub.casa,
      publicoVisitante: pub.visitante,
      ativos: ativos.map(j => ({ ...j, stats: jogadorStatsMap[j.id] })),
      foramEmbora: foramEmbora.map(j => ({ ...j, stats: jogadorStatsMap[j.id] })),
      vieram: vieramParaCa.map(j => {
        const trans = j.transferencias.filter(tr => tr.time_id === t.id);
        return { ...j, stats: jogadorStatsMap[j.id], transferencias_aqui: trans };
      }),
    };
  });

  return <TimesClient timesData={timesData} />;
      }
