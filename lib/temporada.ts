// Temporada selecionada (lado servidor). A escolha do visitante fica no cookie
// `temporada` (definido pelo seletor do menu); sem cookie válido vale a
// temporada marcada como "atual". O acesso ao cookie é dinâmico para que este
// módulo continue seguro fora de uma requisição (ex.: scripts, rotas de sync).
import { supabase } from './supabase';
import type { Temporada } from './types';
import { COOKIE_TEMPORADA, ANO_PADRAO } from './utils';

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
