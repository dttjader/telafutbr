import { getPartidas, getTimes, getJogadores } from '@/lib/data';
import { GoleirosClient, type CicloGoleiro, type StatGoleiro } from './GoleirosClient';

export const dynamic = 'force-dynamic';

export default async function GoleirosPage() {
  const [partidas, times, jogadores] = await Promise.all([
    getPartidas(), getTimes(), getJogadores(),
  ]);

  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  // Todos os goleiros cadastrados
  const goleiros = jogadores.filter(j => j.posicao === 'GOL');

  // Para cada goleiro, montar a timeline de eventos ordenados cronologicamente
  // Evento = cada vez que ele jogou (titular ou entrou) com os minutos efetivos
  // e os gols que sofreu durante sua participação

  interface EventoPartida {
    data: string;
    rodada: number;
    hora: string;
    adversario: string;
    minutosJogados: number; // minutos efetivos jogados pelo goleiro nesta partida
    golsSofridos: { minuto: number; acrescimo: number; minutoAbsoluto: number }[];
    minutoEntrada: number; // minuto absoluto da partida em que entrou (0 se titular)
    minutoCruzamento: number; // total da partida (90 + acréscimos)
  }

  // Minutos absolutos acumulados ao longo de todas as partidas de um goleiro
  // Usamos para calcular ciclos contínuos

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

      // Minuto de entrada
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

      // Gols sofridos durante a sua participação
      // Para um goleiro, "gols sofridos" são os gols do adversário, incluindo "contra" do próprio time
      const timeDoGoleiro = esc.timeId;
      const golsSofridos: EventoPartida['golsSofridos'] = [];

      for (const g of p.gols) {
        // Gol contra o time do goleiro (marcado pelo adversário) ou gol contra marcado pelo próprio time
        const golContraTime = g.tipo === 'contra'
          ? g.time_id === timeDoGoleiro  // gol contra marcado por jogador do próprio time → vai para o goleiro adversário
          : g.time_id !== timeDoGoleiro; // gol normal do adversário → goleiro sofre

        // Invertendo: quem sofre é o goleiro adversário ao time que marcou
        const goleiroSofre = g.tipo === 'contra'
          ? g.goleiro_id === goleiro.id  // campo goleiro_id guardado no evento de gol
          : g.goleiro_id === goleiro.id;

        if (!goleiroSofre) continue;

        // Verificar se o goleiro estava em campo no minuto do gol
        const minutoGol = g.minuto + (g.acrescimo ?? 0) * 0.1;
        // Aproximação: usar minuto do gol (ignorar décimos do acréscimo para comparação simples)
        if (g.minuto < minutoEntrada || g.minuto > minutoSaida) continue;

        golsSofridos.push({
          minuto: g.minuto,
          acrescimo: g.acrescimo ?? 0,
          minutoAbsoluto: g.minuto,
        });
      }

      const adversarioId = esc.isCasa ? p.time_visitante_id : p.time_casa_id;
      const adversario = times.find(t => t.id === adversarioId)?.sigla ?? adversarioId;

      eventos.push({
        data: p.data,
        rodada: p.rodada,
        hora: p.hora,
        adversario,
        minutosJogados,
        golsSofridos: golsSofridos.sort((a, b) => a.minuto - b.minuto),
        minutoEntrada,
        minutoCruzamento: totalPartida,
      });
    }

    // Calcular ciclos: sequências de minutos entre gols sofridos
    // Cada ciclo tem: minutosInício (dentro do fluxo de tempo), duração, data início, data fim
    // Montamos uma timeline linear de todos os minutos jogados

    const ciclos: CicloGoleiro[] = [];
    let minutosAcumulados = 0; // cursor global de minutos acumulados
    let inicioCicloMin = 0; // minuto acumulado em que o ciclo atual começou
    let inicioCicloData = '';
    let numeroCiclo = 1;

    // Minutos antes do primeiro jogo (informação que não temos automaticamente,
    // mas o campo 'minutosPreCampeonato' seria manual — não há no schema, então usaremos 0)
    // Se quiser suportar no futuro, adicionar campo no jogador.

    for (const ev of eventos) {
      const minPartidaInicio = minutosAcumulados; // onde essa partida começa no eixo global

      if (!inicioCicloData) {
        inicioCicloData = ev.data;
        inicioCicloMin = minutosAcumulados;
      }

      if (ev.golsSofridos.length === 0) {
        // Nenhum gol nesta partida: adiciona minutos ao ciclo atual
        minutosAcumulados += ev.minutosJogados;
      } else {
        // Tem gols: fecha ciclo(s) e abre novos
        let cursorLocal = ev.minutoEntrada; // cursor dentro da partida

        for (const gol of ev.golsSofridos) {
          const minutosAteGol = gol.minuto - cursorLocal;
          minutosAcumulados += Math.max(0, minutosAteGol);

          // Fechar ciclo atual
          const duracaoCiclo = minutosAcumulados - inicioCicloMin;
          ciclos.push({
            numero: numeroCiclo,
            duracao: duracaoCiclo,
            dataInicio: inicioCicloData,
            dataFim: ev.data,
            aberto: false,
          });

          numeroCiclo++;
          inicioCicloMin = minutosAcumulados;
          inicioCicloData = ev.data;
          cursorLocal = gol.minuto;
        }

        // Minutos restantes da partida após o último gol
        const minutosRestantes = (ev.minutoEntrada + ev.minutosJogados) - cursorLocal;
        minutosAcumulados += Math.max(0, minutosRestantes);
      }
    }

    // Ciclo atual (em aberto)
    const cicloAtualMin = minutosAcumulados - inicioCicloMin;
    if (cicloAtualMin > 0 || ciclos.length === 0) {
      ciclos.push({
        numero: numeroCiclo,
        duracao: cicloAtualMin,
        dataInicio: inicioCicloData || '',
        dataFim: null,
        aberto: true,
      });
    }

    const cicloAtual = ciclos[ciclos.length - 1];
    const maiorCiclo = [...ciclos].sort((a, b) => b.duracao - a.duracao)[0];

    statsGoleiros.push({
      jogador: {
        id: goleiro.id,
        nome: goleiro.nome,
        numero: goleiro.numero,
        time_atual: goleiro.time_atual,
      },
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

  // Filtrar apenas goleiros que jogaram pelo menos uma partida
  const lista = statsGoleiros
    .filter(s => s.totalPartidas > 0)
    .sort((a, b) => b.cicloAtualMin - a.cicloAtualMin);

  return <GoleirosClient lista={lista} times={times} />;
}
