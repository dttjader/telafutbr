// Cliente da API-Football (v3) com controle de cota diária.
// A chave NUNCA deve ter o prefixo NEXT_PUBLIC_ — este módulo só roda
// no servidor (rotas de API / Server Components), nunca no client.
import { supabase } from './supabase';

const BASE_URL = 'https://v3.football.api-sports.io';
const DAILY_LIMIT = 100;

// Margem de segurança: nunca deixamos a cota bater exatamente no limite,
// para sobrar espaço para chamadas manuais/depuração no mesmo dia.
const SAFETY_MARGIN = 5;

export class OrcamentoExcedidoError extends Error {
  constructor(usadas: number) {
    super(`Limite diário da API-Football atingido (${usadas}/${DAILY_LIMIT} requisições). Tente novamente amanhã.`);
    this.name = 'OrcamentoExcedidoError';
  }
}

async function getUsoHoje(): Promise<number> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('api_football_usage')
    .select('requisicoes')
    .eq('dia', hoje)
    .single();
  return data?.requisicoes ?? 0;
}

async function registrarUso(): Promise<void> {
  const hoje = new Date().toISOString().slice(0, 10);
  const atual = await getUsoHoje();
  await supabase
    .from('api_football_usage')
    .upsert({ dia: hoje, requisicoes: atual + 1, atualizado_em: new Date().toISOString() });
}

export async function getOrcamentoRestante(): Promise<{ usadas: number; restantes: number; limite: number }> {
  const usadas = await getUsoHoje();
  return { usadas, restantes: Math.max(0, DAILY_LIMIT - SAFETY_MARGIN - usadas), limite: DAILY_LIMIT };
}

async function apiFootballFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const usadas = await getUsoHoje();
  if (usadas >= DAILY_LIMIT - SAFETY_MARGIN) throw new OrcamentoExcedidoError(usadas);

  const url = new URL(BASE_URL + endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error('API_FOOTBALL_KEY não configurada em .env.local');

  const res = await fetch(url.toString(), { headers: { 'x-apisports-key': apiKey } });
  await registrarUso();

  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const temErros = Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors ?? {}).length > 0;
  if (temErros) throw new Error(`API-Football: ${JSON.stringify(data.errors)}`);

  return data.response as T[];
}

// ── Tipos da API-Football (apenas os campos usados aqui) ───────────────────
export interface AFVenue {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
}

export interface AFTeamEntry {
  team: { id: number; name: string; code: string | null; country: string; founded: number | null; logo: string };
  venue: AFVenue;
}

export interface AFSquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null; // "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
  photo: string;
}

export interface AFSquadEntry {
  team: { id: number; name: string; logo: string };
  players: AFSquadPlayer[];
}

export async function afGetTeamsByLeague(league: number, season: number) {
  return apiFootballFetch<AFTeamEntry>('/teams', { league, season });
}

export async function afGetSquad(teamId: number) {
  return apiFootballFetch<AFSquadEntry>('/players/squads', { team: teamId });
}

// ── Descoberta de ligas (usado uma única vez para achar o ID certo da
// Série B, Copa do Brasil etc. — evita chutar um ID errado) ────────────────
export interface AFLeagueEntry {
  league: { id: number; name: string; type: string; logo: string };
  country: { name: string; code: string | null };
  seasons: { year: number; start: string; end: string; current: boolean }[];
}

export async function afGetLeaguesByCountry(country: string) {
  return apiFootballFetch<AFLeagueEntry>('/leagues', { country });
}

// ── Fixtures (partidas) ─────────────────────────────────────────────────────
export interface AFFixtureEntry {
  fixture: { id: number; date: string; status: { long: string; short: string } };
  league: { id: number; name: string; season: number; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export async function afGetFixturesH2H(team1: number, team2: number, season?: number) {
  const params: Record<string, string | number> = { h2h: `${team1}-${team2}` };
  if (season) params.season = season;
  return apiFootballFetch<AFFixtureEntry>('/fixtures/headtohead', params);
}

export interface AFEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;   // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty" | "Yellow Card" | "Red Card" | "Substitution ..."
  comments: string | null;
}

export async function afGetFixtureEvents(fixtureId: number) {
  return apiFootballFetch<AFEvent>('/fixtures/events', { fixture: fixtureId });
}

export interface AFLineupPlayer {
  player: { id: number; name: string; number: number; pos: string | null; grid: string | null };
}

export interface AFLineup {
  team: { id: number; name: string };
  formation: string;
  startXI: AFLineupPlayer[];
  substitutes: AFLineupPlayer[];
}

export async function afGetFixtureLineups(fixtureId: number) {
  return apiFootballFetch<AFLineup>('/fixtures/lineups', { fixture: fixtureId });
  }
