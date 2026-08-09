import { supabase } from './supabase';
import { Time, Jogador } from './types';
import {
  afGetTeamsByLeague,
  afGetSquad,
  AFTeamEntry,
  AFSquadPlayer,
  getOrcamentoRestante,
} from './apiFootball';

// Liga Brasileirão Série A na API-Football
export const LIGA_BRASILEIRAO = 71;

function normalizar(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Aliases manuais para nomes que divergem bastante entre as duas bases
// (chave = id local em minúsculo). Cubra aqui qualquer time que não
// bater automaticamente na primeira sincronização.
const ALIASES_TIME: Record<string, string[]> = {
  atl: ['atletico mineiro', 'atletico mg', 'clube atletico mineiro'],
  cam: ['atletico mineiro', 'atletico mg', 'clube atletico mineiro'],
  rbb: ['red bull bragantino', 'bragantino'],
  sao: ['sao paulo'],
  cap: ['athletico paranaense', 'atletico paranaense', 'athletico pr'],
  atg: ['athletico paranaense', 'atletico paranaense', 'athletico pr'],
  cot: ['coritiba'],
  cfc: ['coritiba'],
};

function candidatosNome(time: Time): string[] {
  const base = [normalizar(time.nome), normalizar(time.sigla)];
  const alias = ALIASES_TIME[time.id.toLowerCase()] ?? [];
  return [...base, ...alias.map(normalizar)];
}

function encontrarTimeCorrespondente(time: Time, afTimes: AFTeamEntry[]): AFTeamEntry | null {
  const candidatos = candidatosNome(time);

  // 1) igualdade exata (nome ou código normalizado)
  for (const af of afTimes) {
    const nomeAF = normalizar(af.team.name);
    const codeAF = af.team.code ? normalizar(af.team.code) : '';
    if (candidatos.includes(nomeAF) || (codeAF && candidatos.includes(codeAF))) return af;
  }
  // 2) fallback: um nome contém o outro
  for (const af of afTimes) {
    const nomeAF = normalizar(af.team.name);
    if (candidatos.some(c => c.length > 3 && (nomeAF.includes(c) || c.includes(nomeAF)))) return af;
  }
  return null;
}

const POSICAO_MAP: Record<string, string> = {
  Goalkeeper: 'GOL',
  Defender: 'ZAG',
  Midfielder: 'MEI',
  Attacker: 'ATA',
};

function encontrarJogadorCorrespondente(afPlayer: AFSquadPlayer, jogadoresDoTime: Jogador[]): Jogador | null {
  const alvo = normalizar(afPlayer.name);

  let match = jogadoresDoTime.find(j => normalizar(j.nome) === alvo);
  if (match) return match;

  match = jogadoresDoTime.find(j => j.alias_opta && normalizar(j.alias_opta) === alvo);
  if (match) return match;

  // Nomes de exibição costumam ser abreviados (ex.: "Neymar" vs "Neymar Jr.")
  match = jogadoresDoTime.find(j => {
    const nomeLocal = normalizar(j.nome);
    return nomeLocal.includes(alvo) || alvo.includes(nomeLocal);
  });
  return match ?? null;
}

// ── Etapa 1: Times + Estádios (1 requisição no total) ──────────────────────
export interface ResultadoSyncTimes {
  requisicoesUsadas: number;
  timesAtualizados: { id: string; nome: string; api_football_id: number }[];
  timesNaoEncontrados: { id: string; nome: string }[];
  estadiosAtualizados: { id: string; nome: string; api_football_id: number }[];
}

export async function sincronizarTimes(season: number): Promise<ResultadoSyncTimes> {
  const { restantes } = await getOrcamentoRestante();
  if (restantes < 1) throw new Error('Cota diária insuficiente para sincronizar times (precisa de ao menos 1 requisição).');

  const [afTimes, { data: locais, error }] = await Promise.all([
    afGetTeamsByLeague(LIGA_BRASILEIRAO, season),
    supabase.from('times').select('*'),
  ]);
  if (error) throw error;

  const timesAtualizados: ResultadoSyncTimes['timesAtualizados'] = [];
  const timesNaoEncontrados: ResultadoSyncTimes['timesNaoEncontrados'] = [];
  const estadiosAtualizados: ResultadoSyncTimes['estadiosAtualizados'] = [];

  for (const time of locais as Time[]) {
    const af = encontrarTimeCorrespondente(time, afTimes);
    if (!af) {
      timesNaoEncontrados.push({ id: time.id, nome: time.nome });
      continue;
    }

    await supabase.from('times').update({ api_football_id: af.team.id }).eq('id', time.id);
    timesAtualizados.push({ id: time.id, nome: time.nome, api_football_id: af.team.id });

    // Os dados de venue vêm de graça na mesma resposta — aproveitamos para
    // vincular o estádio sem gastar requisições extras.
    if (af.venue?.id && time.estadio_id) {
      await supabase.from('estadios').update({ api_football_id: af.venue.id }).eq('id', time.estadio_id);
      estadiosAtualizados.push({
        id: time.estadio_id,
        nome: af.venue.name ?? time.estadio_id,
        api_football_id: af.venue.id,
      });
    }
  }

  const { usadas } = await getOrcamentoRestante();
  return { requisicoesUsadas: usadas, timesAtualizados, timesNaoEncontrados, estadiosAtualizados };
}

// ── Etapa 2: Jogadores (1 requisição por time já vinculado) ────────────────
export interface ResultadoSyncJogadores {
  requisicoesUsadas: number;
  porTime: {
    time_id: string;
    time_nome: string;
    jogadoresAtualizados: { id: string; nome: string; api_football_id: number }[];
    naoEncontrados: { id_api: number; nome_api: string; posicao_sugerida: string }[];
  }[];
  timesPulados: { id: string; nome: string; motivo: string }[];
}

// Só sincroniza times que já têm api_football_id (rode sincronizarTimes antes).
// `limiteTimes` permite processar em lotes menores para controlar a cota
// manualmente, caso o dia já tenha outras chamadas planejadas.
export async function sincronizarJogadores(limiteTimes?: number): Promise<ResultadoSyncJogadores> {
  const { data: locais, error } = await supabase
    .from('times')
    .select('*')
    .not('api_football_id', 'is', null);
  if (error) throw error;

  const times = (locais as (Time & { api_football_id: number })[]).slice(0, limiteTimes);

  const { restantes } = await getOrcamentoRestante();
  if (restantes < times.length) {
    throw new Error(
      `Cota insuficiente: sincronizar ${times.length} time(s) custaria ${times.length} requisições, restam ${restantes} hoje.`
    );
  }

  const porTime: ResultadoSyncJogadores['porTime'] = [];
  const timesPulados: ResultadoSyncJogadores['timesPulados'] = [];

  for (const time of times) {
    try {
      const squads = await afGetSquad(time.api_football_id);
      const jogadoresAF = squads[0]?.players ?? [];

      const { data: jogadoresLocais } = await supabase.from('jogadores').select('*').eq('time_atual', time.id);

      const jogadoresAtualizados: { id: string; nome: string; api_football_id: number }[] = [];
      const naoEncontrados: { id_api: number; nome_api: string; posicao_sugerida: string }[] = [];

      for (const afJog of jogadoresAF) {
        const match = encontrarJogadorCorrespondente(afJog, (jogadoresLocais ?? []) as Jogador[]);
        if (match) {
          await supabase.from('jogadores').update({ api_football_id: afJog.id }).eq('id', match.id);
          jogadoresAtualizados.push({ id: match.id, nome: match.nome, api_football_id: afJog.id });
        } else {
          naoEncontrados.push({
            id_api: afJog.id,
            nome_api: afJog.name,
            posicao_sugerida: POSICAO_MAP[afJog.position ?? ''] ?? 'MEI',
          });
        }
      }

      porTime.push({ time_id: time.id, time_nome: time.nome, jogadoresAtualizados, naoEncontrados });
    } catch (e) {
      timesPulados.push({ id: time.id, nome: time.nome, motivo: String(e) });
    }
  }

  const { usadas } = await getOrcamentoRestante();
  return { requisicoesUsadas: usadas, porTime, timesPulados };
  }
