export interface HistoricoTecnico {
  time_id: string | null; // null = inativo (desempregado)
  data_inicio: string;
  data_fim: string | null;
  inativo: boolean;
}

export interface Tecnico {
  id: string;
  nome: string;
  nacionalidade?: string;
  time_atual: string | null; // null = desempregado
  ativo: boolean;
  historico: HistoricoTecnico[];
}

export interface Estadio {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  capacidade?: number;
}

export interface Time {
  id: string;
  nome: string;
  sigla: string;
  cor_primaria: string;
  cor_secundaria: string;
  estadio_id?: string;
}

export interface Transferencia {
  time_id: string;
  data: string; // AAAA-MM-DD
}

export interface Jogador {
  id: string;
  nome: string;
  posicao: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  sub_posicao?: SubPosicao;
  numero?: number;
  idade?: number;
  nacionalidade?: Nacionalidade;
  time_atual: string;
  transferencias: Transferencia[];
  registro?: number; // Código numérico único
  alias_opta?: string; // Nome usado para identificar o jogador no Opta Stats
}

export interface Arbitragem {
  principal: string;
  assistente1: string;
  assistente2: string;
  quarto: string;
  var: string;
}

export type StatusPartida = 'agendada' | 'ao_vivo' | 'encerrada' | 'adiada';
export type TipoGol = 'normal' | 'penalti' | 'falta' | 'contra';
export type TipoCartao = 'amarelo' | 'vermelho' | 'amarelo_tecnico' | 'vermelho_tecnico';
export type SubPosicao = string;
export type Nacionalidade = string;

export interface Gol {
  id: string;
  minuto: number;
  acrescimo: number;
  time_id: string;
  jogador_id: string;
  assistencia_id: string | null;
  tipo: TipoGol;
  goleiro_id: string;
  descricao: string;
}

export interface Cartao {
  id: string;
  minuto: number;
  tipo: TipoCartao;
  jogador_id: string;
  tecnico_id?: string; // preenchido quando tipo === 'amarelo_tecnico' | 'vermelho_tecnico'
  time_id: string;
  motivo: string;
  acrescimo?: number;
}

export interface Substituicao {
  id: string;
  minuto: number;
  time_id: string;
  sai_id: string;
  entra_id: string;
}

export interface EscalacaoJogador {
  jogador_id: string;
  numero: number;
  posicao: string;
  titular: boolean;
}

// Estatísticas individuais por jogador em uma partida (fonte: Opta Stats).
// Todos os campos numéricos vão de 0 até o limite definido por coluna (ver
// STAT_COLS em app/admin/partida/[id]/page.tsx), editáveis apenas na aba
// "Stats" da tela de eventos da partida. Quando "validado" é true, os
// campos numéricos desse jogador ficam bloqueados para edição.
export interface StatsJogador {
  jogador_id: string;
  validado: boolean;
  S: number;    // Finalizações
  SoT: number;  // Finalizações no Alvo
  SB: number;   // Finalizações Bloqueadas
  P: number;    // Passes
  C: number;    // Cruzamentos
  Crn: number;  // Escanteios a favor
  Tk: number;   // Desarmes
  Off: number;  // Impedimentos
  FC: number;   // Faltas Cometidas
  FS: number;   // Faltas Sofridas
  Sav: number;  // Defesas
}

export interface Partida {
  id: string;
  rodada: number;
  data: string;
  hora: string;
  status: StatusPartida;
  time_casa_id: string;
  time_visitante_id: string;
  placar_casa: number;
  placar_visitante: number;
  estadio_id: string;
  publico: number;
  acrescimo_primeiro: number;
  acrescimo_segundo: number;
  arbitragem: Arbitragem;
  tecnico_casa_id: string | null;
  tecnico_visitante_id: string | null;
  escalacao_casa: EscalacaoJogador[];
  escalacao_visitante: EscalacaoJogador[];
  gols: Gol[];
  cartoes: Cartao[];
  substituicoes: Substituicao[];
  stats_jogadores: StatsJogador[];
}

export interface TabelaEntry {
  time_id: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
}
