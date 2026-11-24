// Client-safe Supabase calls — importável em Client Components ('use client')
import { createClient } from '@supabase/supabase-js';
import { Estadio, Time, Jogador, Partida, Temporada } from './types';
import { COOKIE_TEMPORADA, ANO_PADRAO } from './utils';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Estádios ──────────────────────────────────────────────
export async function clientGetEstadios(): Promise<Estadio[]> {
  const { data, error } = await getClient().from('estadios').select('*').order('nome');
  if (error) throw error;
  return data as Estadio[];
}

export async function clientUpsertEstadio(estadio: Partial<Estadio> & { id: string }): Promise<Estadio> {
  const { data, error } = await getClient().from('estadios').upsert(estadio).select().single();
  if (error) throw error;
  return data as Estadio;
}

export async function clientDeleteEstadio(id: string): Promise<void> {
  const { error } = await getClient().from('estadios').delete().eq('id', id);
  if (error) throw error;
}

// ── Times ─────────────────────────────────────────────────
// Retorna apenas times reais — nunca 'outros' (pseudo-id para jogadores inativos)
export async function clientGetTimes(): Promise<Time[]> {
  const { data, error } = await getClient().from('times').select('*').order('nome');
  if (error) throw error;
  return (data as Time[]).filter(t => t.id !== 'outros');
}

// ── Jogadores ─────────────────────────────────────────────
export async function clientGetJogadores(): Promise<Jogador[]> {
  const { data, error } = await getClient().from('jogadores').select('*').order('nome');
  if (error) throw error;
  return data as Jogador[];
}

export async function clientUpsertJogador(jogador: Partial<Jogador> & { id: string }): Promise<Jogador> {
  const { data, error } = await getClient().from('jogadores').upsert(jogador).select().single();
  if (error) throw error;
  return data as Jogador;
}

export async function clientDeleteJogador(id: string): Promise<void> {
  const { error } = await getClient().from('jogadores').delete().eq('id', id);
  if (error) throw error;
}

// ── Partidas ──────────────────────────────────────────────
// ── Temporadas ────────────────────────────────────────────
export async function clientGetTemporadas(): Promise<Temporada[]> {
  const { data, error } = await getClient().from('temporadas').select('ano, atual').order('ano', { ascending: false });
  if (error || !data || data.length === 0) return [{ ano: ANO_PADRAO, atual: true }];
  return data as Temporada[];
}

// Temporada escolhida no seletor do menu (cookie); senão, a marcada como atual.
export async function clientTemporadaSelecionada(): Promise<number> {
  const lista = await clientGetTemporadas();
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_TEMPORADA}=(\\d+)`));
  const v = m ? Number(m[1]) : NaN;
  if (lista.some(t => t.ano === v)) return v;
  return (lista.find(t => t.atual) ?? lista[0]).ano;
}

export function definirTemporadaCookie(ano: number) {
  document.cookie = `${COOKIE_TEMPORADA}=${ano}; path=/; max-age=31536000; samesite=lax`;
}

export async function clientCriarTemporada(ano: number, configBase: unknown): Promise<void> {
  const c = getClient();
  const { error } = await c.from('temporadas').insert({ ano, atual: false });
  if (error) throw error;
  const { error: e2 } = await c.from('configuracoes').upsert({ chave: `classificacao:${ano}`, valor: configBase });
  if (e2) throw e2;
}

export async function clientDefinirTemporadaAtual(ano: number): Promise<void> {
  const c = getClient();
  const { error } = await c.from('temporadas').update({ atual: false }).neq('ano', ano);
  if (error) throw error;
  const { error: e2 } = await c.from('temporadas').update({ atual: true }).eq('ano', ano);
  if (e2) throw e2;
}

export async function clientGetPartidas(temporada?: number): Promise<Partida[]> {
  const ano = temporada ?? await clientTemporadaSelecionada();
  const { data, error } = await getClient().from('partidas').select('*').eq('temporada', ano).order('rodada').order('data');
  if (error) throw error;
  return data as Partida[];
}

export async function clientGetPartida(id: string): Promise<Partida | null> {
  const { data, error } = await getClient().from('partidas').select('*').eq('id', id).single();
  if (error) return null;
  return data as Partida;
}

export async function clientUpsertPartida(partida: Partial<Partida> & { id: string }): Promise<Partida> {
  const { data, error } = await getClient().from('partidas').upsert(partida).select().single();
  if (error) throw error;
  return data as Partida;
}

export async function clientDeletePartida(id: string): Promise<void> {
  const { error } = await getClient().from('partidas').delete().eq('id', id);
  if (error) throw error;
}

// ── Técnicos ──────────────────────────────────────────────
export async function clientGetTecnicos(): Promise<import('./types').Tecnico[]> {
  const { data, error } = await getClient().from('tecnicos').select('*').order('nome');
  if (error) throw error;
  return data as import('./types').Tecnico[];
}

export async function clientUpsertTecnico(tecnico: Partial<import('./types').Tecnico> & { id: string }): Promise<import('./types').Tecnico> {
  const { data, error } = await getClient().from('tecnicos').upsert(tecnico).select().single();
  if (error) throw error;
  return data as import('./types').Tecnico;
}

export async function clientDeleteTecnico(id: string): Promise<void> {
  const { error } = await getClient().from('tecnicos').delete().eq('id', id);
  if (error) throw error;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
