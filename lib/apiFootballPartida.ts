import { supabase } from './supabase';
import { Partida, Gol, Cartao, Substituicao, EscalacaoJogador } from './types';
import {
  afGetFixturesH2H,
  afGetFixtureEvents,
  afGetFixtureLineups,
  AFLineup,
  getOrcamentoRestante,
} from './apiFootball';

// ── Busca (H2H) e vínculo ───────────────────────────────────────────────────
export interface CandidatoFixture {
  fixture_id: number;
  data: string;
  rodada_api: string;
  placar_casa: number | null;
  placar_visitante: number | null;
  status: string;
}

// 1 requisição: lista as partidas entre os dois times (pelos IDs da
// API-Football) numa temporada, para o admin escolher qual corresponde
// à partida local.
export async function buscarFixturesH2H(
  timeCasaApiId: number,
  timeVisitanteApiId: number,
  season?: number,
): Promise<CandidatoFixture[]> {
  const { restantes } = await getOrcamentoRestante();
  if (restantes < 1) throw new Error('Cota diária insuficiente para essa busca.');

  const fixtures = await afGetFixturesH2H(timeCasaApiId, timeVisitanteApiId, season);
  return fixtures.map(f => ({
    fixture_id: f.fixture.id,
    data: f.fixture.date,
    rodada_api: f.league.round,
    placar_casa: f.goals.home,
    placar_visitante: f.goals.away,
    status: f.fixture.status.short,
  }));
}

export async function vincularPartida(partidaId: string, fixtureId: number): Promise<void> {
  const { error } = await supabase.from('partidas').update({ api_football_id: fixtureId }).eq('id', partidaId);
  if (error) throw error;
}

export async function desvincularPartida(partidaId: string): Promise<void> {
  const { error } = await supabase.from('partidas').update({ api_football_id: null }).eq('id', partidaId);
  if (error) throw error;
}

// ── Importação de eventos + escalação (2 requisições) ──────────────────────
// Não grava nada sozinha: devolve um preview para o admin revisar antes de
// confirmar. Jogadores sem api_football_id cadastrado localmente entram
// como aviso e ficam de fora do preview (cadastre-os e rode de novo).

export interface PreviewImportacao {
  gols: Gol[];
  cartoes: Cartao[];
  substituicoes: Substituicao[];
  escalacao_casa: EscalacaoJogador[];
  escalacao_visitante: EscalacaoJogador[];
  avisos: string[];
}

const TIPO_GOL_MAP: Record<string, string> = {
  'Normal Goal': 'normal',
  'Own Goal': 'contra',
  'Penalty': 'penalti',
  'Missed Penalty': 'penalti_perdido',
};

function uidLocal() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function preVisualizarImportacao(partida: Partida): Promise<PreviewImportacao> {
  if (!partida.api_football_id) {
    throw new Error('Esta partida ainda não está vinculada a um fixture da API-Football.');
  }

  const { restantes } = await getOrcamentoRestante();
  if (restantes < 2) throw new Error('Cota insuficiente: importar eventos custa 2 requisições (events + lineups).');

  const [events, lineups] = await Promise.all([
    afGetFixtureEvents(partida.api_football_id),
    afGetFixtureLineups(partida.api_football_id),
  ]);

  const avisos: string[] = [];

  // Mapa api_football_id (jogador) → id local, considerando os dois times
  const { data: jogadoresLocais } = await supabase
    .from('jogadores')
    .select('*')
    .in('time_atual', [partida.time_casa_id, partida.time_visitante_id]);
  const mapaJogadores = new Map<number, string>();
  for (const j of jogadoresLocais ?? []) {
    if (j.api_football_id) mapaJogadores.set(j.api_football_id, j.id);
  }

  const { data: timesLocais } = await supabase
    .from('times')
    .select('*')
    .in('id', [partida.time_casa_id, partida.time_visitante_id]);
  const timeCasaLocal = (timesLocais ?? []).find(t => t.id === partida.time_casa_id);
  const timeVisLocal = (timesLocais ?? []).find(t => t.id === partida.time_visitante_id);

  const ladoDoTimeApi = (teamApiId: number): 'casa' | 'visitante' | null => {
    if (timeCasaLocal?.api_football_id === teamApiId) return 'casa';
    if (timeVisLocal?.api_football_id === teamApiId) return 'visitante';
    return null;
  };

  // ── Escalação ────────────────────────────────────────────────────────────
  const montarEscalacao = (lineup: AFLineup | undefined): EscalacaoJogador[] => {
    if (!lineup) return [];
    const esc: EscalacaoJogador[] = [];
    for (const p of lineup.startXI) {
      const localId = mapaJogadores.get(p.player.id);
      if (!localId) { avisos.push(`Titular sem cadastro local: ${p.player.name} (API #${p.player.id})`); continue; }
      esc.push({ jogador_id: localId, numero: p.player.number, posicao: p.player.pos ?? 'MEI', titular: true });
    }
    for (const p of lineup.substitutes) {
      const localId = mapaJogadores.get(p.player.id);
      if (!localId) { avisos.push(`Reserva sem cadastro local: ${p.player.name} (API #${p.player.id})`); continue; }
      esc.push({ jogador_id: localId, numero: p.player.number, posicao: p.player.pos ?? 'MEI', titular: false });
    }
    return esc;
  };

  const lineupCasa = lineups.find(l => ladoDoTimeApi(l.team.id) === 'casa');
  const lineupVis = lineups.find(l => ladoDoTimeApi(l.team.id) === 'visitante');
  const escalacao_casa = montarEscalacao(lineupCasa);
  const escalacao_visitante = montarEscalacao(lineupVis);

  // ── Gols / Cartões / Substituições ──────────────────────────────────────
  const gols: Gol[] = [];
  const cartoes: Cartao[] = [];
  const substituicoes: Substituicao[] = [];

  for (const ev of events) {
    const lado = ladoDoTimeApi(ev.team.id);
    if (!lado) { avisos.push(`Evento de time não reconhecido (API #${ev.team.id}), ignorado.`); continue; }
    const timeId = lado === 'casa' ? partida.time_casa_id : partida.time_visitante_id;

    if (ev.type === 'Goal') {
      const jogadorLocal = ev.player.id ? mapaJogadores.get(ev.player.id) : undefined;
      if (!jogadorLocal) { avisos.push(`Gol de jogador sem cadastro local: ${ev.player.name ?? '?'} (${ev.detail})`); continue; }
      const assistLocal = ev.assist?.id ? mapaJogadores.get(ev.assist.id) ?? null : null;
      gols.push({
        id: `g${uidLocal()}`,
        minuto: ev.time.elapsed,
        acrescimo: ev.time.extra ?? 0,
        time_id: timeId,
        jogador_id: jogadorLocal,
        assistencia_id: assistLocal,
        tipo: (TIPO_GOL_MAP[ev.detail] ?? 'normal') as Gol['tipo'],
        goleiro_id: '', // a API não informa o goleiro adversário — preencha na aba Gols
        descricao: ev.comments ?? '',
      });
    } else if (ev.type === 'Card') {
      const jogadorLocal = ev.player.id ? mapaJogadores.get(ev.player.id) : undefined;
      if (!jogadorLocal) { avisos.push(`Cartão de jogador sem cadastro local: ${ev.player.name ?? '?'}`); continue; }
      cartoes.push({
        id: `c${uidLocal()}`,
        minuto: ev.time.elapsed,
        acrescimo: ev.time.extra ?? 0,
        tipo: ev.detail === 'Red Card' ? 'vermelho' : 'amarelo',
        jogador_id: jogadorLocal,
        time_id: timeId,
        motivo: ev.comments ?? '',
      });
    } else if (ev.type === 'subst') {
      // Convenção da API-Football: "player" = quem ENTROU, "assist" = quem
      // SAIU. Confira o resultado antes de salvar — se estiver invertido no
      // seu caso, ajuste manualmente depois na aba Substituições.
      const entraLocal = ev.player.id ? mapaJogadores.get(ev.player.id) : undefined;
      const saiLocal = ev.assist?.id ? mapaJogadores.get(ev.assist.id) : undefined;
      if (!entraLocal || !saiLocal) {
        avisos.push(`Substituição sem cadastro local completo: ${ev.assist?.name ?? '?'} → ${ev.player.name ?? '?'}`);
        continue;
      }
      substituicoes.push({
        id: `s${uidLocal()}`,
        minuto: ev.time.elapsed,
        time_id: timeId,
        sai_id: saiLocal,
        entra_id: entraLocal,
      });
    }
  }

  return { gols, cartoes, substituicoes, escalacao_casa, escalacao_visitante, avisos };
}

// Persiste o preview revisado pelo admin, mesclando com os demais campos já
// existentes da partida (estádio, árbitros, técnicos etc. não vêm da API).
export async function confirmarImportacao(partida: Partida, preview: PreviewImportacao): Promise<Partida> {
  const golsValidos = preview.gols.filter(
    g => (g.tipo as string) !== 'penalti_perdido' && (g.tipo as string) !== 'penalti_defendido'
  );
  const placar_casa = golsValidos.filter(g => g.time_id === partida.time_casa_id).length;
  const placar_visitante = golsValidos.filter(g => g.time_id === partida.time_visitante_id).length;

  const atualizada: Partida = {
    ...partida,
    gols: preview.gols,
    cartoes: preview.cartoes,
    substituicoes: preview.substituicoes,
    escalacao_casa: preview.escalacao_casa,
    escalacao_visitante: preview.escalacao_visitante,
    placar_casa,
    placar_visitante,
  };

  const { data, error } = await supabase.from('partidas').upsert(atualizada).select().single();
  if (error) throw error;
  return data as Partida;
      }
