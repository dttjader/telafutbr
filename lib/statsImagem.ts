// Lógica pura (sem React, sem rede) para transformar o texto reconhecido por OCR
// em linhas de estatísticas e casá-las com os jogadores escalados na partida.
import type { Jogador, EscalacaoJogador, StatsJogador } from './types';

export type StatKey = keyof Omit<StatsJogador, 'jogador_id' | 'validado'>;

// Mesmas siglas/limites de STAT_COLS em app/admin/partida/[id]/page.tsx
export const STAT_KEYS: StatKey[] = ['Crn', 'S', 'SoT', 'SB', 'P', 'C', 'Tk', 'Off', 'FC', 'FS', 'Sav'];
export const STAT_MAX: Record<StatKey, number> = {
  Crn: 30, S: 30, SoT: 30, SB: 30, P: 150, C: 30, Tk: 30, Off: 30, FC: 30, FS: 30, Sav: 30,
};

export function normalizar(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// "P, S, SoT, _, Tk" → ['P','S','SoT',null,'Tk']  ("_" ou "-" ignora a coluna)
export function parseColunas(texto: string): { colunas: (StatKey | null)[]; invalidas: string[] } {
  const mapa = new Map(STAT_KEYS.map(k => [k.toLowerCase(), k]));
  const colunas: (StatKey | null)[] = [];
  const invalidas: string[] = [];
  for (const t of texto.split(/[\s,;|]+/).filter(Boolean)) {
    if (t === '_' || t === '-') { colunas.push(null); continue; }
    const k = mapa.get(t.toLowerCase());
    if (k) colunas.push(k); else invalidas.push(t);
  }
  return { colunas, invalidas };
}

// Converte um token do OCR em número. Corrige confusões comuns (O→0, l/I/|→1)
// apenas quando o token tem cara de número; "-" e travessões viram 0.
function lerNumero(t: string): number | null {
  if (/^[-–—]+$/.test(t)) return 0;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  // "11" lido como "ll", "Il", "||": só letras parecidas com 1, até 2 caracteres
  if (/^[lI|]{2}$/.test(t)) return 11;
  const corrigido = t.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1');
  const temDigito = /\d/.test(t);
  if ((temDigito || t.length === 1) && /^\d+$/.test(corrigido)) return parseInt(corrigido, 10);
  return null;
}

export interface LinhaOcr {
  texto: string;       // linha original
  nome: string;        // nome lido
  prefixos: number[];  // números antes do nome (registro, camisa...)
  valores: number[];   // números depois do nome, na ordem das colunas
  brutos: string[];    // tokens numéricos originais (para reunir dígitos separados pelo OCR)
}

export function parseLinhas(textoOcr: string): LinhaOcr[] {
  const linhas: LinhaOcr[] = [];
  for (const bruta of textoOcr.split(/\r?\n/)) {
    const texto = bruta.trim();
    if (!texto) continue;
    const tokens = texto.split(/\s+/);

    let fim = tokens.length;
    const rev: number[] = [];
    while (fim > 0) {
      const n = lerNumero(tokens[fim - 1]);
      if (n === null) break;
      rev.push(n);
      fim--;
    }
    const valores = rev.reverse();
    const brutos = tokens.slice(fim);

    let ini = 0;
    const prefixos: number[] = [];
    while (ini < fim && /^\d+$/.test(tokens[ini])) { prefixos.push(parseInt(tokens[ini], 10)); ini++; }

    const nome = tokens.slice(ini, fim).join(' ').replace(/[^\p{L}\s.'-]/gu, '').replace(/\s+/g, ' ').trim();
    if (!nome || valores.length === 0) continue;
    linhas.push({ texto, nome, prefixos, valores, brutos });
  }
  return linhas;
}

// O OCR costuma separar números com "1" ("11" → "1 1", "41" → "4 1"), o que gera
// valores a mais e desloca todas as colunas seguintes. Quando há mais valores do que
// colunas, testa juntar pares de dígitos soltos e escolhe a combinação que respeita os
// limites de cada coluna; em caso de dúvida, prefere a que dá o maior valor em "P".
export function ajustarValores(
  linha: Pick<LinhaOcr, 'valores' | 'brutos'>,
  colunas: (StatKey | null)[],
): number[] {
  const { valores, brutos } = linha;
  const n = valores.length;
  const k = n - colunas.length;
  if (k <= 0 || brutos.length !== n) return valores;

  const digitoSolto = (i: number) => /^\d$/.test(brutos[i]);
  const pares: number[] = [];
  for (let i = 0; i < n - 1; i++) if (digitoSolto(i) && digitoSolto(i + 1)) pares.push(i);
  if (pares.length < k) return valores;

  let melhor: { v: number[]; violacoes: number; p: number } | null = null;
  const idxP = colunas.indexOf('P');

  const tentar = (escolhidos: number[]) => {
    const v: number[] = [];
    for (let i = 0; i < n; i++) {
      if (escolhidos.includes(i)) { v.push(valores[i] * 10 + valores[i + 1]); i++; }
      else v.push(valores[i]);
    }
    let violacoes = 0;
    colunas.forEach((c, idx) => { if (c && v[idx] > STAT_MAX[c]) violacoes++; });
    const p = idxP >= 0 ? v[idxP] ?? 0 : 0;
    if (!melhor || violacoes < melhor.violacoes || (violacoes === melhor.violacoes && p > melhor.p)) {
      melhor = { v, violacoes, p };
    }
  };

  const combinar = (ini: number, escolhidos: number[]) => {
    if (escolhidos.length === k) { tentar(escolhidos); return; }
    for (let j = ini; j < pares.length; j++) {
      if (escolhidos.length && pares[j] === escolhidos[escolhidos.length - 1] + 1) continue; // sem sobreposição
      combinar(j + 1, [...escolhidos, pares[j]]);
    }
  };
  combinar(0, []);
  return melhor ? (melhor as { v: number[] }).v : valores;
}

export interface Candidato {
  jogador: Jogador;
  esc: EscalacaoJogador;
  lado: 'casa' | 'visitante';
}

export type MetodoCasamento = 'registro' | 'alias' | 'nome' | 'aproximado';
export interface Casamento { jogador_id: string | null; metodo: MetodoCasamento | null }

function jaccard(a: string, b: string): number {
  const A = new Set(a.split(' ').filter(t => t.length > 1));
  const B = new Set(b.split(' ').filter(t => t.length > 1));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach(t => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter);
}

// Ordem de confiança: registro → alias Opta → nome exato → aproximado.
// Só considera jogadores escalados (reduz homônimos entre times).
export function casarLinha(linha: Pick<LinhaOcr, 'nome' | 'prefixos'>, candidatos: Candidato[]): Casamento {
  for (const p of linha.prefixos) {
    const c = candidatos.find(c => c.jogador.registro === p);
    if (c) return { jogador_id: c.jogador.id, metodo: 'registro' };
  }

  const alvo = normalizar(linha.nome);
  if (!alvo) return { jogador_id: null, metodo: null };

  const porAlias = candidatos.filter(c => c.jogador.alias_opta && normalizar(c.jogador.alias_opta) === alvo);
  if (porAlias.length === 1) return { jogador_id: porAlias[0].jogador.id, metodo: 'alias' };

  const porNome = candidatos.filter(c => normalizar(c.jogador.nome) === alvo);
  if (porNome.length === 1) return { jogador_id: porNome[0].jogador.id, metodo: 'nome' };

  let melhor: { id: string; score: number } | null = null;
  let empate = false;
  for (const c of candidatos) {
    const nomes = [normalizar(c.jogador.nome), c.jogador.alias_opta ? normalizar(c.jogador.alias_opta) : ''].filter(Boolean);
    let score = 0;
    for (const n of nomes) {
      let s = jaccard(alvo, n);
      if (n.length > 3 && alvo.length > 3 && (n.includes(alvo) || alvo.includes(n))) s = Math.max(s, 0.8);
      score = Math.max(score, s);
    }
    if (score < 0.5) continue;
    if (!melhor || score > melhor.score) { melhor = { id: c.jogador.id, score }; empate = false; }
    else if (score === melhor.score) empate = true;
  }
  if (melhor && !empate) return { jogador_id: melhor.id, metodo: 'aproximado' };
  return { jogador_id: null, metodo: null };
}
