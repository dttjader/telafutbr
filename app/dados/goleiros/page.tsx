import { getPartidas, getTimes, getJogadores } from '@/lib/data';
import { GoleirosClient, type CicloGoleiro, type StatGoleiro } from '@/app/goleiros/GoleirosClient';

export const dynamic = 'force-dynamic';

export default async function GoleirosPage() {
  const [partidas, times, jogadores] = await Promise.all([
    getPartidas(), getTimes(), getJogadores(),
  ]);

  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const goleiros = jogadores.filter(j => j.posicao === 'GOL');

  interface GolEvento {
    minuto: number;
    acrescimo: number;
  }

  interface EventoPartida {
    data: string;
    rodada: number;
    hora: string;
    adversario: string;
    adversarioSigla: string;
    minutosJogados: number;
    golsSofridos: GolEvento[];
    minutoEntrada: number;
    minutoSaida: number;
    totalPartida: number;
  }

  const statsGoleiros: StatGoleiro[] = [];

  for (const goleiro of goleiros) {
    const time = times.find(t => t.id === goleiro.time_atual);
    const eventos: EventoPartida[] = [];

    for (const p of encerradas) {
      const todosEsc = [
        ...p.escalacao_casa.map(e => ({ ...e, timeId: p.time_casa_id, isCasa: true })),
        ...p.escalacao_visitante.map(e => ({ ...e, timeId: p.time_visitante_id, isCasa: false })),
      ];

      const esc = todosEsc.find(e => e.jogador_id === goleiro.id);
      if (!esc) continue;

      const acr1 = p.acrescimo_primeiro ?? 0;
      const acr2 = p.acrescimo_segundo ?? 0;
      const totalPartida = 45 + acr1 + 45 + acr2;

      const vermelho = p.cartoes.find(c => c.jogador_id === goleiro.id && c.tipo === 'vermelho');
      const minutoVermelho = vermelho?.minuto ?? Infinity;

      let minutoEntrada = 0;
      let minutoSaida = Math.min(minutoVermelho, totalPartida);

      if (esc.titular) {
        const sub = p.substituicoes.find(s => s.sai_id === goleiro.id);
        minutoSaida = Math.min(sub?.minuto ?? totalPartida, minutoVermelho, totalPartida);
      } else {
        const entrada = p.substituicoes.find(s => s.entra_id === goleiro.id);
        if (!entrada) continue;
        minutoEntrada = entrada.minuto;
        const saida = p.substituicoes.find(s => s.sai_id === goleiro.id);
        minutoSaida = Math.min(saida?.minuto ?? totalPartida, minutoVermelho, totalPartida);
      }

      const minutosJogados = Math.max(0, minutoSaida - minutoEntrada);
      if (minutosJogados === 0) continue;

      const golsSofridos: GolEvento[] = [];
      for (const g of p.gols) {
        if (g.goleiro_id !== goleiro.id) continue;
        if (g.minuto < minutoEntrada || g.minuto > minutoSaida) continue;
        golsSofridos.push({ minuto: g.minuto, acrescimo: g.acrescimo ?? 0 });
      }

      const adversarioId = esc.isCasa ? p.time_visitante_id : p.time_casa_id;
      const adversarioTime = times.find(t => t.id === adversarioId);

      eventos.push({
        data: p.data,
        rodada: p.rodada,
        hora: p.hora,
        adversario: adversarioTime?.nome ?? adversarioId,
        adversarioSigla: adversarioTime?.sigla ?? adversarioId,
        minutosJogados,
        golsSofridos: golsSofridos.sort((a, b) => a.minuto - b.minuto),
        minutoEntrada,
        minutoSaida,
        totalPartida,
      });
    }

    const ciclos: CicloGoleiro[] = [];
    let minutosAcumulados = 0;
    let inicioCicloMin = 0;
    let inicioPartidaData = '';
    let inicioPartidaRodada = 0;
    let inicioPartidaAdversario = '';
    let inicioMinutoNaPartida = 0;
    let numeroCiclo = 1;

    for (const ev of eventos) {
      if (!inicioPartidaData) {
        inicioPartidaData = ev.data;
        inicioPartidaRodada = ev.rodada;
        inicioPartidaAdversario = ev.adversarioSigla;
        inicioMinutoNaPartida = ev.minutoEntrada;
        inicioCicloMin = minutosAcumulados;
      }

      if (ev.golsSofridos.length === 0) {
        minutosAcumulados += ev.minutosJogados;
      } else {
        let cursorLocal = ev.minutoEntrada;
        for (const gol of ev.golsSofridos) {
          const minutosAteGol = gol.minuto - cursorLocal;
          minutosAcumulados += Math.max(0, minutosAteGol);
          const duracaoCiclo = minutosAcumulados - inicioCicloMin;
          ciclos.push({
            numero: numeroCiclo,
            duracao: duracaoCiclo,
            dataInicio: inicioPartidaData,
            rodadaInicio: inicioPartidaRodada,
            adversarioInicio: inicioPartidaAdversario,
            minutoInicio: inicioMinutoNaPartida,
            dataFim: ev.data,
            rodadaFim: ev.rodada,
            adversarioFim: ev.adversarioSigla,
            minutoFim: gol.minuto + (gol.acrescimo > 0 ? gol.acrescimo : 0),
            minutoFimAcrescimo: gol.acrescimo,
            aberto: false,
          });
          numeroCiclo++;
          inicioCicloMin = minutosAcumulados;
          inicioPartidaData = ev.data;
          inicioPartidaRodada = ev.rodada;
          inicioPartidaAdversario = ev.adversarioSigla;
          inicioMinutoNaPartida = gol.minuto;
          cursorLocal = gol.minuto;
        }
        const minutosRestantes = ev.minutoSaida - cursorLocal;
        minutosAcumulados += Math.max(0, minutosRestantes);
      }
    }

    const cicloAtualMin = minutosAcumulados - inicioCicloMin;
    const ultimoEvento = eventos[eventos.length - 1];
    if (cicloAtualMin > 0 || ciclos.length === 0) {
      ciclos.push({
        numero: numeroCiclo,
        duracao: cicloAtualMin,
        dataInicio: inicioPartidaData || '',
        rodadaInicio: inicioPartidaRodada,
        adversarioInicio: inicioPartidaAdversario,
        minutoInicio: inicioMinutoNaPartida,
        dataFim: null,
        rodadaFim: ultimoEvento?.rodada ?? null,
        adversarioFim: ultimoEvento?.adversarioSigla ?? null,
        minutoFim: ultimoEvento?.minutoSaida ?? null,
        minutoFimAcrescimo: 0,
        aberto: true,
      });
    }

    const cicloAtual = ciclos[ciclos.length - 1];
    const maiorCiclo = [...ciclos].sort((a, b) => b.duracao - a.duracao)[0];

    statsGoleiros.push({
      jogador: { id: goleiro.id, nome: goleiro.nome, numero: goleiro.numero, time_atual: goleiro.time_atual },
      timeNome: time?.nome ?? '—',
      timeSigla: time?.sigla ?? '—',
      timeCor: time?.cor_primaria ?? '#888',
      timeCorSec: time?.cor_secundaria ?? '#fff',
      totalMinutos: minutosAcumulados,
      totalPartidas: eventos.length,
      cicloAtualMin: cicloAtual.duracao,
      numeroCicloAtual: cicloAtual.numero,
      maiorCiclo,
      ciclos,
    });
  }

  const lista = statsGoleiros
    .filter(s => s.totalPartidas > 0)
    .sort((a, b) => b.cicloAtualMin - a.cicloAtualMin);

  return <GoleirosClient lista={lista} times={times} />;
        }
