import { Campeonato, Partida, Time, TabelaTime, Rodada } from './types';
import data from '../data/campeonato.json';

const campeonato = data as Campeonato;

export function getCampeonato(): Campeonato {
  return campeonato;
}

export function getTimes(): Time[] {
  return campeonato.times;
}

export function getTime(id: string): Time | undefined {
  return campeonato.times.find(t => t.id === id);
}

export function getRodadas(): Rodada[] {
  return campeonato.rodadas;
}

export function getRodada(numero: number): Rodada | undefined {
  return campeonato.rodadas.find(r => r.numero === numero);
}

export function getPartida(id: string): Partida | undefined {
  for (const rodada of campeonato.rodadas) {
    const partida = rodada.partidas.find(p => p.id === id);
    if (partida) return partida;
  }
  return undefined;
}

export function getTabela(): TabelaTime[] {
  return campeonato.tabela;
}

export function getArtilharia() {
  const gols: { jogador: string; time: string; quantidade: number }[] = [];

  for (const rodada of campeonato.rodadas) {
    for (const partida of rodada.partidas) {
      for (const gol of partida.gols) {
        if (gol.tipo === 'contra') continue;
        const existing = gols.find(g => g.jogador === gol.jogador && g.time === gol.time);
        if (existing) {
          existing.quantidade++;
        } else {
          gols.push({ jogador: gol.jogador, time: gol.time, quantidade: 1 });
        }
      }
    }
  }

  return gols.sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    ao_vivo: 'Ao Vivo',
    encerrada: 'Encerrada',
    adiada: 'Adiada',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    agendada: '#6B7280',
    ao_vivo: '#EF4444',
    encerrada: '#10B981',
    adiada: '#F59E0B',
  };
  return colors[status] || '#6B7280';
}

export function getPosicaoLabel(posicao: string): string {
  const labels: Record<string, string> = {
    GOL: 'Goleiro',
    ZAG: 'Zagueiro',
    LAT: 'Lateral',
    VOL: 'Volante',
    MEI: 'Meia',
    ATA: 'Atacante',
  };
  return labels[posicao] || posicao;
}

export function getGolTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    normal: 'Gol',
    penalti: 'Pênalti',
    falta: 'Falta',
    contra: 'Contra',
  };
  return labels[tipo] || tipo;
}

export function getZonaClassificacao(posicao: number): string {
  if (posicao <= 4) return 'libertadores';
  if (posicao <= 6) return 'sulamericana';
  if (posicao >= 18) return 'rebaixamento';
  return 'neutro';
}
