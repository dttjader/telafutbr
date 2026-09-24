import { getPartidas, getTimes, getJogadores, getTecnicos, calcularPesoGols, somaPesoGolsPorJogador, somaStatsOptaPorJogador, calcularGolsSofridosPorJogador } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import { Partida, Jogador, Time, Tecnico } from '@/lib/types';

// Página principal do site — mostra o painel Resumo, alimentado por versões
// condensadas das outras telas do site. Novas seções devem ser adicionadas
// como <section> abaixo.
export const dynamic = 'force-dynamic';

interface DiaResumo {
  data: string;
  label: string;      // dd/mm
  diaSemana: string;   // seg., ter., ...
  isHoje: boolean;
  jogos: Partida[];
}

// Gera os 5 dias da linha do tempo: 2 no passado, hoje, 2 no futuro (D-2 até D+2)
function gerarDias(partidas: Partida[]): DiaResumo[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias: DiaResumo[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dataISO = `${y}-${m}-${day}`;

    const jogos = partidas
      .filter(p => p.data === dataISO)
      .sort((a, b) => a.hora.localeCompare(b.hora));

    dias.push({
      data: dataISO,
      label: `${day}/${m}`,
      diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      isHoje: offset === 0,
      jogos,
    });
  }
  return dias;
}

const formaColor: Record<string, string> = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' };

function th(align: 'left' | 'center', extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '.45rem .55rem',
    textAlign: align,
    fontFamily: "'Bebas Neue',sans-serif",
    fontSize: '.72rem',
    letterSpacing: '.05em',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    ...extra,
  };
}

const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

function formatarData(d: string): string {
  if (!d) return '—';
  const partes = d.split('-');
  if (partes.length !== 3) return d;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Minutos jogados por um jogador em uma partida (mesma lógica usada em
// Dados/Analítico e Dados/Times) — usado para calcular os índices
// "Gols/90 min" e "Passes por Minuto" no Resumo.
function calcularMinutosJogador(jogadorId: string, partida: Partida, ehTitular: boolean): number {
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartida = 45 + acr1 + 45 + acr2;
  const vermelho = partida.cartoes.find(c => c.jogador_id === jogadorId && c.tipo === 'vermelho');
  const minutoVermelho = vermelho?.minuto ?? Infinity;
  if (ehTitular) {
    const sub = partida.substituicoes.find(s => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida);
  } else {
    const entrada = partida.substituicoes.find(s => s.entra_id === jogadorId);
    if (!entrada) return 0;
    const sub = partida.substituicoes.find(s => s.sai_id === jogadorId);
    const minutoSaida = sub ? Math.min(sub.minuto, minutoVermelho) : minutoVermelho;
    return Math.min(minutoSaida, totalPartida) - entrada.minuto;
  }
}

// Ciclos de minutos sem sofrer gols de cada goleiro (mesma lógica de
// app/dados/goleiros): calcula tanto o maior ciclo (recorde) quanto o ciclo
// atual (em aberto, desde o último gol sofrido) — usados nos Top 5 do Resumo.
interface CicloGoleiroResumo {
  jogador_id: string;
  nome: string;
  time_id: string;
  timeSigla: string;
  maiorCiclo: number;
  cicloAtual: number;
}

function calcularCiclosGoleiros(encerradas: Partida[], jogadores: Jogador[], times: Time[]): CicloGoleiroResumo[] {
  const goleiros = jogadores.filter(j => j.posicao === 'GOL');
  const resultados: CicloGoleiroResumo[] = [];

  for (const goleiro of goleiros) {
    const time = times.find(t => t.id === goleiro.time_atual);

    const eventos: {
      minutosJogados: number;
      golsSofridos: { minuto: number }[];
      minutoEntrada: number;
      minutoSaida: number;
    }[] = [];

    for (const p of encerradas) {
      const todosEsc = [
        ...p.escalacao_casa.map(e => ({ ...e })),
        ...p.escalacao_visitante.map(e => ({ ...e })),
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

      const golsSofridos: { minuto: number }[] = [];
      for (const g of p.gols) {
        if (g.goleiro_id !== goleiro.id) continue;
        if (g.minuto < minutoEntrada || g.minuto > minutoSaida) continue;
        golsSofridos.push({ minuto: g.minuto });
      }

      eventos.push({
        minutosJogados,
        golsSofridos: golsSofridos.sort((a, b) => a.minuto - b.minuto),
        minutoEntrada,
        minutoSaida,
      });
    }

    if (eventos.length === 0) continue;

    let minutosAcumulados = 0;
    let inicioCicloMin = 0;
    let maiorCiclo = 0;

    for (const ev of eventos) {
      if (ev.golsSofridos.length === 0) {
        minutosAcumulados += ev.minutosJogados;
      } else {
        let cursorLocal = ev.minutoEntrada;
        for (const gol of ev.golsSofridos) {
          const minutosAteGol = gol.minuto - cursorLocal;
          minutosAcumulados += Math.max(0, minutosAteGol);
          const duracaoCiclo = minutosAcumulados - inicioCicloMin;
          if (duracaoCiclo > maiorCiclo) maiorCiclo = duracaoCiclo;
          inicioCicloMin = minutosAcumulados;
          cursorLocal = gol.minuto;
        }
        const minutosRestantes = ev.minutoSaida - cursorLocal;
        minutosAcumulados += Math.max(0, minutosRestantes);
      }
    }
    // Ciclo em aberto (desde o último gol sofrido até o fim dos dados)
    const cicloAtualMin = minutosAcumulados - inicioCicloMin;
    if (cicloAtualMin > maiorCiclo) maiorCiclo = cicloAtualMin;

    resultados.push({
      jogador_id: goleiro.id,
      nome: goleiro.nome,
      time_id: goleiro.time_atual,
      timeSigla: time?.sigla ?? '—',
      maiorCiclo,
      cicloAtual: cicloAtualMin,
    });
  }

  return resultados;
}

// ── Suspensos para a próxima rodada ──────────────────────────────────────────
// Mesma lógica usada em Dados/Cartões: cartão vermelho ou 3º/6º/9º... amarelo
// recebido na última partida disputada pelo time = suspenso para o próximo jogo.
interface EventoCartaoResumo {
  partidaId: string;
  rodada: number;
  data: string;
}

interface SuspensoResumo {
  nome: string;
  tipo: 'Jogador' | 'Técnico';
  timeId: string;
  timeSigla: string;
  motivo: string;
}

function calcularSuspensos(
  encerradas: Partida[], times: Time[], jogadores: Jogador[], tecnicos: Tecnico[],
): SuspensoResumo[] {
  const jogadorCartoes: Record<string, { amarelos: EventoCartaoResumo[]; vermelhos: EventoCartaoResumo[] }> = {};
  const tecnicoCartoes: Record<string, { amarelos: EventoCartaoResumo[]; vermelhos: EventoCartaoResumo[] }> = {};

  for (const p of encerradas) {
    for (const c of p.cartoes) {
      const tipoStr = c.tipo as string;
      const tecnicoId = (c as { tecnico_id?: string }).tecnico_id;
      const evento: EventoCartaoResumo = { partidaId: p.id, rodada: p.rodada, data: p.data };

      if (tipoStr === 'amarelo') {
        if (!jogadorCartoes[c.jogador_id]) jogadorCartoes[c.jogador_id] = { amarelos: [], vermelhos: [] };
        jogadorCartoes[c.jogador_id].amarelos.push(evento);
      } else if (tipoStr === 'vermelho') {
        if (!jogadorCartoes[c.jogador_id]) jogadorCartoes[c.jogador_id] = { amarelos: [], vermelhos: [] };
        jogadorCartoes[c.jogador_id].vermelhos.push(evento);
      } else if (tipoStr === 'amarelo_tecnico' && tecnicoId) {
        if (!tecnicoCartoes[tecnicoId]) tecnicoCartoes[tecnicoId] = { amarelos: [], vermelhos: [] };
        tecnicoCartoes[tecnicoId].amarelos.push(evento);
      } else if (tipoStr === 'vermelho_tecnico' && tecnicoId) {
        if (!tecnicoCartoes[tecnicoId]) tecnicoCartoes[tecnicoId] = { amarelos: [], vermelhos: [] };
        tecnicoCartoes[tecnicoId].vermelhos.push(evento);
      }
    }
  }

  // Um cartão vermelho já suspende automaticamente na próxima partida — se
  // o jogador/técnico recebeu amarelo E vermelho na MESMA partida, esse
  // amarelo não deve contar para a contagem cumulativa (senão avançaria
  // indevidamente o ciclo de 3 em 3 mesmo já estando suspenso pelo vermelho).
  const removerAmarelosDaPartidaDoVermelho = (
    mapa: Record<string, { amarelos: EventoCartaoResumo[]; vermelhos: EventoCartaoResumo[] }>,
  ) => {
    for (const dados of Object.values(mapa)) {
      const partidasComVermelho = new Set(dados.vermelhos.map(v => v.partidaId));
      if (partidasComVermelho.size === 0) continue;
      dados.amarelos = dados.amarelos.filter(a => !partidasComVermelho.has(a.partidaId));
    }
  };
  removerAmarelosDaPartidaDoVermelho(jogadorCartoes);
  removerAmarelosDaPartidaDoVermelho(tecnicoCartoes);

  // Última partida disputada por cada time (por data, com rodada como desempate)
  const ultimaPartidaPorTime: Record<string, Partida> = {};
  for (const t of times) {
    const jogosDoTime = encerradas.filter(p => p.time_casa_id === t.id || p.time_visitante_id === t.id);
    if (jogosDoTime.length === 0) continue;
    const ultima = [...jogosDoTime].sort((a, b) => a.data.localeCompare(b.data) || a.rodada - b.rodada).pop()!;
    ultimaPartidaPorTime[t.id] = ultima;
  }

  const suspensos: SuspensoResumo[] = [];

  const avaliarSuspensao = (
    nome: string, tipo: 'Jogador' | 'Técnico', timeId: string, timeSigla: string,
    amarelos: EventoCartaoResumo[], vermelhos: EventoCartaoResumo[], ultimaPartida: Partida | undefined,
  ) => {
    if (!ultimaPartida) return;
    const totalAmarelos = amarelos.length;

    if (vermelhos.some(v => v.partidaId === ultimaPartida.id)) {
      suspensos.push({ nome, tipo, timeId, timeSigla, motivo: 'Cartão vermelho' });
      return;
    }

    if (totalAmarelos > 0 && totalAmarelos % 3 === 0) {
      const ordenados = [...amarelos].sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));
      const ultimoAmarelo = ordenados[ordenados.length - 1];
      if (ultimoAmarelo.partidaId === ultimaPartida.id) {
        suspensos.push({ nome, tipo, timeId, timeSigla, motivo: `${totalAmarelos}º amarelo` });
      }
    }
  };

  for (const t of times) {
    const ultimaPartida = ultimaPartidaPorTime[t.id];

    const jogadoresDoTime = jogadores.filter(j => j.time_atual === t.id);
    for (const j of jogadoresDoTime) {
      const eventos = jogadorCartoes[j.id];
      avaliarSuspensao(j.nome, 'Jogador', t.id, t.sigla, eventos?.amarelos ?? [], eventos?.vermelhos ?? [], ultimaPartida);
    }

    const tecnicoDoTime = tecnicos.find(tc => tc.time_atual === t.id && tc.ativo);
    if (tecnicoDoTime) {
      const eventos = tecnicoCartoes[tecnicoDoTime.id];
      avaliarSuspensao(tecnicoDoTime.nome, 'Técnico', t.id, t.sigla, eventos?.amarelos ?? [], eventos?.vermelhos ?? [], ultimaPartida);
    }
  }

  return suspensos.sort((a, b) => a.timeSigla.localeCompare(b.timeSigla) || a.nome.localeCompare(b.nome));
}

export default async function Home() {
  const [partidas, times, jogadores, tecnicos] = await Promise.all([
    getPartidas(), getTimes(), getJogadores(), getTecnicos(),
  ]);

  const dias = gerarDias(partidas);

  // ── Classificação (resumida) ──────────────────────────────────────────────
  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  // Base: pontos/vitórias/saldo geral (usado também para ordenar a tabela)
  const baseMap: Record<string, {
    time_id: string; pontos: number; jogos: number; vitorias: number;
    empates: number; derrotas: number; gols_pro: number; gols_contra: number;
  }> = {};
  times.forEach(t => { baseMap[t.id] = { time_id: t.id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 }; });

  for (const p of encerradas) {
    const c = baseMap[p.time_casa_id]; const v = baseMap[p.time_visitante_id];
    if (!c || !v) continue;
    c.jogos++; v.jogos++; c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
    v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
    if (p.placar_casa > p.placar_visitante) { c.vitorias++; c.pontos += 3; v.derrotas++; }
    else if (p.placar_casa < p.placar_visitante) { v.vitorias++; v.pontos += 3; c.derrotas++; }
    else { c.empates++; c.pontos++; v.empates++; v.pontos++; }
  }

  // Forma recente (últimos 5 resultados)
  const formaMap: Record<string, ('V' | 'E' | 'D')[]> = {};
  times.forEach(t => { formaMap[t.id] = []; });
  for (const p of [...encerradas].reverse()) {
    const add = (id: string, r: 'V' | 'E' | 'D') => { if (!formaMap[id]) formaMap[id] = []; if (formaMap[id].length < 5) formaMap[id].push(r); };
    if (p.placar_casa > p.placar_visitante) { add(p.time_casa_id, 'V'); add(p.time_visitante_id, 'D'); }
    else if (p.placar_casa < p.placar_visitante) { add(p.time_casa_id, 'D'); add(p.time_visitante_id, 'V'); }
    else { add(p.time_casa_id, 'E'); add(p.time_visitante_id, 'E'); }
  }

  // Desempenho como mandante / visitante (pontos, vitórias, saldo e última partida)
  interface LadoStats { pontos: number; vitorias: number; golsPro: number; golsContra: number; jogos: Partida[]; }
  const mandanteMap: Record<string, LadoStats> = {};
  const visitanteMap: Record<string, LadoStats> = {};
  times.forEach(t => {
    mandanteMap[t.id] = { pontos: 0, vitorias: 0, golsPro: 0, golsContra: 0, jogos: [] };
    visitanteMap[t.id] = { pontos: 0, vitorias: 0, golsPro: 0, golsContra: 0, jogos: [] };
  });

  for (const p of encerradas) {
    const mc = mandanteMap[p.time_casa_id];
    if (mc) {
      mc.golsPro += p.placar_casa; mc.golsContra += p.placar_visitante; mc.jogos.push(p);
      if (p.placar_casa > p.placar_visitante) { mc.vitorias++; mc.pontos += 3; }
      else if (p.placar_casa === p.placar_visitante) mc.pontos += 1;
    }
    const mv = visitanteMap[p.time_visitante_id];
    if (mv) {
      mv.golsPro += p.placar_visitante; mv.golsContra += p.placar_casa; mv.jogos.push(p);
      if (p.placar_visitante > p.placar_casa) { mv.vitorias++; mv.pontos += 3; }
      else if (p.placar_visitante === p.placar_casa) mv.pontos += 1;
    }
  }

  const ultimaPartida = (jogos: Partida[]) =>
    [...jogos].sort((a, b) => b.data.localeCompare(a.data) || b.rodada - a.rodada)[0] ?? null;

  // Posição como mandante / visitante — mesma lógica de ordenação usada na
  // tela Confrontos (pts desc, depois saldo desc), mas calculada isoladamente
  // para cada recorte (só entre times que já jogaram nessa condição).
  const posicaoMandante: Record<string, number> = {};
  [...times]
    .filter(t => mandanteMap[t.id].jogos.length > 0)
    .sort((a, b) => {
      const ma = mandanteMap[a.id]; const mb = mandanteMap[b.id];
      return mb.pontos - ma.pontos || (mb.golsPro - mb.golsContra) - (ma.golsPro - ma.golsContra);
    })
    .forEach((t, i) => { posicaoMandante[t.id] = i + 1; });

  const posicaoVisitante: Record<string, number> = {};
  [...times]
    .filter(t => visitanteMap[t.id].jogos.length > 0)
    .sort((a, b) => {
      const ma = visitanteMap[a.id]; const mb = visitanteMap[b.id];
      return mb.pontos - ma.pontos || (mb.golsPro - mb.golsContra) - (ma.golsPro - ma.golsContra);
    })
    .forEach((t, i) => { posicaoVisitante[t.id] = i + 1; });

  // Cards — mesmos 7 indicadores da tela Confrontos
  let totPart = 0, totManVit = 0, totEmp = 0, totVisVit = 0, totGols = 0, totGolsMan = 0, totGolsVis = 0;
  for (const p of encerradas) {
    totPart++;
    totGols += p.placar_casa + p.placar_visitante;
    totGolsMan += p.placar_casa; totGolsVis += p.placar_visitante;
    if (p.placar_casa > p.placar_visitante) totManVit++;
    else if (p.placar_casa < p.placar_visitante) totVisVit++;
    else totEmp++;
  }

  // Médias de gols (mesma lógica da tela Dados: total ÷ partidas)
  const formatarMedia = (v: number) =>
    totPart > 0 ? (v / totPart).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const mediaGeral = formatarMedia(totGols);
  const mediaGolsMandante = formatarMedia(totGolsMan);
  const mediaGolsVisitante = formatarMedia(totGolsVis);

  // Suspensos para a próxima rodada
  const suspensos = calcularSuspensos(encerradas, times, jogadores, tecnicos);

  // Top 5 Placares mais frequentes
  const placarMap: Record<string, { count: number; vitVisitante: number; empates: number }> = {};
  for (const p of encerradas) {
    const casaVenceu = p.placar_casa > p.placar_visitante;
    const visVenceu = p.placar_visitante > p.placar_casa;
    const empate = p.placar_casa === p.placar_visitante;
    const [a, b] = casaVenceu ? [p.placar_casa, p.placar_visitante] : [p.placar_visitante, p.placar_casa];
    const key = `${a}x${b}`;
    if (!placarMap[key]) placarMap[key] = { count: 0, vitVisitante: 0, empates: 0 };
    placarMap[key].count++;
    if (visVenceu) placarMap[key].vitVisitante++;
    if (empate) placarMap[key].empates++;
  }
  const top5Placares = Object.entries(placarMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([placar, d]) => ({
      placar: placar.replace('x', '\u00d7'),
      count: d.count,
      vitVisitante: d.vitVisitante,
      isEmpate: d.empates === d.count,
    }));

  // Top 5 Artilheiros / Assistências (só gols válidos: exclui contra e pênaltis não convertidos)
  const artMap: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};
  const assistMap: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};
  for (const p of encerradas) {
    for (const g of p.gols) {
      const tipoStr = g.tipo as string;
      if (tipoStr === 'contra' || tipoStr === 'penalti_perdido' || tipoStr === 'penalti_defendido') continue;
      if (!artMap[g.jogador_id]) artMap[g.jogador_id] = { jogador_id: g.jogador_id, time_id: g.time_id, quantidade: 0 };
      artMap[g.jogador_id].quantidade++;
      if (g.assistencia_id) {
        if (!assistMap[g.assistencia_id]) assistMap[g.assistencia_id] = { jogador_id: g.assistencia_id, time_id: g.time_id, quantidade: 0 };
        assistMap[g.assistencia_id].quantidade++;
      }
    }
  }
  const top5Artilheiros = Object.values(artMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  const top5Assist = Object.values(assistMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

  // Top 5 Maiores Pontuadores — soma do peso de cada gol/pênalti defendido na
  // pontuação da partida (mesmo critério usado em Dados/Artilharia e
  // Dados/Analítico). Ex: gol decisivo numa vitória "vale" mais do que um gol
  // de time que já vencia com folga.
  const pesoGols = calcularPesoGols(partidas, jogadores, times);
  const pontuacaoPorJogador = somaPesoGolsPorJogador(pesoGols);
  const top5Pontuadores = Object.entries(pontuacaoPorJogador)
    .map(([jogador_id, pontuacao]) => {
      const jog = jogadores.find(j => j.id === jogador_id);
      return { jogador_id, time_id: jog?.time_atual ?? '', pontuacao };
    })
    .filter(j => j.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, 5);

  // Estatísticas Opta (aba Stats) — usadas no índice Passes/Minuto e no SAV%.
  const statsOptaPorJogador = somaStatsOptaPorJogador(partidas);
  const golsSofridosPorJogador = calcularGolsSofridosPorJogador(partidas);

  // Minutos totais por jogador (mesma lógica usada em Dados/Analítico) —
  // usado para calcular os índices "Gols/90 min" e "Passes por Minuto" abaixo.
  const minutosPorJogador: Record<string, number> = {};
  for (const p of encerradas) {
    const todosEscalados = [
      ...p.escalacao_casa.map(e => ({ ...e })),
      ...p.escalacao_visitante.map(e => ({ ...e })),
    ];
    for (const esc of todosEscalados) {
      const mins = calcularMinutosJogador(esc.jogador_id, p, esc.titular);
      if (mins === 0 && !esc.titular) continue;
      minutosPorJogador[esc.jogador_id] = (minutosPorJogador[esc.jogador_id] ?? 0) + mins;
    }
  }

  // Top 5 Gols p/90 min — mesma lógica usada em Dados/Artilharia: gols ÷
  // minutos jogados × 90, considerando apenas jogadores com pelo menos 90
  // minutos em campo.
  const top5G90 = Object.values(artMap)
    .map(a => {
      const jog = jogadores.find(j => j.id === a.jogador_id);
      const minutos = minutosPorJogador[a.jogador_id] ?? 0;
      return {
        jogador_id: a.jogador_id,
        nome: jog?.nome ?? a.jogador_id,
        time_id: a.time_id,
        gols: a.quantidade,
        minutos,
        g90: minutos > 0 ? (a.quantidade / minutos) * 90 : 0,
      };
    })
    .filter(j => j.minutos >= 90 && j.gols > 0)
    .sort((a, b) => b.g90 - a.g90)
    .slice(0, 5);

  // Top 5 Passes por Minuto — Passes (P, lançados na aba Stats) ÷ minutos
  // jogados, sem converter para a base de 90 minutos. Considera apenas
  // jogadores com mais de 100 passes (P > 100), por enquanto, para evitar
  // amostras pequenas distorcerem o ranking.
  const top5PassesMinuto = jogadores
    .map(j => {
      const passes = statsOptaPorJogador[j.id]?.P ?? 0;
      const minutos = minutosPorJogador[j.id] ?? 0;
      const time = times.find(t => t.id === j.time_atual);
      return {
        jogador_id: j.id,
        nome: j.nome,
        time_id: j.time_atual,
        timeSigla: time?.sigla ?? '—',
        passes,
        minutos,
        indice: minutos > 0 ? passes / minutos : 0,
      };
    })
    .filter(j => j.passes > 100 && j.minutos > 0)
    .sort((a, b) => b.indice - a.indice)
    .slice(0, 5);

  // Ciclos dos goleiros (maior ciclo / ciclo atual) — base para dois Top 5.
  const ciclosGoleiros = calcularCiclosGoleiros(encerradas, jogadores, times);

  // Top 5 Goleiros (maior ciclo sem sofrer gol — recorde pessoal)
  const top5Ciclos = [...ciclosGoleiros].sort((a, b) => b.maiorCiclo - a.maiorCiclo).slice(0, 5);

  // Top 5 Goleiros (ciclo atual — em aberto, desde o último gol sofrido)
  const top5CicloAtual = [...ciclosGoleiros].sort((a, b) => b.cicloAtual - a.cicloAtual).slice(0, 5);

  // Top 5 Goleiros por SAV% — defesas (Sav, lançadas na aba Stats de cada
  // partida) ÷ (defesas + gols sofridos). Mesma fórmula usada em
  // Dados/Goleiros → "Aproveitamento (SAV%)". Aqui mostramos só o percentual.
  const top5SavPct = jogadores
    .filter(j => j.posicao === 'GOL')
    .map(j => {
      const sav = statsOptaPorJogador[j.id]?.Sav ?? 0;
      const golsSofridos = golsSofridosPorJogador[j.id] ?? 0;
      const den = sav + golsSofridos;
      const time = times.find(t => t.id === j.time_atual);
      return {
        jogador_id: j.id,
        nome: j.nome,
        time_id: j.time_atual,
        timeSigla: time?.sigla ?? '—',
        savPct: den > 0 ? (sav / den) * 100 : -1,
        den,
      };
    })
    .filter(g => g.den > 0)
    .sort((a, b) => b.savPct - a.savPct)
    .slice(0, 5);

  // Top 5 Técnicos por aproveitamento — só entre os que já dirigiram em mais
  // da metade das rodadas disputadas até aqui
  const totalRodadas = new Set(encerradas.map(p => p.rodada)).size;
  const limiar50 = Math.ceil(totalRodadas * 0.5);
  const tecnicoMap: Record<string, { tecnico_id: string; j: number; v: number; e: number }> = {};
  for (const p of encerradas) {
    const processar = (tecnicoId: string | null, isCasa: boolean) => {
      if (!tecnicoId) return;
      if (!tecnicoMap[tecnicoId]) tecnicoMap[tecnicoId] = { tecnico_id: tecnicoId, j: 0, v: 0, e: 0 };
      const r = tecnicoMap[tecnicoId];
      const gf = isCasa ? p.placar_casa : p.placar_visitante;
      const gc = isCasa ? p.placar_visitante : p.placar_casa;
      r.j++;
      if (gf > gc) r.v++; else if (gf === gc) r.e++;
    };
    processar(p.tecnico_casa_id, true);
    processar(p.tecnico_visitante_id, false);
  }
  const top5Tecnicos = Object.values(tecnicoMap)
    .map(r => ({ ...r, aproveitamento: r.j > 0 ? Math.round((r.v * 3 + r.e) / (r.j * 3) * 100) : 0 }))
    .filter(r => r.j >= limiar50)
    .sort((a, b) => b.aproveitamento - a.aproveitamento || b.v - a.v)
    .slice(0, 5);

  // Novas Contratações — 20 jogadores com a data de chegada (última
  // transferência registrada) mais recente. Ignora entradas cujo destino é o
  // pseudo-time "outros" (usado para marcar jogador inativo/transferido).
  interface NovaContratacao { jogador_id: string; nome: string; time_id: string; data: string; }
  const novasContratacoes: NovaContratacao[] = jogadores
    .map(j => {
      const transferencias = j.transferencias ?? [];
      if (transferencias.length === 0) return null;
      const ultima = [...transferencias].sort((a, b) => b.data.localeCompare(a.data))[0];
      if (!ultima || ultima.time_id === 'outros') return null;
      return { jogador_id: j.id, nome: j.nome, time_id: ultima.time_id, data: ultima.data };
    })
    .filter((x): x is NovaContratacao => x !== null)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 20);

  const tabela = Object.values(baseMap)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => {
      const mc = mandanteMap[t.time_id];
      const mv = visitanteMap[t.time_id];
      const ultMandante = ultimaPartida(mc.jogos);
      const ultVisitante = ultimaPartida(mv.jogos);
      return {
        time_id: t.time_id,
        posicao: i + 1,
        pontos: t.pontos,
        vitorias: t.vitorias,
        saldo: t.gols_pro - t.gols_contra,
        forma: formaMap[t.time_id] ?? [],
        mandante: {
          pontos: mc.pontos, vitorias: mc.vitorias, saldo: mc.golsPro - mc.golsContra,
          posicao: posicaoMandante[t.time_id] ?? null,
          ultima: ultMandante ? {
            placarCasa: ultMandante.placar_casa, placarVisitante: ultMandante.placar_visitante,
            adversarioSigla: times.find(tm => tm.id === ultMandante.time_visitante_id)?.sigla ?? ultMandante.time_visitante_id,
          } : null,
        },
        visitante: {
          pontos: mv.pontos, vitorias: mv.vitorias, saldo: mv.golsPro - mv.golsContra,
          posicao: posicaoVisitante[t.time_id] ?? null,
          ultima: ultVisitante ? {
            placarCasa: ultVisitante.placar_casa, placarVisitante: ultVisitante.placar_visitante,
            adversarioSigla: times.find(tm => tm.id === ultVisitante.time_casa_id)?.sigla ?? ultVisitante.time_casa_id,
          } : null,
        },
      };
    });

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <style>{`
        .resumo-top5-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 1rem;
          justify-content: flex-start;
        }
        @media (max-width: 480px) {
          .resumo-top5-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: .6rem;
          }
        }
        .resumo-contratacoes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: .6rem;
        }
        @media (max-width: 480px) {
          .resumo-contratacoes-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: .5rem;
          }
        }
      `}</style>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Painel</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Resumo</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.85rem' }}>
            Visão condensada do site — jogos dos próximos/últimos dias e classificação atual.
          </p>
        </div>
      </div>

      <div className="container">
        {/* 📅 Linha do tempo — 5 dias (D-2 até D+2) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📅 Próximos Jogos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.6rem' }}>
            {dias.map(dia => (
              <div key={dia.data} style={{
                background: dia.isHoje ? 'rgba(0,168,79,.08)' : 'var(--surface)',
                border: `1px solid ${dia.isHoje ? 'var(--verde)' : 'var(--border)'}`,
                borderRadius: 8, padding: '.6rem', minWidth: 0,
              }}>
                <div style={{ textAlign: 'center', marginBottom: '.5rem', paddingBottom: '.4rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: dia.isHoje ? 'var(--verde)' : 'var(--text)' }}>
                    {dia.label}
                  </div>
                  <div style={{ fontSize: '.62rem', color: dia.isHoje ? 'var(--verde)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: dia.isHoje ? 700 : 400 }}>
                    {dia.isHoje ? 'Hoje' : dia.diaSemana}
                  </div>
                </div>

                {dia.jogos.length === 0 ? (
                  <p style={{ fontSize: '.68rem', color: '#555', textAlign: 'center', padding: '.5rem 0' }}>—</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
                    {dia.jogos.map(p => {
                      const mostrarPlacar = p.status === 'encerrada' || p.status === 'ao_vivo';
                      const tCasa = times.find(t => t.id === p.time_casa_id);
                      const tVis = times.find(t => t.id === p.time_visitante_id);
                      return (
                        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '.15rem', fontSize: '.68rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>{p.hora}</span>
                            <span style={{ color: 'var(--amarelo)' }}>R{p.rodada}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>
                            <EscudoTime time={tCasa} size={16} />
                            <span style={{ fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                              {mostrarPlacar ? `${p.placar_casa}×${p.placar_visitante}` : '×'}
                            </span>
                            <EscudoTime time={tVis} size={16} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 🔢 Cards resumidos (os 7 indicadores da tela Confrontos, agrupados) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem' }}>

            {/* Coluna 1: Partidas + Vit. mandante | Empates | Vit. visitante */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.2 }}>Partidas</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>{totPart}</div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex' }}>
                {[
                  { l: 'Mandante', v: totManVit, cor: '#1a7a40' },
                  { l: 'Empates', v: totEmp, cor: 'var(--amarelo)' },
                  { l: 'Visitante', v: totVisVit, cor: '#a81a1a' },
                ].map((s, i, arr) => (
                  <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.2 }}>{s.l}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: s.cor, lineHeight: 1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 2: Total de gols + Gols mandante | Gols visitante */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.2 }}>Total de gols</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>
                  {totGols} <span style={{ fontFamily: 'Barlow,sans-serif', fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({mediaGeral})</span>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex' }}>
                {[
                  { l: 'Gols mandante', v: totGolsMan },
                  { l: 'Média Mandante', v: mediaGolsMandante },
                  { l: 'Gols visitante', v: totGolsVis },
                  { l: 'Média Visitante', v: mediaGolsVisitante },
                ].map((s, i, arr) => (
                  <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: '.6rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.15 }}>{s.l}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.25rem', color: 'var(--amarelo)', lineHeight: 1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>


        {/* 📊 Classificação (resumida) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📊 Classificação
          </h2>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
              <thead style={{ background: 'var(--surface2)' }}>
                <tr>
                  <th rowSpan={2} style={th('center', { borderBottom: '2px solid var(--verde)' })}>#</th>
                  <th rowSpan={2} style={th('left', { borderBottom: '2px solid var(--verde)' })}>Time</th>
                  <th colSpan={3} style={th('center', { borderBottom: '1px solid var(--border)' })}>Geral</th>
                  <th rowSpan={2} style={th('center', { borderBottom: '2px solid var(--verde)' })}>Forma</th>
                  <th colSpan={5} style={th('center', { borderBottom: '1px solid var(--border)', color: 'var(--verde)' })}>Como Mandante</th>
                  <th colSpan={5} style={th('center', { borderBottom: '1px solid var(--border)', color: 'var(--amarelo)' })}>Como Visitante</th>
                </tr>
                <tr>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>#</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Última</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>#</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Última</th>
                </tr>
              </thead>
              <tbody>
                {tabela.length === 0 && (
                  <tr><td colSpan={16} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</td></tr>
                )}
                {tabela.map((row, i) => {
                  const t = times.find(t => t.id === row.time_id);
                  const ultimaTexto = (u: { placarCasa: number; placarVisitante: number; adversarioSigla: string } | null) =>
                    u ? `${u.placarCasa}×${u.placarVisitante} | ${u.adversarioSigla}` : '—';
                  return (
                    <tr key={row.time_id} style={{ borderBottom: '1px solid #1e1e1e', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td style={{ padding: '.5rem .55rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{row.posicao}</td>
                      <td style={{ padding: '.5rem .55rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap' }}>
                          <EscudoTime time={t} size={20} />
                          <span style={{ fontWeight: 600 }}>{t?.sigla}</span>
                        </div>
                      </td>
                      {/* Geral */}
                      <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)' }}>{row.pontos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--libertadores)', fontWeight: 600 }}>{row.vitorias}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: row.saldo > 0 ? 'var(--libertadores)' : row.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                        {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                      </td>
                      {/* Forma */}
                      <td style={{ padding: '.5rem .3rem' }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                          {row.forma.length === 0
                            ? <span style={{ fontSize: '.68rem', color: '#444' }}>—</span>
                            : row.forma.map((r, fi) => (
                              <span key={fi} style={{ width: 14, height: 14, borderRadius: 3, background: formaColor[r], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>{r}</span>
                            ))
                          }
                        </div>
                      </td>
                      {/* Mandante */}
                      <td style={{ textAlign: 'center', color: 'var(--verde)', fontWeight: 600 }}>{row.mandante.pontos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.mandante.posicao ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{row.mandante.vitorias}</td>
                      <td style={{ textAlign: 'center', color: row.mandante.saldo > 0 ? 'var(--libertadores)' : row.mandante.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                        {row.mandante.saldo > 0 ? `+${row.mandante.saldo}` : row.mandante.saldo}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ultimaTexto(row.mandante.ultima)}</td>
                      {/* Visitante */}
                      <td style={{ textAlign: 'center', color: 'var(--amarelo)', fontWeight: 600 }}>{row.visitante.pontos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.visitante.posicao ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{row.visitante.vitorias}</td>
                      <td style={{ textAlign: 'center', color: row.visitante.saldo > 0 ? 'var(--libertadores)' : row.visitante.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                        {row.visitante.saldo > 0 ? `+${row.visitante.saldo}` : row.visitante.saldo}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ultimaTexto(row.visitante.ultima)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 🚫 Suspensos para a próxima rodada */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🚫 Suspensos para a Próxima Rodada
          </h2>
          {suspensos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Ninguém suspenso no momento.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
              {suspensos.map((s, i) => {
                const time = times.find(t => t.id === s.timeId);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '.5rem',
                    background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)',
                    borderRadius: 8, padding: '.5rem .75rem', minWidth: 170,
                  }}>
                    <EscudoTime time={time} size={26} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        {s.tipo === 'Técnico' && <span style={{ fontSize: '.78rem' }}>🧑‍💼</span>}
                        {s.nome}
                      </div>
                      <div style={{ fontSize: '.66rem', color: 'var(--rebaixamento)' }}>{s.timeSigla} · {s.motivo}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 🏅 Top 5 */}
        <section style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🏅 Top 5
          </h2>
          <div className="resumo-top5-grid">

            {/* Top 5 Placares */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--amarelo)', marginBottom: '.75rem' }}>🏆 Top 5 Placares</h3>
              {top5Placares.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Placares.map((d, i) => (
                  <div key={d.placar} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.3rem' }}>{d.placar}</span>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--verde)' }}>{d.count}×</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)' }}>{d.isEmpate ? 'Empate' : `${d.vitVisitante} vit. visitante`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Artilheiros */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--amarelo)', marginBottom: '.75rem' }}>⚽ Top 5 Artilheiros</h3>
              {top5Artilheiros.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Artilheiros.map((a, i) => {
                  const jog = jogadores.find(j => j.id === a.jogador_id);
                  const time = times.find(t => t.id === a.time_id);
                  return (
                    <div key={a.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{jog?.nome ?? a.jogador_id}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--amarelo)' }}>{a.quantidade}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Maiores Pontuadores */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: '.75rem' }}>⚖️ Top 5 Pontuadores</h3>
              {top5Pontuadores.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Pontuadores.map((a, i) => {
                  const jog = jogadores.find(j => j.id === a.jogador_id);
                  const time = times.find(t => t.id === a.time_id);
                  return (
                    <div key={a.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{jog?.nome ?? a.jogador_id}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#a78bfa' }}>
                        {a.pontuacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Gols p/90 min */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--amarelo)', marginBottom: '.75rem' }}>⚡ Top 5 Gols p/90 min</h3>
              {top5G90.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5G90.map((g, i) => {
                  const time = times.find(t => t.id === g.time_id);
                  return (
                    <div key={g.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{g.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--amarelo)' }}>
                        {g.g90.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Assistências */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#60a5fa', marginBottom: '.75rem' }}>🎯 Top 5 Assistências</h3>
              {top5Assist.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Assist.map((a, i) => {
                  const jog = jogadores.find(j => j.id === a.jogador_id);
                  const time = times.find(t => t.id === a.time_id);
                  return (
                    <div key={a.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{jog?.nome ?? a.jogador_id}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#60a5fa' }}>{a.quantidade}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Passes/Minuto */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: '.75rem' }}>📨 Top 5 Passes/Minuto</h3>
              {top5PassesMinuto.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5PassesMinuto.map((g, i) => {
                  const time = times.find(t => t.id === g.time_id);
                  return (
                    <div key={g.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{g.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#a78bfa' }}>
                        {g.indice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Goleiros (Maior Ciclo) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--verde)', marginBottom: '.75rem' }}>🧤 Top 5 Goleiros (Maior Ciclo)</h3>
              {top5Ciclos.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Ciclos.map((g, i) => {
                  const time = times.find(t => t.id === g.time_id);
                  return (
                    <div key={g.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{g.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--verde)' }}>{g.maiorCiclo}&apos;</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Goleiros (Ciclo Atual) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--verde)', marginBottom: '.75rem' }}>🥅 Top 5 Goleiros (Ciclo Atual)</h3>
              {top5CicloAtual.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5CicloAtual.map((g, i) => {
                  const time = times.find(t => t.id === g.time_id);
                  return (
                    <div key={g.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{g.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--verde)' }}>{g.cicloAtual}&apos;</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Goleiros (SAV%) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--verde)', marginBottom: '.75rem' }}>🥅 Top 5 Goleiros (SAV%)</h3>
              {top5SavPct.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5SavPct.map((g, i) => {
                  const time = times.find(t => t.id === g.time_id);
                  return (
                    <div key={g.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={time} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{g.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--verde)' }}>
                        {g.savPct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Técnicos (%) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: '.75rem' }}>🧑‍💼 Top 5 Técnicos</h3>
              {top5Tecnicos.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados suficientes.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {top5Tecnicos.map((r, i) => {
                  const tec = tecnicos.find(t => t.id === r.tecnico_id);
                  const timeAtual = tec?.time_atual ? times.find(t => t.id === tec.time_atual) : undefined;
                  return (
                    <div key={r.tecnico_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      <EscudoTime time={timeAtual} size={20} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{tec?.nome ?? r.tecnico_id}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#a78bfa' }}>{r.aproveitamento}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* 📌 Legenda dos critérios usados em alguns cards do Top 5 */}
        <div style={{
          marginBottom: '2.5rem', padding: '1rem 1.25rem',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: '.72rem', color: 'var(--text-muted)',
          display: 'flex', flexDirection: 'column', gap: '.45rem',
        }}>
          <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: '.15rem' }}>
            Critérios de alguns Top 5
          </p>
          <span><strong style={{ color: '#a78bfa' }}>⚖️ Pontuadores</strong> — soma do peso de cada gol na pontuação da partida</span>
          <span><strong style={{ color: 'var(--amarelo)' }}>⚡ Gols p/90 min</strong> — só jogadores com pelo menos 90 minutos em campo</span>
          <span><strong style={{ color: '#a78bfa' }}>📨 Passes/Minuto</strong> — passes ÷ minutos jogados · só jogadores com mais de 100 passes</span>
          <span><strong style={{ color: 'var(--verde)' }}>🥅 Goleiros (Ciclo Atual)</strong> — minutos sem sofrer gol desde o último gol sofrido (ciclo em aberto)</span>
          <span><strong style={{ color: 'var(--verde)' }}>🥅 Goleiros (SAV%)</strong> — defesas ÷ (defesas + gols sofridos), lançadas na aba Stats</span>
          <span><strong style={{ color: '#a78bfa' }}>🧑‍💼 Técnicos</strong> — só entre quem dirigiu {limiar50}+ partidas (mais da metade das {totalRodadas} rodadas)</span>
        </div>

        {/* 🆕 Novas Contratações */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🆕 Novas Contratações
          </h2>
          {novasContratacoes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhuma contratação registrada.</p>
          ) : (
            <div className="resumo-contratacoes-grid">
              {novasContratacoes.map(c => {
                const time = times.find(t => t.id === c.time_id);
                return (
                  <div key={`${c.jogador_id}-${c.data}`} style={{
                    display: 'flex', alignItems: 'center', gap: '.6rem',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '.55rem .75rem',
                  }}>
                    <EscudoTime time={time} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.nome}
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                        {time?.sigla ?? c.time_id} · {formatarData(c.data)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
