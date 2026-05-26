import { getJogadores, getPartidas, getTimes } from '@/lib/data';
import { Partida, Jogador } from '@/lib/types';
import { AnaliticoClient } from './AnaliticoClient';

export const dynamic = 'force-dynamic';

export interface StatJogador {
  jogador: Jogador;
  timeNome: string;
  timeSigla: string;
  timeCor: string;
  timeCorSec: string;
  partidas: number;
  titular: number;
  reserva: number;
  minutos: number;
  gols: number;
  gols_contra: number;
  gols_sofridos: number; // só goleiros
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  minutos_com_amarelo: number;
}

function calcularMinutos(jogadorId: string, partida: Partida, ehTitular: boolean): number {
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;
  const subs = partida.substituicoes;

  // Cartão vermelho encerra imediatamente a participação
  const vermelho = partida.cartoes.find(c => c.jogador_id === jogadorId && c.tipo === 'vermelho');
  const minutoVermelho = vermelho?.minuto ?? Infinity;

  if (ehTitular) {
    const sub = subs.find(s => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida);
  } else {
    const entrada = subs.find(s => s.entra_id === jogadorId);
    if (!entrada) return 0;
    const sub = subs.find(s => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida) - entrada.minuto;
  }
}

function calcularMinutosComAmarelo(jogadorId: string, partida: Partida, mins: number, minutoEntrada: number): number {
  const amarelos = partida.cartoes.filter(c => c.jogador_id === jogadorId && c.tipo === 'amarelo');
  if (amarelos.length === 0) return 0;
  const primeiroAmarelo = Math.min(...amarelos.map(c => c.minuto));
  return Math.max(0, minutoEntrada + mins - primeiroAmarelo);
}

export default async function AnaliticoPage() {
  const [jogadores, partidas, times] = await Promise.all([
    getJogadores(), getPartidas(), getTimes(),
  ]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const statsMap: Record<string, StatJogador> = {};
  for (const j of jogadores) {
    const time = times.find(t => t.id === j.time_atual);
    statsMap[j.id] = {
      jogador: j,
      timeNome: time?.nome ?? '—',
      timeSigla: time?.sigla ?? '—',
      timeCor: time?.cor_primaria ?? '#888',
      timeCorSec: time?.cor_secundaria ?? '#fff',
      partidas: 0, titular: 0, reserva: 0, minutos: 0,
      gols: 0, gols_contra: 0, gols_sofridos: 0,
      assistencias: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0,
      minutos_com_amarelo: 0,
    };
  }

  for (const p of encerradas) {
    const todosEscalados = [
      ...p.escalacao_casa.map(e => ({ ...e, timeId: p.time_casa_id })),
      ...p.escalacao_visitante.map(e => ({ ...e, timeId: p.time_visitante_id })),
    ];

    for (const esc of todosEscalados) {
      const s = statsMap[esc.jogador_id];
      if (!s) continue;
      const mins = calcularMinutos(esc.jogador_id, p, esc.titular);
      if (mins === 0 && !esc.titular) continue;
      s.partidas++; s.minutos += mins;
      if (esc.titular) s.titular++; else s.reserva++;
      const entradaSub = p.substituicoes.find(sub => sub.entra_id === esc.jogador_id);
      const minutoEntrada = esc.titular ? 0 : (entradaSub?.minuto ?? 0);
      s.minutos_com_amarelo += calcularMinutosComAmarelo(esc.jogador_id, p, mins, minutoEntrada);
    }

    for (const g of p.gols) {
      if (g.tipo === 'contra') {
        if (statsMap[g.jogador_id]) statsMap[g.jogador_id].gols_contra++;
        if (g.goleiro_id && statsMap[g.goleiro_id]) statsMap[g.goleiro_id].gols_sofridos++;
      } else {
        if (statsMap[g.jogador_id]) statsMap[g.jogador_id].gols++;
        if (g.assistencia_id && statsMap[g.assistencia_id]) statsMap[g.assistencia_id].assistencias++;
        if (g.goleiro_id && statsMap[g.goleiro_id]) statsMap[g.goleiro_id].gols_sofridos++;
      }
    }

    for (const c of p.cartoes) {
      if (!statsMap[c.jogador_id]) continue;
      if (c.tipo === 'amarelo') statsMap[c.jogador_id].cartoes_amarelos++;
      else statsMap[c.jogador_id].cartoes_vermelhos++;
    }
  }

  const lista = Object.values(statsMap)
    .filter(s => s.partidas > 0)
    .sort((a, b) => b.minutos - a.minutos || b.partidas - a.partidas);

  return <AnaliticoClient lista={lista} totalPartidas={encerradas.length} times={times} />;
}
