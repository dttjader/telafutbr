// Temporada selecionada (lado servidor). A escolha do visitante fica no cookie
// `temporada` (definido pelo seletor do menu); sem cookie válido vale a
// temporada marcada como "atual". O acesso ao cookie é dinâmico para que este
// módulo continue seguro fora de uma requisição (ex.: scripts, rotas de sync).
import { supabase } from './supabase';
import type { Temporada } from './types';
import { COOKIE_TEMPORADA, COOKIE_DIVISAO, ANO_PADRAO } from './utils';

export async function getTemporadas(): Promise<Temporada[]> {
  const { data, error } = await supabase.from('temporadas').select('ano, atual').order('ano', { ascending: false });
  if (error || !data || data.length === 0) return [{ ano: ANO_PADRAO, atual: true }];
  return data as Temporada[];
}

export function temporadaAtualDe(lista: Temporada[]): number {
  return (lista.find(t => t.atual) ?? lista[0]).ano;
}

export async function temporadaSelecionada(): Promise<number> {
  const lista = await getTemporadas();
  try {
    const { cookies } = await import('next/headers');
    const v = Number((await cookies()).get(COOKIE_TEMPORADA)?.value);
    if (lista.some(t => t.ano === v)) return v;
  } catch { /* fora de requisição: usa a temporada atual */ }
  return temporadaAtualDe(lista);
}

// Divisões que têm times cadastrados na temporada (sem cadastro: só a divisão 1).
export async function getDivisoesDaTemporada(ano: number): Promise<number[]> {
  const { data, error } = await supabase.from('temporada_times').select('divisao').eq('temporada', ano);
  if (error || !data || data.length === 0) return [1];
  return Array.from(new Set(data.map(r => r.divisao as number))).sort((a, b) => a - b);
}

// IDs dos times cadastrados na temporada (e, opcionalmente, em uma divisão).
export async function getTimeIdsDaTemporada(ano: number, divisao?: number): Promise<string[]> {
  let q = supabase.from('temporada_times').select('time_id').eq('temporada', ano);
  if (divisao !== undefined) q = q.eq('divisao', divisao);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(r => r.time_id as string);
}

// Divisão escolhida no seletor (cookie), validada contra as divisões da temporada.
export async function divisaoSelecionada(ano?: number): Promise<number> {
  const a = ano ?? await temporadaSelecionada();
  const divs = await getDivisoesDaTemporada(a);
  try {
    const { cookies } = await import('next/headers');
    const v = Number((await cookies()).get(COOKIE_DIVISAO)?.value);
    if (divs.includes(v)) return v;
  } catch { /* fora de requisição */ }
  return divs[0];
}
