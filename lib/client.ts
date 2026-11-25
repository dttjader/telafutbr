// Client-safe Supabase calls — importável em Client Components ('use client')
import { createClient } from '@supabase/supabase-js';
import { Estadio, Time, Jogador, Partida, Temporada, TemporadaTime } from './types';
import { COOKIE_TEMPORADA, COOKIE_DIVISAO, ANO_PADRAO } from './utils';

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

// ── Divisões e times da temporada ─────────────────────────
export async function clientGetTemporadaTimes(ano: number): Promise<TemporadaTime[]> {
  const { data, error } = await getClient().from('temporada_times').select('temporada, time_id, divisao').eq('temporada', ano);
  if (error) throw error;
  return data as TemporadaTime[];
}

export async function clientDivisoesDaTemporada(ano: number): Promise<number[]> {
  try {
    const l = await clientGetTemporadaTimes(ano);
    const d = Array.from(new Set(l.map(r => r.divisao))).sort((a, b) => a - b);
    return d.length ? d : [1];
  } catch { return [1]; }
}

// Divisão escolhida no seletor do menu (cookie), validada contra a temporada.
export async function clientDivisaoSelecionada(ano: number): Promise<number> {
  const divs = await clientDivisoesDaTemporada(ano);
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_DIVISAO}=(\\d+)`));
  const v = m ? Number(m[1]) : NaN;
  return divs.includes(v) ? v : divs[0];
}

export function definirDivisaoCookie(divisao: number) {
  document.cookie = `${COOKIE_DIVISAO}=${divisao}; path=/; max-age=31536000; samesite=lax`;
}

// Define a divisão do time na temporada; `null` retira o time da temporada.
export async function clientSetDivisaoTime(ano: number, timeId: string, divisao: number | null): Promise<void> {
  const c = getClient();
  if (divisao === null) {
    const { error } = await c.from('temporada_times').delete().eq('temporada', ano).eq('time_id', timeId);
    if (error) throw error;
    return;
  }
  const { error } = await c.from('temporada_times').upsert({ temporada: ano, time_id: timeId, divisao });
  if (error) throw error;
}

export async function clientUpsertTime(time: Partial<Time> & { id: string }): Promise<Time> {
  const { data, error } = await getClient().from('times').upsert(time).select().single();
  if (error) throw error;
  return data as Time;
}

export async function clientDeleteTime(id: string): Promise<void> {
  const { error } = await getClient().from('times').delete().eq('id', id);
  if (error) throw error;
}

export async function clientCriarTemporada(ano: number, configBase: unknown): Promise<void> {
  const c = getClient();
  // Os times da temporada anterior mais recente servem de ponto de partida (ajuste subidas/descidas em Admin/Times)
  const { data: anteriores } = await c.from('temporadas').select('ano').lt('ano', ano).order('ano', { ascending: false }).limit(1);
  const { error } = await c.from('temporadas').insert({ ano, atual: false });
  if (error) throw error;
  if (anteriores && anteriores.length > 0) {
    const { data: tt } = await c.from('temporada_times').select('time_id, divisao').eq('temporada', anteriores[0].ano);
    if (tt && tt.length > 0) {
      const { error: e3 } = await c.from('temporada_times').insert(tt.map(r => ({ temporada: ano, time_id: r.time_id, divisao: r.divisao })));
      if (e3) throw e3;
    }
  }
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

export async function clientGetPartidas(temporada?: number, divisao?: number): Promise<Partida[]> {
  const ano = temporada ?? await clientTemporadaSelecionada();
  const div = divisao ?? await clientDivisaoSelecionada(ano);
  const { data, error } = await getClient().from('partidas').select('*').eq('temporada', ano).eq('divisao', div).order('rodada').order('data');
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
