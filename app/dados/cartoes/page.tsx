import { getJogadores, getPartidas, getTimes, getTecnicos, somaStatsOptaPorJogador, calcularVinculosJogadores } from '@/lib/data';
import {
  CartoesClient,
  type TipoCartaoResumo,
  type CartaoDetalhe,
  type DescricaoCartao,
  type PendenteItem,
  type SuspensoItem,
  type RankingCartaoItem,
  type FaltaDesarmeItem,
} from './CartoesClient';
import { Partida, Time } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TIPO_LABEL: Record<string, string> = {
  amarelo_tecnico: 'Amarelos (Técnicos)',
  vermelho_tecnico: 'Vermelhos (Técnicos)',
};
// Amarelo e vermelho de jogador agora são detalhados por descrição (ver abaixo);
// aqui ficam apenas os tipos exibidos como cards simples
const TIPOS_ORDEM = ['amarelo_tecnico', 'vermelho_tecnico'];

interface EventoCartao {
  partidaId: string;
  rodada: number;
  data: string;
  minuto: number;
}

function buildDetalheCartao(c: Partida['cartoes'][number], p: Partida, nome: string, times: Time[]): CartaoDetalhe {
  const timeCasa = times.find(t => t.id === p.time_casa_id);
  const timeVis = times.find(t => t.id === p.time_visitante_id);
  const meuTime = times.find(t => t.id === c.time_id);
  const advId = c.time_id === p.time_casa_id ? p.time_visitante_id : p.time_casa_id;
  const advTime = times.find(t => t.id === advId);
  return {
    nome,
    timeSigla: meuTime?.sigla ?? c.time_id,
    adversarioSigla: advTime?.sigla ?? advId,
    rodada: p.rodada,
    data: p.data,
    placarCasa: p.placar_casa,
    placarVisitante: p.placar_visitante,
    mandanteSigla: timeCasa?.sigla ?? p.time_casa_id,
    visitanteSigla: timeVis?.sigla ?? p.time_visitante_id,
    minuto: c.minuto,
    acrescimo: (c as { acrescimo?: number }).acrescimo ?? 0,
    motivo: c.motivo || '',
  };
}

function ordenarDetalhe(a: CartaoDetalhe, b: CartaoDetalhe): number {
  return a.rodada - b.rodada || a.data.localeCompare(b.data);
}

export default async function CartoesPage() {
  const [jogadores, partidas, times, tecnicos] = await Promise.all([
    getJogadores(), getPartidas(), getTimes(), getTecnicos(),
  ]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const jogadorMap = new Map(jogadores.map(j => [j.id, j]));
  const tecnicoMap = new Map(tecnicos.map(tc => [tc.id, tc]));

  // Estatísticas Opta (FC/FS/Tk) e vínculos com cartões por "Falta
  // Técnica"/"Falta Grave" — usados na seção "Faltas e Desarmes", migrada
  // de Dados/Analítico.
  const statsOptaPorJogador = somaStatsOptaPorJogador(partidas);
  const vinculosPorJogador = calcularVinculosJogadores(partidas);

  // 0. Resumo por tipo de cartão (técnicos) + descrição (amarelo/vermelho de jogador)
  const tipoContagem: Record<string, number> = {};
  const tipoDetalhes: Record<string, CartaoDetalhe[]> = {};
  const descAmareloMap: Record<string, number> = {};
  const descAmareloDetalhes: Record<string, CartaoDetalhe[]> = {};
  const descVermelhoMap: Record<string, number> = {};
  const descVermelhoDetalhes: Record<string, CartaoDetalhe[]> = {};

  // Histórico de cartões amarelos/vermelhos por jogador e por técnico (para pendurados/suspensos e ranking)
  const jogadorCartoes: Record<string, { amarelos: EventoCartao[]; vermelhos: EventoCartao[] }> = {};
  const tecnicoCartoes: Record<string, { amarelos: EventoCartao[]; vermelhos: EventoCartao[] }> = {};

  for (const p of encerradas) {
    for (const c of p.cartoes) {
      const tipoStr = c.tipo as string;
      const isTecnico = tipoStr === 'amarelo_tecnico' || tipoStr === 'vermelho_tecnico';
      const tecnicoId = (c as { tecnico_id?: string }).tecnico_id;
      const nome = isTecnico
        ? (tecnicoId ? tecnicoMap.get(tecnicoId)?.nome ?? tecnicoId : '—')
        : (jogadorMap.get(c.jogador_id)?.nome ?? c.jogador_id);

      const detalhe = buildDetalheCartao(c, p, nome, times);
      tipoContagem[tipoStr] = (tipoContagem[tipoStr] ?? 0) + 1;

      if (tipoStr === 'amarelo' || tipoStr === 'vermelho') {
        const desc = c.motivo?.trim() || 'Sem descrição';
        const mapa = tipoStr === 'amarelo' ? descAmareloMap : descVermelhoMap;
        const detalhesMap = tipoStr === 'amarelo' ? descAmareloDetalhes : descVermelhoDetalhes;
        mapa[desc] = (mapa[desc] ?? 0) + 1;
        if (!detalhesMap[desc]) detalhesMap[desc] = [];
        detalhesMap[desc].push(detalhe);
      } else {
        if (!tipoDetalhes[tipoStr]) tipoDetalhes[tipoStr] = [];
        tipoDetalhes[tipoStr].push(detalhe);
      }

      const evento: EventoCartao = { partidaId: p.id, rodada: p.rodada, data: p.data, minuto: c.minuto };

      if (tipoStr === 'amarelo') {
        if (!jogadorCartoes[c.jogador_id]) jogadorCartoes[c.jogador_id] = { amarelos: [], vermelhos: [] };
        jogadorCartoes[c.jogador_id].amarelos.push(evento);
      } else if (tipoStr === 'vermelho') {
        if (!jogadorCartoes[c.jogador_id]) jogadorCartoes[c.jogador_id] = { amarelos: [], vermelhos: [] };
        jogadorCartoes[c.jogador_id].vermelhos.push(evento);
      } else if (tipoStr === 'amarelo_tecnico' && tecnicoId) {
        if (!tecnicoCartoes[tecnicoId]) tecnicoCartoes[tecnicoId] = { amarelos: [], vermelhos: [] };
        tecnicoCartoes[tecnicoId].amarelos.push(evento);
      } else if (tipoStr === 'vermelho_tecnico' && tecnicoId) {
        if (!tecnicoCartoes[tecnicoId]) tecnicoCartoes[tecnicoId] = { amarelos: [], vermelhos: [] };
        tecnicoCartoes[tecnicoId].vermelhos.push(evento);
      }
    }
  }

  // Um cartão vermelho já suspende automaticamente o jogador/técnico na
  // próxima partida — se ele recebeu amarelo E vermelho na MESMA partida,
  // esse amarelo não deve contar para a contagem cumulativa usada em
  // pendurados/suspensos (senão ele avançaria indevidamente o ciclo de 3
  // em 3 mesmo já estando suspenso pelo vermelho).
  const removerAmarelosDaPartidaDoVermelho = (mapa: Record<string, { amarelos: EventoCartao[]; vermelhos: EventoCartao[] }>) => {
    for (const dados of Object.values(mapa)) {
      const partidasComVermelho = new Set(dados.vermelhos.map(v => v.partidaId));
      if (partidasComVermelho.size === 0) continue;
      dados.amarelos = dados.amarelos.filter(a => !partidasComVermelho.has(a.partidaId));
    }
  };
  removerAmarelosDaPartidaDoVermelho(jogadorCartoes);
  removerAmarelosDaPartidaDoVermelho(tecnicoCartoes);

  const tiposResumo: TipoCartaoResumo[] = TIPOS_ORDEM.map(tipo => ({
    tipo,
    label: TIPO_LABEL[tipo],
    quantidade: tipoContagem[tipo] ?? 0,
    jogos: (tipoDetalhes[tipo] ?? []).sort(ordenarDetalhe),
  }));

  const descricoesAmarelo: DescricaoCartao[] = Object.entries(descAmareloMap)
    .map(([descricao, quantidade]) => ({
      descricao, quantidade, jogos: (descAmareloDetalhes[descricao] ?? []).sort(ordenarDetalhe),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao));

  const descricoesVermelho: DescricaoCartao[] = Object.entries(descVermelhoMap)
    .map(([descricao, quantidade]) => ({
      descricao, quantidade, jogos: (descVermelhoDetalhes[descricao] ?? []).sort(ordenarDetalhe),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao));

  // 1. Última partida disputada por cada time (por data, com rodada como desempate)
  const ultimaPartidaPorTime: Record<string, Partida> = {};
  for (const t of times) {
    const jogosDoTime = encerradas.filter(p => p.time_casa_id === t.id || p.time_visitante_id === t.id);
    if (jogosDoTime.length === 0) continue;
    const ultima = [...jogosDoTime].sort((a, b) => a.data.localeCompare(b.data) || a.rodada - b.rodada).pop()!;
    ultimaPartidaPorTime[t.id] = ultima;
  }

  // 2. Pendurados e Suspensos
  const pendurados: PendenteItem[] = [];
  const suspensos: SuspensoItem[] = [];

  const avaliarSuspensao = (
    nome: string, tipo: 'Jogador' | 'Técnico', timeSigla: string,
    amarelos: EventoCartao[], vermelhos: EventoCartao[], ultimaPartida: Partida | undefined,
  ) => {
    const totalAmarelos = amarelos.length;

    // Pendurado: 2, 5, 8, 11, 14... (a exatamente 1 cartão de completar um múltiplo de 3)
    if (totalAmarelos % 3 === 2) {
      pendurados.push({ nome, tipo, timeSigla, cartoes: totalAmarelos });
    }

    if (!ultimaPartida) return;

    // Suspenso por vermelho na última rodada do time
    if (vermelhos.some(v => v.partidaId === ultimaPartida.id)) {
      suspensos.push({ nome, tipo, timeSigla, motivo: 'Cartão vermelho na última rodada', rodada: ultimaPartida.rodada });
      return;
    }

    // Suspenso por múltiplo de 3 amarelos, tendo levado o último deles na última rodada do time
    if (totalAmarelos > 0 && totalAmarelos % 3 === 0) {
      const ordenados = [...amarelos].sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));
      const ultimoAmarelo = ordenados[ordenados.length - 1];
      if (ultimoAmarelo.partidaId === ultimaPartida.id) {
        suspensos.push({ nome, tipo, timeSigla, motivo: `${totalAmarelos}º cartão amarelo na última rodada`, rodada: ultimaPartida.rodada });
      }
    }
  };

  for (const t of times) {
    const ultimaPartida = ultimaPartidaPorTime[t.id];

    const jogadoresDoTime = jogadores.filter(j => j.time_atual === t.id);
    for (const j of jogadoresDoTime) {
      const eventos = jogadorCartoes[j.id];
      avaliarSuspensao(j.nome, 'Jogador', t.sigla, eventos?.amarelos ?? [], eventos?.vermelhos ?? [], ultimaPartida);
    }

    const tecnicoDoTime = tecnicos.find(tc => tc.time_atual === t.id && tc.ativo);
    if (tecnicoDoTime) {
      const eventos = tecnicoCartoes[tecnicoDoTime.id];
      avaliarSuspensao(tecnicoDoTime.nome, 'Técnico', t.sigla, eventos?.amarelos ?? [], eventos?.vermelhos ?? [], ultimaPartida);
    }
  }

  pendurados.sort((a, b) => b.cartoes - a.cartoes || a.nome.localeCompare(b.nome));
  suspensos.sort((a, b) => b.rodada - a.rodada || a.nome.localeCompare(b.nome));

  // 3. Ranking de cartões (jogadores)
  const rankingAmarelos: RankingCartaoItem[] = jogadores
    .map(j => {
      const time = times.find(t => t.id === j.time_atual);
      return {
        jogador_id: j.id, nome: j.nome,
        timeSigla: time?.sigla ?? '—', timeId: time?.id ?? '',
        quantidade: jogadorCartoes[j.id]?.amarelos.length ?? 0,
      };
    })
    .filter(x => x.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);

  const rankingVermelhos: RankingCartaoItem[] = jogadores
    .map(j => {
      const time = times.find(t => t.id === j.time_atual);
      return {
        jogador_id: j.id, nome: j.nome,
        timeSigla: time?.sigla ?? '—', timeId: time?.id ?? '',
        quantidade: jogadorCartoes[j.id]?.vermelhos.length ?? 0,
      };
    })
    .filter(x => x.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);

  // 4. Faltas e Desarmes (FC/FS/Tk) — migrado de Dados/Analítico.
  // Só entram jogadores com FC, FS ou Tk lançados em ao menos uma partida.
  const faltasDesarmes: FaltaDesarmeItem[] = jogadores
    .map(j => {
      const o = statsOptaPorJogador[j.id];
      if (!o || (o.FC <= 0 && o.FS <= 0 && o.Tk <= 0)) return null;
      const time = times.find(t => t.id === j.time_atual);
      const v = vinculosPorJogador[j.id];
      const item: FaltaDesarmeItem = {
        jogador_id: j.id,
        nome: j.nome,
        timeId: j.time_atual,
        timeSigla: time?.sigla ?? '—',
        FC: o.FC, FS: o.FS, Tk: o.Tk,
        cartoesFaltaTecnicaGraveAmarelo: v?.cartoes_falta_tecnica_grave_amarelo ?? 0,
        cartoesFaltaTecnicaGraveVermelho: v?.cartoes_falta_tecnica_grave_vermelho ?? 0,
      };
      return item;
    })
    .filter((x): x is FaltaDesarmeItem => x !== null)
    .sort((a, b) => b.Tk - a.Tk || b.FC - a.FC);

  return (
    <CartoesClient
      tiposResumo={tiposResumo}
      descricoesAmarelo={descricoesAmarelo}
      descricoesVermelho={descricoesVermelho}
      pendurados={pendurados}
      suspensos={suspensos}
      rankingAmarelos={rankingAmarelos}
      rankingVermelhos={rankingVermelhos}
      faltasDesarmes={faltasDesarmes}
      times={times}
    />
  );
}
