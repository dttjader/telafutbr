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

  // Agrupa por placar normalizado (maior gols × menor gols), independente de mandante/visitante
  // 1x0 e 0x1 viram ambos "1x0"; vitVisitante conta quantas vezes o menor placar era do mandante
  const placarMap: Record<string, { count: number; vitVisitante: number; empates: number }> = {};
  for (const p of encerradas) {
    const casaVenceu = p.placar_casa > p.placar_visitante;
    const visVenceu  = p.placar_visitante > p.placar_casa;
    const empate     = p.placar_casa === p.placar_visitante;
    const [a, b] = casaVenceu
      ? [p.placar_casa, p.placar_visitante]
      : [p.placar_visitante, p.placar_casa];
    const key = `${a}x${b}`;
    if (!placarMap[key]) placarMap[key] = { count: 0, vitVisitante: 0, empates: 0 };
    placarMap[key].count++;
    if (visVenceu)  placarMap[key].vitVisitante++;
    if (empate)     placarMap[key].empates++;
  }
  const placaresFrequentes = Object.entries(placarMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([placar, data]) => ({
      placar: placar.replace('x', '\u00d7'),
      count: data.count,
      vitVisitante: data.vitVisitante,
      isEmpate: data.empates === data.count,
    }));

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

  type CargoArbitro = 'principal' | 'assistente1' | 'assistente2' | 'quarto' | 'var';
  type EntradaArbitro = { nome: string; cargo: CargoArbitro; jogos: number; gols: number; amarelos: number; vermelhos: number };

  const arbMapPorCargo: Record<string, EntradaArbitro> = {};
  const addArbitro = (nome: string, cargo: CargoArbitro, gols: number, amarelos: number, vermelhos: number) => {
    if (!nome || !nome.trim()) return;
    const key = `${cargo}::${nome.trim()}`;
    if (!arbMapPorCargo[key]) arbMapPorCargo[key] = { nome: nome.trim(), cargo, jogos: 0, gols: 0, amarelos: 0, vermelhos: 0 };
    arbMapPorCargo[key].jogos++;
    arbMapPorCargo[key].gols += gols;
    arbMapPorCargo[key].amarelos += amarelos;
    arbMapPorCargo[key].vermelhos += vermelhos;
  };

  for (const p of encerradas) {
    const golsPartida = p.placar_casa + p.placar_visitante;
    let amarelos = 0, vermelhos = 0;
    for (const c of p.cartoes) {
      if (c.tipo === 'amarelo' || c.tipo === 'amarelo_tecnico') amarelos++;
      else if (c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico') vermelhos++;
    }
    const arb = p.arbitragem;
    if (arb?.principal) addArbitro(arb.principal, 'principal', golsPartida, amarelos, vermelhos);
    if (arb?.assistente1) addArbitro(arb.assistente1, 'assistente1', golsPartida, amarelos, vermelhos);
    if (arb?.assistente2) addArbitro(arb.assistente2, 'assistente2', golsPartida, amarelos, vermelhos);
    if (arb?.quarto) addArbitro(arb.quarto, 'quarto', golsPartida, amarelos, vermelhos);
    if (arb?.var) addArbitro(arb.var, 'var', golsPartida, amarelos, vermelhos);
  }

  const rankingArbitrosPorCargo: EntradaArbitro[] = Object.values(arbMapPorCargo).sort((a, b) => b.jogos - a.jogos);

  const totalRodadas = new Set(encerradas.map(p => p.rodada)).size;

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

    for (const c of p.cartoes) {
      if (c.tipo !== 'amarelo_tecnico' && c.tipo !== 'vermelho_tecnico') continue;
      const tecId = c.tecnico_id;
      if (!tecId) continue;
      if (!tecnicoMap[tecId]) tecnicoMap[tecId] = { tecnico_id: tecId, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, amarelos: 0, vermelhos: 0 };
      if (c.tipo === 'amarelo_tecnico') tecnicoMap[tecId].amarelos++;
      else tecnicoMap[tecId].vermelhos++;
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
      rankingArbitrosPorCargo={rankingArbitrosPorCargo}
      rankingTecnicos={rankingTecnicos}
      totalRodadas={totalRodadas}
      tecnicos={tecnicos}
      times={times}
    />
  );
      }
