export interface Time {
  id: string;
  nome: string;
  sigla: string;
  cor_primaria: string;
  cor_secundaria: string;
  escudo: string;
  estadio: string;
}

export interface Arbitragem {
  principal: string;
  assistente1: string;
  assistente2: string;
  quarto: string;
  var: string;
}

export interface Jogador {
  numero: number;
  nome: string;
  posicao: string;
}

export interface Escalacao {
  formacao: string;
  titulares: Jogador[];
  reservas: Jogador[];
}

export interface Gol {
  id: string;
  minuto: number;
  acrescimo: number;
  time: string;
  jogador: string;
  assistencia: string | null;
  tipo: 'normal' | 'penalti' | 'falta' | 'contra';
  goleiro_adversario: string;
  descricao: string;
}

export interface Cartao {
  minuto: number;
  tipo: 'amarelo' | 'vermelho';
  jogador: string;
  time: string;
  motivo: string;
}

export interface Substituicao {
  minuto: number;
  time: string;
  sai: string;
  entra: string;
}

export interface Partida {
  id: string;
  rodada: number;
  data: string;
  hora: string;
  status: 'agendada' | 'ao_vivo' | 'encerrada' | 'adiada';
  time_casa: string;
  time_visitante: string;
  placar_casa: number;
  placar_visitante: number;
  estadio: string;
  cidade: string;
  publico: number;
  arbitragem: Arbitragem;
  escalacao_casa: Escalacao;
  escalacao_visitante: Escalacao;
  gols: Gol[];
  cartoes: Cartao[];
  substituicoes: Substituicao[];
}

export interface Rodada {
  numero: number;
  status: 'futura' | 'em_andamento' | 'encerrada';
  partidas: Partida[];
}

export interface TabelaTime {
  posicao: number;
  time: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
}

export interface Campeonato {
  campeonato: {
    nome: string;
    edicao: string;
    organizador: string;
  };
  times: Time[];
  rodadas: Rodada[];
  tabela: TabelaTime[];
}
