import { getPartidas, getTimes, getEstadios, getJogadores } from '@/lib/data';
import { DadosClient } from './DadosClient';

export const dynamic = 'force-dynamic';

export default async function DadosPage() {
  const [partidas, times, estadios, jogadores] = await Promise.all([
    getPartidas(), getTimes(), getEstadios(), getJogadores(),
  ]);

  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const totalJogos = encerradas.length;
  const totalGols = encerradas.reduce((s, p) => s + p.placar_casa + p.placar_visitante, 0);
  const totalGolsCasa = encerradas.reduce((s, p) => s + p.placar_casa, 0);
  const totalGolsVis = encerradas.reduce((s, p) => s + p.placar_visitante, 0);

  // Placares mais frequentes
  const placarMap: Record<string, number> = {};
  for (const p of encerradas) {
    const [a, b] = [p.placar_casa, p.placar_visitante].sort((x, y) => x - y);
    const key = `${a}×${b}`;
    placarMap[key] = (placarMap[key] ?? 0) + 1;
  }
  const placaresFrequentes = Object.entries(placarMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([placar, count]) => ({ placar, count }));

  // Placares mandante e visitante separados
  const placarCasaMap: Record<string, number> = {};
  const placarVisMap: Record<string, number> = {};
  for (const p of encerradas) {
    const kc = `${p.placar_casa}×${p.placar_visitante}`;
    const kv = `${p.placar_visitante}×${p.placar_casa}`;
    placarCasaMap[kc] = (placarCasaMap[kc] ?? 0) + 1;
    placarVisMap[kv] = (placarVisMap[kv] ?? 0) + 1;
  }
  const placaresFrequentesCasa = Object.entries(placarCasaMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([placar, count]) => ({ placar, count }));
  const placaresFrequentesVis = Object.entries(placarVisMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([placar, count]) => ({ placar, count }));

  // Ranking por estádio
  const estadioMap: Record<string, { gols: number; jogos: number; nome: string; cidade: string; estado: string }> = {};
  for (const p of encerradas) {
    if (!estadioMap[p.estadio_id]) {
      const e = estadios.find(e => e.id === p.estadio_id);
      estadioMap[p.estadio_id] = { gols: 0, jogos: 0, nome: e?.nome ?? p.estadio_id, cidade: e?.cidade ?? '', estado: e?.estado ?? '' };
    }
    estadioMap[p.estadio_id].gols += p.placar_casa + p.placar_visitante;
    estadioMap[p.estadio_id].jogos++;
  }
  const rankingEstadio = Object.values(estadioMap)
    .filter(e => e.jogos > 0)
    .map(e => ({ ...e, media: e.gols / e.jogos }))
    .sort((a, b) => b.media - a.media);

  // Ranking por estado
  const estadoMap: Record<string, { gols: number; jogos: number }> = {};
  for (const p of encerradas) {
    const e = estadios.find(e => e.id === p.estadio_id);
    const uf = e?.estado ?? '??';
    if (!estadoMap[uf]) estadoMap[uf] = { gols: 0, jogos: 0 };
    estadoMap[uf].gols += p.placar_casa + p.placar_visitante;
    estadoMap[uf].jogos++;
  }
  const rankingEstado = Object.entries(estadoMap)
    .filter(([, v]) => v.jogos > 0)
    .map(([uf, v]) => ({ uf, ...v, media: v.gols / v.jogos }))
    .sort((a, b) => b.media - a.media);

  // Arbitragem
  const arbMap: Record<string, { nome: string; jogos: number; gols: number; amarelos: number; vermelhos: number }> = {};
  for (const p of encerradas) {
    const arb = p.arbitragem?.principal;
    if (!arb) continue;
    if (!arbMap[arb]) arbMap[arb] = { nome: arb, jogos: 0, gols: 0, amarelos: 0, vermelhos: 0 };
    arbMap[arb].jogos++;
    arbMap[arb].gols += p.placar_casa + p.placar_visitante;
    for (const c of p.cartoes) {
      if (c.tipo === 'amarelo') arbMap[arb].amarelos++;
      else arbMap[arb].vermelhos++;
    }
  }
  const rankingArbitros = Object.values(arbMap)
    .sort((a, b) => b.jogos - a.jogos);

  // Ranking G/90 jogadores
  const statsJogMap: Record<string, { nome: string; time_id: string; gols: number; minutos: number }> = {};
  for (const j of jogadores) {
    statsJogMap[j.id] = { nome: j.nome, time_id: j.time_atual, gols: 0, minutos: 0 };
  }
  for (const p of encerradas) {
    const acr1 = p.acrescimo_primeiro ?? 0;
    const acr2 = p.acrescimo_segundo ?? 0;
    const totalP = 45 + acr1 + 45 + acr2;
    const todosEsc = [
      ...p.escalacao_casa.map((e: any) => ({ ...e })),
      ...p.escalacao_visitante.map((e: any) => ({ ...e })),
    ];
    for (const esc of todosEsc) {
      if (!statsJogMap[esc.jogador_id]) continue;
      const vermelho = p.cartoes.find((c: any) => c.jogador_id === esc.jogador_id && c.tipo === 'vermelho');
      const minVerm = vermelho?.minuto ?? Infinity;
      let mins: number;
      if (esc.titular) {
        const sub = p.substituicoes.find((s: any) => s.sai_id === esc.jogador_id);
        mins = Math.min(sub ? sub.minuto : totalP, minVerm, totalP);
      } else {
        const ent = p.substituicoes.find((s: any) => s.entra_id === esc.jogador_id);
        if (!ent) continue;
        const sai = p.substituicoes.find((s: any) => s.sai_id === esc.jogador_id);
        mins = Math.min(sai ? sai.minuto : totalP, minVerm, totalP) - ent.minuto;
      }
      statsJogMap[esc.jogador_id].minutos += mins;
    }
    for (const g of p.gols) {
      if (g.tipo === 'contra') continue;
      if (statsJogMap[g.jogador_id]) statsJogMap[g.jogador_id].gols++;
    }
  }
  const rankingG90 = Object.values(statsJogMap)
    .filter(j => j.minutos >= 90 && j.gols > 0)
    .map(j => ({ ...j, g90: (j.gols / j.minutos) * 90 }))
    .sort((a, b) => b.g90 - a.g90)
    .slice(0, 15);

  return (
    <DadosClient
      totalJogos={totalJogos}
      totalGols={totalGols}
      totalGolsCasa={totalGolsCasa}
      totalGolsVis={totalGolsVis}
      placaresFrequentes={placaresFrequentes}
      placaresFrequentesCasa={placaresFrequentesCasa}
      placaresFrequentesVis={placaresFrequentesVis}
      rankingEstadio={rankingEstadio}
      rankingEstado={rankingEstado}
      rankingArbitros={rankingArbitros}
      rankingG90={rankingG90}
      times={times}
    />
  );
}
