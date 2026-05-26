import { getPartidas, getTimes } from '@/lib/data';
import { getConfig } from '@/lib/config';
import { TabelaClient } from './TabelaClient';

export const dynamic = 'force-dynamic';

export default async function TabelaPage() {
  const [todasPartidas, times, config] = await Promise.all([
    getPartidas(), getTimes(), getConfig(),
  ]);

  const encerradas = todasPartidas.filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  // Calcular tabela ao vivo
  const map: Record<string, { time_id: string; pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number; gols_pro: number; gols_contra: number }> = {};
  times.forEach(t => { map[t.id] = { time_id: t.id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 }; });
  for (const p of encerradas) {
    const c = map[p.time_casa_id]; const v = map[p.time_visitante_id];
    if (!c || !v) continue;
    c.jogos++; v.jogos++; c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
    v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
    if (p.placar_casa > p.placar_visitante) { c.vitorias++; c.pontos += 3; v.derrotas++; }
    else if (p.placar_casa < p.placar_visitante) { v.vitorias++; v.pontos += 3; c.derrotas++; }
    else { c.empates++; c.pontos++; v.empates++; v.pontos++; }
  }
  const tabela = Object.values(map)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => ({ ...t, posicao: i + 1, saldo: t.gols_pro - t.gols_contra }));

  // Calcular posição por rodada para o gráfico
  const rodadas = [...new Set(encerradas.map(p => p.rodada))].sort((a, b) => a - b);
  const posicoesPorRodada: Record<string, number[]> = {};
  times.forEach(t => { posicoesPorRodada[t.id] = []; });

  const accumulated: Record<string, { pontos: number; gols_pro: number; gols_contra: number; jogos: number }> = {};
  times.forEach(t => { accumulated[t.id] = { pontos: 0, gols_pro: 0, gols_contra: 0, jogos: 0 }; });

  for (const rod of rodadas) {
    const ps = encerradas.filter(p => p.rodada === rod);
    for (const p of ps) {
      const c = accumulated[p.time_casa_id]; const v = accumulated[p.time_visitante_id];
      if (!c || !v) continue;
      c.jogos++; v.jogos++; c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
      v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
      if (p.placar_casa > p.placar_visitante) { c.pontos += 3; }
      else if (p.placar_casa < p.placar_visitante) { v.pontos += 3; }
      else { c.pontos++; v.pontos++; }
    }
    // Rank after this round
    const rankAtual = Object.entries(accumulated)
      .filter(([, v]) => v.jogos > 0)
      .sort(([, a], [, b]) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra))
      .map(([id], i) => ({ id, pos: i + 1 }));
    for (const { id, pos } of rankAtual) {
      posicoesPorRodada[id].push(pos);
    }
  }

  // Forma recente
  const formaTime: Record<string, string[]> = {};
  times.forEach(t => { formaTime[t.id] = []; });
  for (const p of [...encerradas].reverse()) {
    const add = (id: string, r: string) => { if (!formaTime[id]) formaTime[id] = []; if (formaTime[id].length < 5) formaTime[id].push(r); };
    if (p.placar_casa > p.placar_visitante) { add(p.time_casa_id, 'V'); add(p.time_visitante_id, 'D'); }
    else if (p.placar_casa < p.placar_visitante) { add(p.time_casa_id, 'D'); add(p.time_visitante_id, 'V'); }
    else { add(p.time_casa_id, 'E'); add(p.time_visitante_id, 'E'); }
  }

  // Ajuste: Mostrar Recente somente para o time que jogou na última data registrada
  const datasUnicas = [...new Set(encerradas.map(q => q.data))].sort();
  const ultimaData = datasUnicas[datasUnicas.length - 1];
  
  const timesRecentes = new Set(
    encerradas.filter(p => p.data === ultimaData)
      .flatMap(p => [p.time_casa_id, p.time_visitante_id])
  );

  return (
    <TabelaClient
      tabela={tabela}
      times={times}
      config={config}
      rodadas={rodadas}
      posicoesPorRodada={posicoesPorRodada}
      formaTime={formaTime}
      timesRecentes={[...timesRecentes]}
    />
  );
}
