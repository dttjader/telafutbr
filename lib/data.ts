import { supabase } from './supabase';
import { Estadio, Time, Jogador, Partida } from './types';

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
export async function getTimes(): Promise<Time[]> {
  const { data, error } = await supabase.from('times').select('*').order('nome');
  if (error) throw error;
  return data as Time[];
}

export async function getTime(id: string): Promise<Time | null> {
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
