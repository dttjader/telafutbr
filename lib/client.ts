// Client-safe Supabase calls — importável em Client Components ('use client')
import { createClient } from '@supabase/supabase-js';
import { Estadio, Time, Jogador, Partida } from './types';

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
export async function clientGetTimes(): Promise<Time[]> {
  const { data, error } = await getClient().from('times').select('*').order('nome');
  if (error) throw error;
  return data as Time[];
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
export async function clientGetPartidas(): Promise<Partida[]> {
  const { data, error } = await getClient().from('partidas').select('*').order('rodada').order('data');
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

// ── Técnicos (server) ─────────────────────────────────────

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
