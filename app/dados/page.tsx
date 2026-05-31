import { getPartidas, getTimes, getEstadios, getJogadores, getTecnicos } from '@/lib/data';
import { DadosClient } from './DadosClient';

export const dynamic = 'force-dynamic';

export default async function DadosPage() {
  const [partidas, times, estadios, jogadores, tecnicos] = await Promise.all([
    getPartidas(), getTimes(), getEstadios(), getJogadores(), getTecnicos(),
  ]);

  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const totalJogos = encerradas.length;
  const totalGols = encerradas.reduce((s, p) => s + p.placar_casa + p.placar_visitante, 0);
  const totalGolsCasa = encerradas.reduce((s, p) => s + p.placar_casa, 0);
  const totalGolsVis = encerradas.reduce((s, p) => s + p.placar_visitante, 0);

  // Placares mais frequentes
  const placarMap: Record<string, { count: number; vitoriasVisitante: number }> = {};
  for (const p of encerradas) {
    const [a, b] = [p.placar_casa, p.placar_visitante].sort((x, y) => x - y);
    const key = `${a}×${b}`;
    if (!placarMap[key]) placarMap[key] = { count: 0, vitoriasVisitante: 0 };
    placarMap[key].count++;
    if (p.placar_visitante > p.placar_casa) placarMap[key].vitoriasVisitante++;
  }
  const placaresFrequentes = Object.entries(placarMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([placar, data]) => ({
      placar,
      count: data.count,
      vitoriasVisitante: data.vitoriasVisitante,
      isEmpate: placar.split('×')[0] === placar.split('×')[1]
    }));

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
      else if (c.tipo === 'vermelho') arbMap[arb].vermelhos++;
      else if (c.tipo === 'amarelo_tecnico') arbMap[arb].amarelos++;
      else if (c.tipo === 'vermelho_tecnico') arbMap[arb].vermelhos++;
    }
  }
  const rankingArbitros = Object.values(arbMap).sort((a, b) => b.jogos - a.jogos);

  // IDs de todos os técnicos para cruzamento com cartões
  const tecnicoIds = new Set(tecnicos.map(t => t.id));

  // Ranking técnicos com cartões
  // Cartões de técnicos foram registrados na aba Cartões da partida usando o id do técnico como jogador_id
  const tecnicoMap: Record<string, {
    tecnico_id: string; j: number; v: number; e: number; d: number;
    gp: number; gc: number; amarelos: number; vermelhos: number;
  }> = {};

  for (const p of encerradas) {
    const processar = (tecnicoId: string | null, isCasa: boolean) => {
      if (!tecnicoId) return;
      if (!tecnicoMap[tecnicoId]) tecnicoMap[tecnicoId] = { tecnico_id: tecnicoId, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, amarelos: 0, vermelhos: 0 };
      const r = tecnicoMap[tecnicoId];
      const gf = isCasa ? p.placar_casa : p.placar_visitante;
      const gc = isCasa ? p.placar_visitante : p.placar_casa;
      r.j++; r.gp += gf; r.gc += gc;
      if (gf > gc) r.v++; else if (gf < gc) r.d++; else r.e++;
    };
    processar(p.tecnico_casa_id, true);
    processar(p.tecnico_visitante_id, false);

    // Cartões de técnicos: tipo === 'amarelo_tecnico' ou 'vermelho_tecnico'
    for (const c of p.cartoes) {
      if (c.tipo !== 'amarelo_tecnico' && c.tipo !== 'vermelho_tecnico') continue;
      // Garante entrada no mapa mesmo se técnico não foi registrado na partida
      if (!tecnicoMap[c.jogador_id]) {
        tecnicoMap[c.jogador_id] = { tecnico_id: c.jogador_id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, amarelos: 0, vermelhos: 0 };
      }
      if (c.tipo === 'amarelo_tecnico') tecnicoMap[c.jogador_id].amarelos++;
      else tecnicoMap[c.jogador_id].vermelhos++;
    }
  }

  const rankingTecnicos = Object.values(tecnicoMap)
    .filter(r => r.j > 0 || r.amarelos > 0 || r.vermelhos > 0)
    .map(r => ({ ...r, pts: r.v * 3 + r.e, aproveitamento: r.j > 0 ? Math.round((r.v * 3 + r.e) / (r.j * 3) * 100) : 0 }))
    .sort((a, b) => b.aproveitamento - a.aproveitamento || b.v - a.v);

  return (
    <DadosClient
      totalJogos={totalJogos}
      totalGols={totalGols}
      totalGolsCasa={totalGolsCasa}
      totalGolsVis={totalGolsVis}
      placaresFrequentes={placaresFrequentes}
      rankingEstadio={rankingEstadio}
      rankingEstado={rankingEstado}
      rankingArbitros={rankingArbitros}
      rankingTecnicos={rankingTecnicos}
      tecnicos={tecnicos}
      times={times}
    />
  );
}
