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
  numero?: number;
  idade?: number;
  nacionalidade?: 'Brasileiro' | 'Estrangeiro';
  time_atual: string;
  transferencias: Transferencia[];
  registro?: number; // Código numérico único
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
  time_id: string;
  motivo: string;
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
