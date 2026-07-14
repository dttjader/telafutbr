import { getJogadores, getPartidas, getTimes } from '@/lib/data';
import {
  GolsClient,
  type CategoriaGols,
  type SegmentoTempo,
  type GolPorNumero,
  type DescricaoGol,
  type TipoGolResumo,
  type GolDetalhe,
} from './GolsClient';
import { Partida, Time } from '@/lib/types';

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

const TIPO_LABEL: Record<string, string> = {
  falta: 'Gols de Falta',
  contra: 'Gols Contra',
  penalti: 'Gols de Pênalti',
  penalti_perdido: 'Pênaltis Perdidos',
  penalti_defendido: 'Pênaltis Defendidos',
};
const TIPOS_ORDEM = ['falta', 'contra', 'penalti', 'penalti_perdido', 'penalti_defendido'];

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

// Monta os dados de exibição (jogador + partida) de um gol para as listas/modais
function buildDetalhe(g: Partida['gols'][number], p: Partida, jogadorNome: string, times: Time[]): GolDetalhe {
  const timeCasa = times.find(t => t.id === p.time_casa_id);
  const timeVis  = times.find(t => t.id === p.time_visitante_id);
  const tipoStr = g.tipo as string;
  const isContra = tipoStr === 'contra';
  // Em gol contra, g.time_id é o time BENEFICIADO — o time do próprio jogador é o outro lado
  const meuTimeId = isContra
    ? (g.time_id === p.time_casa_id ? p.time_visitante_id : p.time_casa_id)
    : g.time_id;
  const advTimeId = isContra
    ? g.time_id
    : (g.time_id === p.time_casa_id ? p.time_visitante_id : p.time_casa_id);
  const meuTime = times.find(t => t.id === meuTimeId);
  const advTime = times.find(t => t.id === advTimeId);
  return {
    jogadorNome,
    timeSigla: meuTime?.sigla ?? meuTimeId,
    adversarioSigla: advTime?.sigla ?? advTimeId,
    partidaId: p.id,
    rodada: p.rodada,
    data: p.data,
    placarCasa: p.placar_casa,
    placarVisitante: p.placar_visitante,
    mandanteSigla: timeCasa?.sigla ?? p.time_casa_id,
    visitanteSigla: timeVis?.sigla ?? p.time_visitante_id,
    minuto: g.minuto,
    acrescimo: g.acrescimo ?? 0,
  };
}

export default async function GolsPage() {
  const [jogadores, partidas, times] = await Promise.all([getJogadores(), getPartidas(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]));

  // 0. Resumo por tipo de gol / pênaltis não convertidos
  const descricaoMap: Record<string, number> = {};
  const descricaoDetalhes: Record<string, GolDetalhe[]> = {};
  const tipoContagem: Record<string, number> = {};
  const tipoDetalhes: Record<string, GolDetalhe[]> = {};

  // 1. Ranking por posição/sub-posição
  const catMap: Record<string, { posicao: string; gols: number; jogadoresMap: Record<string, number> }> = {};
  // 2. Gols e assistências por parte do tempo
  const segMap: Record<string, { gols: number; assistencias: number }> = {};
  SEGMENTOS_ORDEM.forEach(s => { segMap[s] = { gols: 0, assistencias: 0 }; });
  // 3. Gols por número da camisa (usado NA PARTIDA, não o cadastro do jogador)
  const numeroMap: Record<number, number> = {};
  const numeroDetalhes: Record<number, GolDetalhe[]> = {};

  for (const p of encerradas) {
    const escTodas = [...p.escalacao_casa, ...p.escalacao_visitante];

    for (const g of p.gols) {
      const tipoStr = g.tipo as string;
      const jogador = jogadorMap.get(g.jogador_id);
      const jogadorNome = jogador?.nome ?? g.jogador_id;
      const detalhe = buildDetalhe(g, p, jogadorNome, times);

      // ── Resumo por tipo (inclui pênaltis não convertidos) ─────────────────
      if (tipoStr === 'penalti_perdido' || tipoStr === 'penalti_defendido') {
        tipoContagem[tipoStr] = (tipoContagem[tipoStr] ?? 0) + 1;
        if (!tipoDetalhes[tipoStr]) tipoDetalhes[tipoStr] = [];
        tipoDetalhes[tipoStr].push(detalhe);
        continue;
      }
      if (tipoStr === 'normal') {
        const desc = g.descricao?.trim() || 'Sem descrição';
        descricaoMap[desc] = (descricaoMap[desc] ?? 0) + 1;
        if (!descricaoDetalhes[desc]) descricaoDetalhes[desc] = [];
        descricaoDetalhes[desc].push(detalhe);
      } else if (tipoStr === 'falta' || tipoStr === 'contra' || tipoStr === 'penalti') {
        tipoContagem[tipoStr] = (tipoContagem[tipoStr] ?? 0) + 1;
        if (!tipoDetalhes[tipoStr]) tipoDetalhes[tipoStr] = [];
        tipoDetalhes[tipoStr].push(detalhe);
      }

      // ── Parte do tempo (conta todo gol válido, incluindo contra) ──────────
      const seg = bucketMinuto(g.minuto, g.acrescimo ?? 0);
      if (segMap[seg]) segMap[seg].gols++;
      if (g.assistencia_id && tipoStr !== 'contra' && segMap[seg]) segMap[seg].assistencias++;

      if (tipoStr === 'contra') continue; // gol contra não conta para o autor, posição ou número

      // ── Posição / sub-posição (cadastro atual do jogador) ─────────────────
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
        if (!numeroDetalhes[esc.numero]) numeroDetalhes[esc.numero] = [];
        numeroDetalhes[esc.numero].push(detalhe);
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
    .map(([numero, gols]) => ({ numero: +numero, gols, jogos: (numeroDetalhes[+numero] ?? []).sort(ordenarDetalhe) }))
    .sort((a, b) => b.gols - a.gols || a.numero - b.numero);

  const descricoesGolsNormais: DescricaoGol[] = Object.entries(descricaoMap)
    .map(([descricao, quantidade]) => ({
      descricao, quantidade, jogos: (descricaoDetalhes[descricao] ?? []).sort(ordenarDetalhe),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao));

  const tiposResumo: TipoGolResumo[] = TIPOS_ORDEM.map(tipo => ({
    tipo,
    label: TIPO_LABEL[tipo],
    quantidade: tipoContagem[tipo] ?? 0,
    jogos: (tipoDetalhes[tipo] ?? []).sort(ordenarDetalhe),
  }));

  const totalGols = categorias.reduce((s, c) => s + c.gols, 0);

  return (
    <GolsClient
      categorias={categorias}
      segmentos={segmentos}
      golsPorNumero={golsPorNumero}
      totalGols={totalGols}
      descricoesGolsNormais={descricoesGolsNormais}
      tiposResumo={tiposResumo}
    />
  );
}

function ordenarDetalhe(a: GolDetalhe, b: GolDetalhe): number {
  return a.rodada - b.rodada || a.data.localeCompare(b.data);
    }
