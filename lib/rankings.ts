// Configuração central dos rankings (Resumo e páginas de Dados): mínimos de
// amostra/minutos, catálogo de indicadores e helpers de cálculo/formatação.
// Para mudar um mínimo, altere apenas o valor em MINIMOS abaixo.
import type { Jogador, Partida } from './types';
import { partidaContabilizada } from './utils';

// ── Mínimos de amostra e de minutos ──────────────────────────────────────────
// Evitam que poucos lançamentos distorçam os índices (ex.: 1 chute e 1 gol =
// 100% de eficácia). Valem no Resumo e nas colunas de índice de Dados.
export const MINIMOS = {
  chutes: 10,           // S — Pontaria, Chute Bloqueado, Eficácia G/(Off+S)
  chutesAlvo: 5,        // SoT — Conversão G/SoT
  duelos: 20,           // Tk + FC — Índice Desarme
  faltasCometidas: 10,  // FC — Razão FS/FC
  passes: 100,          // P — Passes/Minuto
  cruzamentos: 10,      // C — índices de cruzamento
  escanteios: 5,        // Crn — índices de escanteio
  minutos: 90,          // base dos índices "por 90 min"
  defesasGoleiro: 10,   // Sav + gols sofridos — SAV%
  partidasGoleiro: 3,   // partidas do goleiro — Defesas por jogo
} as const;

// ── Minutos jogados ──────────────────────────────────────────────────────────
// Mesma lógica usada em Dados/Analítico, Dados/Times e no Resumo: titular
// joga até a substituição/vermelho/fim; reserva só conta se entrou.
export function calcularMinutosJogador(jogadorId: string, partida: Partida, ehTitular: boolean): number {
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;
  const vermelho = partida.cartoes.find(c => c.jogador_id === jogadorId && c.tipo === 'vermelho');
  const minutoVermelho = vermelho?.minuto ?? Infinity;
  if (ehTitular) {
    const sub = partida.substituicoes.find(s => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida);
  }
  const entrada = partida.substituicoes.find(s => s.entra_id === jogadorId);
  if (!entrada) return 0;
  const sub = partida.substituicoes.find(s => s.sai_id === jogadorId);
  const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
  return Math.min(minutoSaida, totalPartida) - entrada.minuto;
}

// Minutos totais e nº de partidas disputadas por jogador (partidas encerradas).
export function calcularMinutosPorJogador(partidas: Partida[]): {
  minutos: Record<string, number>;
  partidas: Record<string, number>;
} {
  const minutos: Record<string, number> = {};
  const jogos: Record<string, number> = {};
  for (const p of partidas) {
    if (!partidaContabilizada(p)) continue;
    const escalados = [...p.escalacao_casa, ...p.escalacao_visitante];
    for (const esc of escalados) {
      const mins = calcularMinutosJogador(esc.jogador_id, p, esc.titular);
      if (mins === 0 && !esc.titular) continue;
      minutos[esc.jogador_id] = (minutos[esc.jogador_id] ?? 0) + mins;
      jogos[esc.jogador_id] = (jogos[esc.jogador_id] ?? 0) + 1;
    }
  }
  return { minutos, partidas: jogos };
}

// ── Formatação (pt-BR) ───────────────────────────────────────────────────────
export const fmtInt = (v: number) => Math.round(v).toLocaleString('pt-BR');
export const fmtDec = (casas: number) => (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const fmtPct = (casas = 1) => (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

// Divisão segura: devolve null quando o denominador não é positivo.
export const razao = (num: number, den: number): number | null => (den > 0 ? num / den : null);
export const por90 = (valor: number, minutos: number): number | null => (minutos > 0 ? (valor / minutos) * 90 : null);

// ── Catálogo de indicadores ──────────────────────────────────────────────────
export interface RankingItem {
  id: string;
  nome: string;
  timeId?: string;   // escudo; ausente em rankings sem time (ex.: placares)
  valor: string;     // já formatado
  detalhe?: string;  // linha pequena opcional
}

export interface RankingDef {
  id: string;
  emoji: string;
  titulo: string;
  cor: string;
  grupo: string;
  criterio: string;
}

const A = 'var(--amarelo)';
const V = 'var(--verde)';
const R = '#a78bfa';
const L = '#f59e0b';
const B = '#60a5fa';

export const GRUPOS_RANKING = ['Gols e finalização', 'Passes e bola parada', 'Defesa e faltas', 'Goleiros', 'Geral'] as const;

export const RANKINGS: RankingDef[] = [
  // Gols e finalização
  { id: 'artilheiros', emoji: '⚽', titulo: 'Artilheiros', cor: A, grupo: 'Gols e finalização', criterio: 'Gols válidos (sem contra e pênaltis não convertidos).' },
  { id: 'assistencias', emoji: '🎯', titulo: 'Assistências', cor: B, grupo: 'Gols e finalização', criterio: 'Assistências em gols válidos.' },
  { id: 'pontuadores', emoji: '⚖️', titulo: 'Pontuadores', cor: R, grupo: 'Gols e finalização', criterio: 'Soma do peso de cada gol na pontuação da partida.' },
  { id: 'g90', emoji: '⚡', titulo: 'Gols p/90 min', cor: A, grupo: 'Gols e finalização', criterio: `Gols ÷ minutos × 90 · mínimo de ${MINIMOS.minutos} minutos e 1 gol.` },
  { id: 'eficacia', emoji: '🎯', titulo: 'Eficácia G/(Off+S)', cor: R, grupo: 'Gols e finalização', criterio: `Gols ÷ (impedimentos + finalizações) · mínimo de ${MINIMOS.chutes} chutes.` },
  { id: 'conversao', emoji: '🥅', titulo: 'Conversão G/SoT', cor: R, grupo: 'Gols e finalização', criterio: `Gols ÷ chutes no alvo · mínimo de ${MINIMOS.chutesAlvo} chutes no alvo.` },
  { id: 'pontaria', emoji: '📍', titulo: 'Pontaria SoT/S', cor: B, grupo: 'Gols e finalização', criterio: `Chutes no alvo ÷ chutes · mínimo de ${MINIMOS.chutes} chutes.` },
  { id: 'chutes', emoji: '💥', titulo: 'Finalizadores (S)', cor: A, grupo: 'Gols e finalização', criterio: 'Total de finalizações.' },
  { id: 'chutes90', emoji: '💥', titulo: 'Chutes p/90 min', cor: A, grupo: 'Gols e finalização', criterio: `Chutes ÷ minutos × 90 · mínimo de ${MINIMOS.minutos} minutos e ${MINIMOS.chutes} chutes.` },
  { id: 'chutesAlvo', emoji: '🎯', titulo: 'Chutes a gol (SoT)', cor: V, grupo: 'Gols e finalização', criterio: 'Total de finalizações no alvo.' },
  { id: 'chutesBloq', emoji: '🧱', titulo: 'Chutes bloqueados (SB)', cor: L, grupo: 'Gols e finalização', criterio: 'Total de finalizações bloqueadas.' },
  { id: 'impedidos', emoji: '🚩', titulo: 'Impedimentos (Off)', cor: L, grupo: 'Gols e finalização', criterio: 'Total de impedimentos.' },
  // Passes e bola parada
  { id: 'passes', emoji: '📨', titulo: 'Passadores (P)', cor: R, grupo: 'Passes e bola parada', criterio: 'Total de passes.' },
  { id: 'passesMin', emoji: '📨', titulo: 'Passes/Minuto', cor: R, grupo: 'Passes e bola parada', criterio: `Passes ÷ minutos jogados · mínimo de mais de ${MINIMOS.passes} passes.` },
  { id: 'cruzamentos', emoji: '↗️', titulo: 'Cruzadores (C)', cor: B, grupo: 'Passes e bola parada', criterio: 'Total de cruzamentos.' },
  { id: 'cruzamentos90', emoji: '↗️', titulo: 'Cruzamentos p/90 min', cor: B, grupo: 'Passes e bola parada', criterio: `Cruzamentos ÷ minutos × 90 · mínimo de ${MINIMOS.minutos} minutos e ${MINIMOS.cruzamentos} cruzamentos.` },
  { id: 'escanteios', emoji: '🚩', titulo: 'Escanteadores (Crn)', cor: V, grupo: 'Passes e bola parada', criterio: 'Total de escanteios a favor.' },
  // Defesa e faltas
  { id: 'desarmadores', emoji: '🛡️', titulo: 'Desarmadores', cor: V, grupo: 'Defesa e faltas', criterio: `Tk ÷ (Tk + FC) · mínimo de ${MINIMOS.duelos} entre desarmes e faltas.` },
  { id: 'divididas', emoji: '💪', titulo: 'Divididas (Tk)', cor: V, grupo: 'Defesa e faltas', criterio: 'Total de desarmes/divididas.' },
  { id: 'divididas90', emoji: '💪', titulo: 'Divididas p/90 min', cor: V, grupo: 'Defesa e faltas', criterio: `Desarmes ÷ minutos × 90 · mínimo de ${MINIMOS.minutos} minutos.` },
  { id: 'razaoFaltas', emoji: '🥊', titulo: 'Razão Faltas FS/FC', cor: L, grupo: 'Defesa e faltas', criterio: `Faltas sofridas ÷ cometidas · mínimo de ${MINIMOS.faltasCometidas} faltas cometidas.` },
  { id: 'faltosos', emoji: '🦵', titulo: 'Faltosos (FC)', cor: L, grupo: 'Defesa e faltas', criterio: 'Total de faltas cometidas.' },
  { id: 'faltas90', emoji: '🦵', titulo: 'Faltas p/90 min', cor: L, grupo: 'Defesa e faltas', criterio: `Faltas cometidas ÷ minutos × 90 · mínimo de ${MINIMOS.minutos} minutos e ${MINIMOS.faltasCometidas} faltas.` },
  // Goleiros
  { id: 'savPct', emoji: '🧤', titulo: 'Goleiros (SAV%)', cor: V, grupo: 'Goleiros', criterio: `Defesas ÷ (defesas + gols sofridos) · mínimo de ${MINIMOS.defesasGoleiro} entre defesas e gols sofridos.` },
  { id: 'defesas', emoji: '🧤', titulo: 'Goleiros (Defesas)', cor: V, grupo: 'Goleiros', criterio: 'Total de defesas (Sav).' },
  { id: 'defesasJogo', emoji: '🧤', titulo: 'Goleiros (Defesas/jogo)', cor: V, grupo: 'Goleiros', criterio: `Defesas ÷ partidas · mínimo de ${MINIMOS.partidasGoleiro} partidas.` },
  { id: 'cicloMaior', emoji: '🧤', titulo: 'Goleiros (Maior Ciclo)', cor: V, grupo: 'Goleiros', criterio: 'Maior sequência de minutos sem sofrer gol.' },
  { id: 'cicloAtual', emoji: '🥅', titulo: 'Goleiros (Ciclo Atual)', cor: V, grupo: 'Goleiros', criterio: 'Minutos sem sofrer gol desde o último gol sofrido (ciclo em aberto).' },
  // Geral
  { id: 'placares', emoji: '🏆', titulo: 'Placares', cor: A, grupo: 'Geral', criterio: 'Placares mais frequentes (vencedor primeiro).' },
  { id: 'tecnicos', emoji: '🧑‍💼', titulo: 'Técnicos', cor: R, grupo: 'Geral', criterio: 'Aproveitamento, só entre quem dirigiu mais da metade das rodadas disputadas.' },
];

export const RANKING_IDS = new Set(RANKINGS.map(r => r.id));

// Seleção inicial dos cards do Resumo (TOTAL_CARDS deve ser igual ao tamanho da lista).
export const RANKINGS_PADRAO = [
  'artilheiros', 'assistencias', 'pontuadores', 'eficacia',
  'desarmadores', 'razaoFaltas', 'savPct', 'cicloMaior',
];
export const TOTAL_CARDS = 8;
export const TAMANHO_TOP = 10;

// ── Montagem de um ranking de jogadores ──────────────────────────────────────
// `valor` devolve null para excluir o jogador (abaixo do mínimo, sem dados).
export function topJogadores(
  jogadores: Jogador[],
  valor: (j: Jogador) => number | null,
  formatar: (v: number) => string,
  detalhe?: (j: Jogador) => string | undefined,
  n = TAMANHO_TOP,
): RankingItem[] {
  return jogadores
    .map(j => ({ j, v: valor(j) }))
    .filter((x): x is { j: Jogador; v: number } => x.v !== null && Number.isFinite(x.v) && x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map(({ j, v }) => ({
      id: j.id,
      nome: j.nome,
      timeId: j.time_atual,
      valor: formatar(v),
      detalhe: detalhe?.(j),
    }));
}
