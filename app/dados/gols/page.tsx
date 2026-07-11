import { getJogadores, getPartidas, getTimes } from '@/lib/data';
import { GolsClient, type CategoriaGols, type SegmentoTempo, type GolPorNumero } from './GolsClient';

export const dynamic = 'force-dynamic';

const POSICAO_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

// Sub-posições "informativas" — quando ausentes ou iguais à posição principal,
// o jogador cai na categoria genérica daquela posição (ex: "Lateral" sem sub-posição).
const SUBPOS_LABEL: Record<string, string> = {
  LD: 'Lateral Direito', LE: 'Lateral Esquerdo',
  MC: 'Meia Central', MO: 'Meia Ofensivo',
  CA: 'Centroavante', PD: 'Ponta Direita', PE: 'Ponta Esquerda',
};

function subChaveValida(posicao: string, subPosicao?: string): string {
  if (subPosicao && subPosicao !== posicao && SUBPOS_LABEL[subPosicao]) return subPosicao;
  return '';
}

function categoriaLabel(posicao: string, subChave: string): string {
  const base = POSICAO_LABEL[posicao] ?? posicao;
  if (!subChave) return base;
  return `${base} — ${SUBPOS_LABEL[subChave] ?? subChave}`;
}

// Divide o minuto (+ acréscimo) do gol em uma das 8 partes do tempo de jogo
function bucketMinuto(minuto: number, acrescimo: number): string {
  if (minuto <= 15) return '0-15';
  if (minuto <= 30) return '16-30';
  if (minuto <= 45 && acrescimo === 0) return '31-45';
  if (minuto <= 45) return '45+';
  if (minuto <= 60) return '46-60';
  if (minuto <= 75) return '61-75';
  if (minuto <= 90 && acrescimo === 0) return '76-90';
  return '90+';
}

const SEGMENTOS_ORDEM = ['0-15', '16-30', '31-45', '45+', '46-60', '61-75', '76-90', '90+'];

export default async function GolsPage() {
  const [jogadores, partidas, times] = await Promise.all([getJogadores(), getPartidas(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]));

  // 0. Resumo por tipo de gol / pênaltis não convertidos
  let golsNormais = 0, golsFalta = 0, golsContra = 0, golsPenalti = 0;
  let penaltisPerdidos = 0, penaltisDefendidos = 0;

  // 1. Ranking por posição/sub-posição
  const catMap: Record<string, { posicao: string; gols: number; jogadoresMap: Record<string, number> }> = {};
  // 2. Gols e assistências por parte do tempo
  const segMap: Record<string, { gols: number; assistencias: number }> = {};
  SEGMENTOS_ORDEM.forEach(s => { segMap[s] = { gols: 0, assistencias: 0 }; });
  // 3. Gols por número da camisa (usado NA PARTIDA, não o cadastro do jogador)
  const numeroMap: Record<number, number> = {};

  for (const p of encerradas) {
    const escTodas = [...p.escalacao_casa, ...p.escalacao_visitante];

    for (const g of p.gols) {
      const tipoStr = g.tipo as string;

      // ── Resumo por tipo (inclui pênaltis não convertidos) ─────────────────
      if (tipoStr === 'penalti_perdido') { penaltisPerdidos++; continue; }
      if (tipoStr === 'penalti_defendido') { penaltisDefendidos++; continue; }
      if (tipoStr === 'normal') golsNormais++;
      else if (tipoStr === 'falta') golsFalta++;
      else if (tipoStr === 'contra') golsContra++;
      else if (tipoStr === 'penalti') golsPenalti++;

      // ── Parte do tempo (conta todo gol válido, incluindo contra) ──────────
      const seg = bucketMinuto(g.minuto, g.acrescimo ?? 0);
      if (segMap[seg]) segMap[seg].gols++;
      if (g.assistencia_id && tipoStr !== 'contra' && segMap[seg]) segMap[seg].assistencias++;

      if (tipoStr === 'contra') continue; // gol contra não conta para o autor, posição ou número

      // ── Posição / sub-posição (cadastro atual do jogador) ─────────────────
      const jogador = jogadorMap.get(g.jogador_id);
      if (jogador) {
        const subChave = subChaveValida(jogador.posicao, jogador.sub_posicao);
        const key = `${jogador.posicao}::${subChave}`;
        if (!catMap[key]) catMap[key] = { posicao: jogador.posicao, gols: 0, jogadoresMap: {} };
        catMap[key].gols++;
        catMap[key].jogadoresMap[jogador.id] = (catMap[key].jogadoresMap[jogador.id] ?? 0) + 1;
      }

      // ── Número da camisa usado NAQUELA partida ────────────────────────────
      const esc = escTodas.find(e => e.jogador_id === g.jogador_id);
      if (esc && esc.numero) {
        numeroMap[esc.numero] = (numeroMap[esc.numero] ?? 0) + 1;
      }
    }
  }

  const categorias: CategoriaGols[] = Object.entries(catMap)
    .map(([key, v]) => {
      const subChave = key.split('::')[1] ?? '';
      const jogadoresLista = Object.entries(v.jogadoresMap)
        .map(([jid, gols]) => {
          const j = jogadorMap.get(jid);
          const time = times.find(t => t.id === j?.time_atual);
          return { jogador_id: jid, nome: j?.nome ?? jid, timeSigla: time?.sigla ?? '—', timeId: time?.id ?? '', gols };
        })
        .sort((a, b) => b.gols - a.gols);
      return {
        key,
        label: categoriaLabel(v.posicao, subChave),
        posicao: v.posicao,
        gols: v.gols,
        jogadores: jogadoresLista,
      };
    })
    .sort((a, b) => b.gols - a.gols);

  const segmentos: SegmentoTempo[] = SEGMENTOS_ORDEM.map(s => ({
    label: s, gols: segMap[s].gols, assistencias: segMap[s].assistencias,
  }));

  const golsPorNumero: GolPorNumero[] = Object.entries(numeroMap)
    .map(([numero, gols]) => ({ numero: +numero, gols }))
    .sort((a, b) => b.gols - a.gols || a.numero - b.numero);

  const totalGols = categorias.reduce((s, c) => s + c.gols, 0);

  return (
    <GolsClient
      categorias={categorias}
      segmentos={segmentos}
      golsPorNumero={golsPorNumero}
      totalGols={totalGols}
      golsNormais={golsNormais}
      golsFalta={golsFalta}
      golsContra={golsContra}
      golsPenalti={golsPenalti}
      penaltisPerdidos={penaltisPerdidos}
      penaltisDefendidos={penaltisDefendidos}
    />
  );
}
