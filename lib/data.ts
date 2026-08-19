import { supabase } from './supabase';
import { Estadio, Time, Jogador, Partida } from './types';

// IDs reservados que não são times reais
const PSEUDO_TIME_IDS = new Set(['outros']);

// ── Estádios ──────────────────────────────────────────────
export async function getEstadios(): Promise<Estadio[]> {
  const { data, error } = await supabase.from('estadios').select('*').order('nome');
  if (error) throw error;
  return data as Estadio[];
}

export async function getEstadio(id: string): Promise<Estadio | null> {
  const { data, error } = await supabase.from('estadios').select('*').eq('id', id).single();
  if (error) return null;
  return data as Estadio;
}

export async function upsertEstadio(estadio: Estadio): Promise<Estadio> {
  const { data, error } = await supabase.from('estadios').upsert(estadio).select().single();
  if (error) throw error;
  return data as Estadio;
}

export async function deleteEstadio(id: string): Promise<void> {
  const { error } = await supabase.from('estadios').delete().eq('id', id);
  if (error) throw error;
}

// ── Times ─────────────────────────────────────────────────
// Retorna apenas times reais — filtra pseudo-ids como 'outros'
export async function getTimes(): Promise<Time[]> {
  const { data, error } = await supabase.from('times').select('*').order('nome');
  if (error) throw error;
  return (data as Time[]).filter(t => !PSEUDO_TIME_IDS.has(t.id));
}

export async function getTime(id: string): Promise<Time | null> {
  if (PSEUDO_TIME_IDS.has(id)) return null;
  const { data, error } = await supabase.from('times').select('*').eq('id', id).single();
  if (error) return null;
  return data as Time;
}

// ── Jogadores ─────────────────────────────────────────────
export async function getJogadores(): Promise<Jogador[]> {
  const { data, error } = await supabase.from('jogadores').select('*').order('nome');
  if (error) throw error;
  return data as Jogador[];
}

export async function getJogador(id: string): Promise<Jogador | null> {
  const { data, error } = await supabase.from('jogadores').select('*').eq('id', id).single();
  if (error) return null;
  return data as Jogador;
}

export async function upsertJogador(jogador: Jogador): Promise<Jogador> {
  const { data, error } = await supabase.from('jogadores').upsert(jogador).select().single();
  if (error) throw error;
  return data as Jogador;
}

export async function deleteJogador(id: string): Promise<void> {
  const { error } = await supabase.from('jogadores').delete().eq('id', id);
  if (error) throw error;
}

// ── Partidas ──────────────────────────────────────────────
export async function getPartidas(): Promise<Partida[]> {
  const { data, error } = await supabase.from('partidas').select('*').order('rodada').order('data');
  if (error) throw error;
  return data as Partida[];
}

export async function getPartida(id: string): Promise<Partida | null> {
  const { data, error } = await supabase.from('partidas').select('*').eq('id', id).single();
  if (error) return null;
  return data as Partida;
}

export async function upsertPartida(partida: Partida): Promise<Partida> {
  const { data, error } = await supabase.from('partidas').upsert(partida).select().single();
  if (error) throw error;
  return data as Partida;
}

export async function deletePartida(id: string): Promise<void> {
  const { error } = await supabase.from('partidas').delete().eq('id', id);
  if (error) throw error;
}

// ── Tabela ────────────────────────────────────────────────
export async function calcularTabela() {
  const [partidas, times] = await Promise.all([getPartidas(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const map: Record<string, {
    time_id: string; pontos: number; jogos: number; vitorias: number;
    empates: number; derrotas: number; gols_pro: number; gols_contra: number;
  }> = {};

  times.forEach(t => {
    map[t.id] = { time_id: t.id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 };
  });

  for (const p of encerradas) {
    const c = map[p.time_casa_id];
    const v = map[p.time_visitante_id];
    if (!c || !v) continue;
    c.jogos++; v.jogos++;
    c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
    v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
    if (p.placar_casa > p.placar_visitante) { c.vitorias++; c.pontos += 3; v.derrotas++; }
    else if (p.placar_casa < p.placar_visitante) { v.vitorias++; v.pontos += 3; c.derrotas++; }
    else { c.empates++; c.pontos++; v.empates++; v.pontos++; }
  }

  return Object.values(map)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => ({ ...t, posicao: i + 1, saldo: t.gols_pro - t.gols_contra }));
}

// ── Técnicos ──────────────────────────────────────────────
export async function getTecnicos(): Promise<import('./types').Tecnico[]> {
  const { data, error } = await supabase.from('tecnicos').select('*').order('nome');
  if (error) throw error;
  return data as import('./types').Tecnico[];
}

export async function calcularRankingTecnicos() {
  const [partidas, tecnicos, times] = await Promise.all([getPartidas(), getTecnicos(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const map: Record<string, { tecnico_id: string; j: number; v: number; e: number; d: number; gp: number; gc: number }> = {};

  for (const p of encerradas) {
    const processar = (tecnicoId: string | null, isCasa: boolean) => {
      if (!tecnicoId) return;
      if (!map[tecnicoId]) map[tecnicoId] = { tecnico_id: tecnicoId, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
      const r = map[tecnicoId];
      const gf = isCasa ? p.placar_casa : p.placar_visitante;
      const gc = isCasa ? p.placar_visitante : p.placar_casa;
      r.j++; r.gp += gf; r.gc += gc;
      if (gf > gc) r.v++; else if (gf < gc) r.d++; else r.e++;
    };
    processar(p.tecnico_casa_id, true);
    processar(p.tecnico_visitante_id, false);
  }

  return Object.values(map)
    .map(r => ({ ...r, pts: r.v * 3 + r.e, aproveitamento: r.j > 0 ? Math.round((r.v * 3 + r.e) / (r.j * 3) * 100) : 0 }))
    .sort((a, b) => b.aproveitamento - a.aproveitamento || b.v - a.v);
}

// ── Artilharia ────────────────────────────────────────────
export async function calcularArtilharia() {
  const partidas = await getPartidas();
  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const map: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};

  for (const p of encerradas) {
    for (const g of p.gols) {
      if (g.tipo === 'contra') continue;
      if (!map[g.jogador_id]) map[g.jogador_id] = { jogador_id: g.jogador_id, time_id: g.time_id, quantidade: 0 };
      map[g.jogador_id].quantidade++;
    }
  }
  return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
}

// ── Helpers ───────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function zonaClassificacao(pos: number) {
  if (pos <= 5) return 'libertadores';
  if (pos <= 11) return 'sulamericana';
  if (pos >= 17) return 'rebaixamento';
  return 'neutro';
}

// ── Peso dos gols na pontuação da partida ────────────────────────────────
// Cada gol "vale" a fração dos pontos que o resultado deu ao time, dividida
// entre todos os gols que aquele time marcou naquela partida. Ex: vitória
// por 2x0 → 3 pontos / 2 gols = 1,5 por gol. Empate 2x2 → 1 ponto / 2 gols
// = 0,5 por gol. Gols do time perdedor valem 0.
//
// Pênalti defendido: não altera o placar, mas "resgata" a diferença entre
// os pontos reais do time do goleiro e os pontos que ele teria se o pênalti
// tivesse sido convertido:
//  - Evita um empate virando derrota → mantém a vitória → peso = 3 - 1 = 2
//  - Evita uma derrota virando empate → mantém o empate  → peso = 1 - 0 = 1
//  - Defesa "sem impacto" no resultado (ex: vencendo por 2+ gols) → peso = 0
export interface PesoGolItem {
  id: string;
  jogadorId: string;
  rodada: number;
  partidaId: string;
  mandanteSigla: string;
  visitanteSigla: string;
  placarCasa: number;
  placarVisitante: number;
  data: string;
  tipo: 'gol' | 'penalti_defendido';
  jogadorNome: string;
  timeSigla: string;
  timeId: string;
  minuto: number;
  acrescimo: number;
  peso: number;
}

function pontosPorResultado(golsTime: number, golsAdversario: number): number {
  if (golsTime > golsAdversario) return 3;
  if (golsTime === golsAdversario) return 1;
  return 0;
}

export function calcularPesoGols(partidas: Partida[], jogadores: Jogador[], times: Time[]): PesoGolItem[] {
  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const siglaTime = (id: string) => times.find(t => t.id === id)?.sigla ?? id;
  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const itens: PesoGolItem[] = [];

  for (const p of encerradas) {
    // Gols que de fato contam para o placar (exclui pênaltis perdidos/defendidos)
    const golsValidos = p.gols.filter(g => {
      const t = g.tipo as string;
      return t !== 'penalti_perdido' && t !== 'penalti_defendido';
    });

    const golsPorTime: Record<string, number> = {};
    for (const g of golsValidos) golsPorTime[g.time_id] = (golsPorTime[g.time_id] ?? 0) + 1;

    for (const g of golsValidos) {
      const timeId = g.time_id;
      const timeGols = timeId === p.time_casa_id ? p.placar_casa : p.placar_visitante;
      const advGols = timeId === p.time_casa_id ? p.placar_visitante : p.placar_casa;
      const pontos = pontosPorResultado(timeGols, advGols);
      const totalGolsTime = golsPorTime[timeId] ?? 0;
      const peso = totalGolsTime > 0 ? pontos / totalGolsTime : 0;

      itens.push({
        id: g.id,
        jogadorId: g.jogador_id,
        rodada: p.rodada,
        partidaId: p.id,
        mandanteSigla: siglaTime(p.time_casa_id),
        visitanteSigla: siglaTime(p.time_visitante_id),
        placarCasa: p.placar_casa,
        placarVisitante: p.placar_visitante,
        data: p.data,
        tipo: 'gol',
        jogadorNome: nomeJog(g.jogador_id),
        timeSigla: siglaTime(timeId),
        timeId,
        minuto: g.minuto,
        acrescimo: g.acrescimo ?? 0,
        peso,
      });
    }

    // Pênaltis defendidos: o "atacante" (time_id) é quem bateu e perdeu;
    // o goleiro (goleiro_id) pertence ao time adversário do atacante.
    const defendidos = p.gols.filter(g => (g.tipo as string) === 'penalti_defendido');
    for (const g of defendidos) {
      const timeAtacanteId = g.time_id;
      const timeGoleiroId = timeAtacanteId === p.time_casa_id ? p.time_visitante_id : p.time_casa_id;
      const atacanteGols = timeAtacanteId === p.time_casa_id ? p.placar_casa : p.placar_visitante;
      const goleiroGols  = timeAtacanteId === p.time_casa_id ? p.placar_visitante : p.placar_casa;

      const pontosAtual = pontosPorResultado(goleiroGols, atacanteGols);
      const pontosHipotetico = pontosPorResultado(goleiroGols, atacanteGols + 1);
      const peso = Math.max(0, pontosAtual - pontosHipotetico);

      itens.push({
        id: g.id,
        jogadorId: g.goleiro_id,
        rodada: p.rodada,
        partidaId: p.id,
        mandanteSigla: siglaTime(p.time_casa_id),
        visitanteSigla: siglaTime(p.time_visitante_id),
        placarCasa: p.placar_casa,
        placarVisitante: p.placar_visitante,
        data: p.data,
        tipo: 'penalti_defendido',
        jogadorNome: nomeJog(g.goleiro_id),
        timeSigla: siglaTime(timeGoleiroId),
        timeId: timeGoleiroId,
        minuto: g.minuto,
        acrescimo: (g as { acrescimo?: number }).acrescimo ?? 0,
        peso,
      });
    }
  }

  return itens.sort((a, b) => b.peso - a.peso || b.rodada - a.rodada || a.data.localeCompare(b.data));
}

// Soma o peso de todos os gols/pênaltis defendidos de cada jogador — usado
// como coluna "Pts" no Analítico e como critério de desempate na Artilharia.
export function somaPesoGolsPorJogador(itens: PesoGolItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const it of itens) {
    map[it.jogadorId] = (map[it.jogadorId] ?? 0) + it.peso;
  }
  return map;
}

// ── Estatísticas Opta (agregado por jogador) ──────────────────────────────
// Soma, partida a partida, os números lançados manualmente na aba "Stats"
// de cada partida (Admin → Partida → Eventos → Stats). Usado no Analítico.
export interface StatsOptaAgregado {
  partidas_com_stats: number;
  S: number;
  SoT: number;
  SB: number;
  P: number;
  C: number;
  Crn: number;
  Tk: number;
  Off: number;
  FC: number;
  FS: number;
  Sav: number;
}

const STATS_OPTA_KEYS = ['S', 'SoT', 'SB', 'P', 'C', 'Crn', 'Tk', 'Off', 'FC', 'FS', 'Sav'] as const;

function statsOptaVazio(): StatsOptaAgregado {
  return { partidas_com_stats: 0, S: 0, SoT: 0, SB: 0, P: 0, C: 0, Crn: 0, Tk: 0, Off: 0, FC: 0, FS: 0, Sav: 0 };
}

// Considera apenas partidas ENCERRADAS e apenas jogadores que de fato têm
// uma entrada em stats_jogadores (o lançamento na aba Stats é manual, então
// nem toda partida/jogador tem stats registradas — "partidas_com_stats"
// reflete essa cobertura).
export function somaStatsOptaPorJogador(partidas: Partida[]): Record<string, StatsOptaAgregado> {
  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const map: Record<string, StatsOptaAgregado> = {};

  for (const p of encerradas) {
    for (const s of p.stats_jogadores ?? []) {
      if (!map[s.jogador_id]) map[s.jogador_id] = statsOptaVazio();
      const acc = map[s.jogador_id];
      acc.partidas_com_stats++;
      for (const k of STATS_OPTA_KEYS) acc[k] += s[k];
    }
  }

  return map;
}

// ── Vínculos entre Gols/Cartões e Estatísticas Opta ───────────────────────
// Cruza descrições de gol e motivos de cartão com os totais já lançados na
// aba "Stats", para compor os índices exibidos no Analítico (seção
// "Vínculos e Índices").
//
// IMPORTANTE — correspondência de texto:
// - "Cabeceio em escanteio" e "Cabeceio após cruzamento" são as descrições
//   já sugeridas nos chips da aba Gols (Admin → Partida → Eventos → Gols).
//   O vínculo com escanteios (Crn) usa "Cabeceio em escanteio"; o vínculo
//   com cruzamentos (C) usa "Cabeceio após cruzamento".
// - Cartões de falta: o campo "Motivo" do cartão é texto livre. Em vez de
//   exigir um texto exato, aqui contamos qualquer cartão (amarelo ou
//   vermelho) cujo motivo contenha a palavra "falta" — cobre "Falta
//   tática", "Falta violenta", "Falta violenta grave", "Falta técnica",
//   "Falta grave" etc., sem diferenciar maiúsculas/minúsculas ou acentos.
export interface VinculoJogador {
  assist_gol_escanteio: number;   // assistências em gols com descrição "Cabeceio em escanteio"
  assist_gol_cruzamento: number;  // assistências em gols com descrição "Cabeceio após cruzamento"
  cartoes_falta_amarelo: number;  // cartões amarelos cujo motivo contém "falta"
  cartoes_falta_vermelho: number; // cartões vermelhos cujo motivo contém "falta"
}

const DESC_GOL_ESCANTEIO = 'cabeceio em escanteio';
const DESC_GOL_CRUZAMENTO = 'cabeceio após cruzamento';
const PALAVRA_FALTA = 'falta';

function normalizarTexto(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function motivoIndicaFalta(motivo: string | null | undefined): boolean {
  return normalizarTexto(motivo).includes(PALAVRA_FALTA);
}

function vinculoVazio(): VinculoJogador {
  return {
    assist_gol_escanteio: 0,
    assist_gol_cruzamento: 0,
    cartoes_falta_amarelo: 0,
    cartoes_falta_vermelho: 0,
  };
}

export function calcularVinculosJogadores(partidas: Partida[]): Record<string, VinculoJogador> {
  const encerradas = partidas.filter(p => p.status === 'encerrada');
  const map: Record<string, VinculoJogador> = {};
  const get = (id: string): VinculoJogador => {
    if (!map[id]) map[id] = vinculoVazio();
    return map[id];
  };

  for (const p of encerradas) {
    for (const g of p.gols) {
      if (!g.assistencia_id) continue;
      const desc = normalizarTexto(g.descricao);
      if (desc === DESC_GOL_ESCANTEIO) get(g.assistencia_id).assist_gol_escanteio++;
      else if (desc === DESC_GOL_CRUZAMENTO) get(g.assistencia_id).assist_gol_cruzamento++;
    }
    for (const c of p.cartoes) {
      if (!c.jogador_id || c.jogador_id === '__tecnico__') continue; // cartão de técnico não conta aqui
      if (!motivoIndicaFalta(c.motivo)) continue;
      if (c.tipo === 'amarelo') get(c.jogador_id).cartoes_falta_amarelo++;
      else if (c.tipo === 'vermelho') get(c.jogador_id).cartoes_falta_vermelho++;
    }
  }

  return map;
}
