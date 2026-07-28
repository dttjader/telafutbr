import { getPartidas, getTimes, getJogadores, getTecnicos } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import { Partida, Jogador, Time } from '@/lib/types';

// Página oculta — não aparece em nenhum menu, acessada apenas via /resumo.
// Serve como painel resumido, alimentado por versões condensadas das outras
// telas do site. Novas seções devem ser adicionadas como <section> abaixo.
export const dynamic = 'force-dynamic';

interface DiaResumo {
  data: string;
  label: string;      // dd/mm
  diaSemana: string;   // seg., ter., ...
  isHoje: boolean;
  jogos: Partida[];
}

// Gera os 7 dias da linha do tempo: 3 no passado, hoje, 3 no futuro
function gerarDias(partidas: Partida[]): DiaResumo[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias: DiaResumo[] = [];
  for (let offset = -3; offset <= 3; offset++) {
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

// Maior ciclo de minutos sem sofrer gols de cada goleiro (mesma lógica de
// app/dados/goleiros, mas retornando só o recorde — usado no Top 5 do Resumo).
function calcularTopCiclos(encerradas: Partida[], jogadores: Jogador[], times: Time[], limite = 5) {
  const goleiros = jogadores.filter(j => j.posicao === 'GOL');
  const resultados: { jogador_id: string; nome: string; time_id: string; timeSigla: string; maiorCiclo: number }[] = [];

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

    resultados.push({ jogador_id: goleiro.id, nome: goleiro.nome, time_id: goleiro.time_atual, timeSigla: time?.sigla ?? '—', maiorCiclo });
  }

  return resultados.sort((a, b) => b.maiorCiclo - a.maiorCiclo).slice(0, limite);
}

export default async function ResumoPage() {
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

  // ── Top 5 (abaixo da Classificação) ───────────────────────────────────────

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

  // Top 5 Goleiros (maior ciclo sem sofrer gol)
  const top5Ciclos = calcularTopCiclos(encerradas, jogadores, times);

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
        {/* 📅 Linha do tempo — 7 dias */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📅 Próximos Jogos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.6rem' }}>
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

        {/* 🔢 Cards resumidos (os 7 indicadores da tela Confrontos) */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {[
              { l: 'Partidas', v: totPart },
              { l: 'Vit. mandante', v: totManVit, cor: '#1a7a40' },
              { l: 'Empates', v: totEmp },
              { l: 'Vit. visitante', v: totVisVit, cor: '#a81a1a' },
              { l: 'Total de gols', v: totGols },
              { l: 'Gols mandante', v: totGolsMan },
              { l: 'Gols visitante', v: totGolsVis },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginBottom: 3, lineHeight: 1.2 }}>{s.l}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: s.cor ?? 'var(--amarelo)', lineHeight: 1 }}>{s.v}</div>
              </div>
            ))}
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

        {/* 🏅 Top 5 */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🏅 Top 5
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 210px))', gap: '1rem', justifyContent: 'flex-start' }}>

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

            {/* Top 5 Técnicos (%) */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: '.4rem' }}>🧑‍💼 Top 5 Técnicos</h3>
              <p style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                Só entre quem dirigiu {limiar50}+ partidas (mais da metade das {totalRodadas} rodadas)
              </p>
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
      </div>
    </div>
  );
}
