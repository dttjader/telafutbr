import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getPartidas, getTimes, getJogadores, getEstadios, getTecnicos,
  calcularPesoGols, somaPesoGolsPorJogador, somaStatsOptaPorJogador,
} from '@/lib/data';
import { getConfig, zonaClassificacao } from '@/lib/config';
import { EscudoTime } from '@/components/EscudoTime';
import { Partida, Jogador, Tecnico } from '@/lib/types';

// Página oculta — não aparece em nenhum menu, acessada via /time/{sigla}
// (ex: /time/vas → Vasco, /time/cor → Corinthians). O time é identificado
// pela SIGLA (não pelo id interno), então funciona mesmo para os poucos
// casos em que id e sigla divergem (ex: id "ATL" / sigla "CAM").
export const dynamic = 'force-dynamic';

const medalha = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`);

function formatarData(d: string): string {
  if (!d) return '—';
  const partes = d.split('-');
  if (partes.length !== 3) return d;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Mesma lógica de cálculo de minutos usada em Dados/Analítico, Dados/Times e Resumo
function calcularMinutos(jogadorId: string, partida: Partida, ehTitular: boolean): number {
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

const zonaColor: Record<string, string> = {
  libertadores: 'var(--libertadores)', 'libertadores-direta': '#a3e635',
  sulamericana: 'var(--sulamericana)', 'sulamericana-direta': '#60a5fa',
  rebaixamento: 'var(--rebaixamento)', neutro: 'var(--text-muted)',
};
const zonaLabel: Record<string, string> = {
  libertadores: 'Libertadores (tabela)', 'libertadores-direta': 'Libertadores (vaga direta)',
  sulamericana: 'Sul-Americana (tabela)', 'sulamericana-direta': 'Sul-Americana (vaga direta)',
  rebaixamento: 'Rebaixamento', neutro: 'Zona neutra',
};
const formaColor: Record<string, string> = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' };
const posLabel: Record<string, string> = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };

const th: React.CSSProperties = { padding: '.5rem .6rem', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.8rem', letterSpacing: '.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '.45rem .6rem', textAlign: 'center', fontSize: '.85rem' };
const sectionTitle: React.CSSProperties = { fontSize: '1.4rem', marginBottom: '.9rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' };
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem' };

export default async function TimePerfilPage({ params }: { params: Promise<{ sigla: string }> }) {
  const { sigla } = await params;
  const siglaAlvo = sigla.toUpperCase();

  const [partidas, times, jogadores, estadios, tecnicos, config] = await Promise.all([
    getPartidas(), getTimes(), getJogadores(), getEstadios(), getTecnicos(), getConfig(),
  ]);

  const time = times.find(t => (t.sigla ?? '').toUpperCase() === siglaAlvo) ?? times.find(t => (t.id ?? '').toUpperCase() === siglaAlvo);
  if (!time) notFound();

  const estadioTime = estadios.find(e => e.id === time.estadio_id);
  const totalTimes = times.length || 20;

  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  // ── Classificação geral (para achar posição/zona do time) ─────────────────
  interface LinhaTabela {
    time_id: string; pontos: number; jogos: number; vitorias: number; empates: number; derrotas: number;
    gols_pro: number; gols_contra: number;
  }
  const baseMap: Record<string, LinhaTabela> = {};
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
  const tabelaGeral = Object.values(baseMap)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => ({ ...t, posicao: i + 1, saldo: t.gols_pro - t.gols_contra }));
  const linhaTime = tabelaGeral.find(t => t.time_id === time.id) ?? null;
  const zona = linhaTime ? zonaClassificacao(linhaTime.posicao, time.id, config, totalTimes) : 'neutro';

  // ── Partidas do time (com contexto de casa/fora) ──────────────────────────
  const jogosTime = encerradas
    .filter(p => p.time_casa_id === time!.id || p.time_visitante_id === time!.id)
    .map(p => {
      const isCasa = p.time_casa_id === time!.id;
      const adversarioId = isCasa ? p.time_visitante_id : p.time_casa_id;
      const adversario = times.find(t => t.id === adversarioId);
      const meuPlacar = isCasa ? p.placar_casa : p.placar_visitante;
      const advPlacar = isCasa ? p.placar_visitante : p.placar_casa;
      const resultado: 'V' | 'E' | 'D' = meuPlacar > advPlacar ? 'V' : meuPlacar < advPlacar ? 'D' : 'E';
      const estadio = estadios.find(e => e.id === p.estadio_id);
      return { p, isCasa, adversario, meuPlacar, advPlacar, resultado, estadio };
    });

  const jogosOrdemRecente = [...jogosTime].sort((a, b) => b.p.data.localeCompare(a.p.data) || b.p.rodada - a.p.rodada);
  const forma = jogosOrdemRecente.slice(0, 5).map(j => j.resultado);
  const ultimaPartidaTime = jogosOrdemRecente[0]?.p ?? null;

  // Mandante x Visitante
  let mandPts = 0, mandV = 0, mandGP = 0, mandGC = 0, mandJ = 0;
  let visPts = 0, visV = 0, visGP = 0, visGC = 0, visJ = 0;
  for (const { isCasa, meuPlacar, advPlacar } of jogosTime) {
    if (isCasa) {
      mandJ++; mandGP += meuPlacar; mandGC += advPlacar;
      if (meuPlacar > advPlacar) { mandV++; mandPts += 3; } else if (meuPlacar === advPlacar) mandPts += 1;
    } else {
      visJ++; visGP += meuPlacar; visGC += advPlacar;
      if (meuPlacar > advPlacar) { visV++; visPts += 3; } else if (meuPlacar === advPlacar) visPts += 1;
    }
  }

  // ── Elenco atual e estatísticas por jogador ───────────────────────────────
  const elenco = jogadores.filter(j => j.time_atual === time!.id);

  interface StatJog {
    jogador: Jogador; partidas: number; titular: number; reserva: number; minutos: number;
    gols: number; gols_contra: number; gols_sofridos: number; assistencias: number;
    amarelos: number; vermelhos: number;
  }
  const statsMap: Record<string, StatJog> = {};
  elenco.forEach(j => { statsMap[j.id] = { jogador: j, partidas: 0, titular: 0, reserva: 0, minutos: 0, gols: 0, gols_contra: 0, gols_sofridos: 0, assistencias: 0, amarelos: 0, vermelhos: 0 }; });

  for (const { p, isCasa } of jogosTime) {
    const esc = isCasa ? p.escalacao_casa : p.escalacao_visitante;
    for (const e of esc) {
      const s = statsMap[e.jogador_id];
      if (!s) continue;
      const mins = calcularMinutos(e.jogador_id, p, e.titular);
      if (mins === 0 && !e.titular) continue;
      s.partidas++; s.minutos += mins;
      if (e.titular) s.titular++; else s.reserva++;
    }
    for (const g of p.gols) {
      const tipoStr = g.tipo as string;
      if (tipoStr === 'contra') {
        if (statsMap[g.jogador_id]) statsMap[g.jogador_id].gols_contra++;
        if (statsMap[g.goleiro_id]) statsMap[g.goleiro_id].gols_sofridos++;
      } else if (tipoStr !== 'penalti_perdido' && tipoStr !== 'penalti_defendido') {
        if (statsMap[g.jogador_id]) statsMap[g.jogador_id].gols++;
        if (g.assistencia_id && statsMap[g.assistencia_id]) statsMap[g.assistencia_id].assistencias++;
        if (statsMap[g.goleiro_id]) statsMap[g.goleiro_id].gols_sofridos++;
      }
    }
    for (const c of p.cartoes) {
      const s = statsMap[c.jogador_id];
      if (!s) continue;
      if (c.tipo === 'amarelo') s.amarelos++;
      else if (c.tipo === 'vermelho') s.vermelhos++;
    }
  }

  const listaJogadores = Object.values(statsMap).sort((a, b) => b.minutos - a.minutos);
  const artilheiros = [...listaJogadores].filter(s => s.gols > 0).sort((a, b) => b.gols - a.gols).slice(0, 10);
  const assistentes = [...listaJogadores].filter(s => s.assistencias > 0).sort((a, b) => b.assistencias - a.assistencias).slice(0, 10);

  // ── Peso dos gols na pontuação (só deste time) ────────────────────────────
  const pesoGolsGeral = calcularPesoGols(partidas, jogadores, times);
  const pesoGolsTime = pesoGolsGeral.filter(it => it.timeId === time!.id);
  const pontuacaoPorJogador = somaPesoGolsPorJogador(pesoGolsTime);
  const rankingPontuacao = Object.entries(pontuacaoPorJogador)
    .map(([jogador_id, pontuacao]) => ({ jogador_id, nome: jogadores.find(j => j.id === jogador_id)?.nome ?? jogador_id, pontuacao }))
    .filter(x => x.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, 10);

  // ── Cartões: ranking + pendurados/suspensos ───────────────────────────────
  const rankingAmarelos = [...listaJogadores].filter(s => s.amarelos > 0).sort((a, b) => b.amarelos - a.amarelos);
  const rankingVermelhos = [...listaJogadores].filter(s => s.vermelhos > 0).sort((a, b) => b.vermelhos - a.vermelhos);

  const pendurados = listaJogadores.filter(s => s.amarelos > 0 && s.amarelos % 3 === 2);
  const suspensos: { nome: string; motivo: string }[] = [];
  if (ultimaPartidaTime) {
    for (const c of ultimaPartidaTime.cartoes) {
      if (c.time_id !== time!.id) continue;
      const s = statsMap[c.jogador_id];
      if (!s) continue;
      if (c.tipo === 'vermelho') suspensos.push({ nome: s.jogador.nome, motivo: 'Cartão vermelho na última rodada' });
      else if (c.tipo === 'amarelo' && s.amarelos > 0 && s.amarelos % 3 === 0) suspensos.push({ nome: s.jogador.nome, motivo: `${s.amarelos}º cartão amarelo` });
    }
  }

  // ── Estatísticas Opta por jogador do elenco ───────────────────────────────
  const statsOptaGeral = somaStatsOptaPorJogador(partidas);
  const jogadoresComOpta = listaJogadores.filter(s => (statsOptaGeral[s.jogador.id]?.partidas_com_stats ?? 0) > 0);

  // ── Técnicos ligados ao time (atual + histórico) ──────────────────────────
  const tecnicosDoTime = tecnicos.filter(t => t.time_atual === time!.id || (t.historico ?? []).some(h => h.time_id === time!.id));
  interface TecStat { tecnico: Tecnico; j: number; v: number; e: number; d: number; }
  const tecStats: TecStat[] = tecnicosDoTime.map(t => {
    let j = 0, v = 0, e = 0, d = 0;
    for (const { p, isCasa, meuPlacar, advPlacar } of jogosTime) {
      const tecnicoDoJogo = isCasa ? p.tecnico_casa_id : p.tecnico_visitante_id;
      if (tecnicoDoJogo !== t.id) continue;
      j++;
      if (meuPlacar > advPlacar) v++; else if (meuPlacar < advPlacar) d++; else e++;
    }
    return { tecnico: t, j, v, e, d };
  }).filter(t => t.j > 0).sort((a, b) => b.j - a.j);

  // ── Substituições mais comuns ──────────────────────────────────────────────
  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const subMap: Record<string, { sai: string; entra: string; count: number }> = {};
  for (const { p } of jogosTime) {
    for (const s of p.substituicoes) {
      if (s.time_id !== time!.id) continue;
      const key = `${s.sai_id}->${s.entra_id}`;
      if (!subMap[key]) subMap[key] = { sai: s.sai_id, entra: s.entra_id, count: 0 };
      subMap[key].count++;
    }
  }
  const substituicoesComuns = Object.values(subMap).sort((a, b) => b.count - a.count).slice(0, 10);

  // ── Árbitros mais frequentes nas partidas do time ─────────────────────────
  const arbMap: Record<string, number> = {};
  for (const { p } of jogosTime) {
    const nome = p.arbitragem?.principal?.trim();
    if (!nome) continue;
    arbMap[nome] = (arbMap[nome] ?? 0) + 1;
  }
  const arbitrosFrequentes = Object.entries(arbMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ── Público ────────────────────────────────────────────────────────────────
  const jogosComPublicoCasa = jogosTime.filter(j => j.isCasa && j.p.publico > 0);
  const publicoTotalCasa = jogosComPublicoCasa.reduce((s, j) => s + j.p.publico, 0);
  const mediaPublicoCasa = jogosComPublicoCasa.length > 0 ? Math.round(publicoTotalCasa / jogosComPublicoCasa.length) : 0;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${time.cor_primaria || '#333333'}18 50%, #0a0a0a 100%)`,
        borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem',
      }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>
            Perfil do Time · Página não listada
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <EscudoTime time={time} size={64} />
            <div>
              <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1 }}>{time.nome}</h1>
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                <span>Sigla: <strong style={{ color: 'var(--text)' }}>{time.sigla}</strong></span>
                {estadioTime && <span>· {estadioTime.nome} — {estadioTime.cidade}/{estadioTime.estado}</span>}
                {linhaTime && (
                  <span style={{ color: zonaColor[zona], fontWeight: 700 }}>
                    · {linhaTime.posicao}º colocado · {zonaLabel[zona]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">

        {/* ── Classificação ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>📊 Classificação</h2>
          {!linhaTime ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '.75rem', marginBottom: '1rem' }}>
              {[
                { l: 'Posição', v: `${linhaTime.posicao}º`, cor: zonaColor[zona] },
                { l: 'Pontos', v: linhaTime.pontos, cor: 'var(--amarelo)' },
                { l: 'Jogos', v: linhaTime.jogos, cor: 'var(--text)' },
                { l: 'Vitórias', v: linhaTime.vitorias, cor: 'var(--libertadores)' },
                { l: 'Empates', v: linhaTime.empates, cor: 'var(--text-muted)' },
                { l: 'Derrotas', v: linhaTime.derrotas, cor: 'var(--rebaixamento)' },
                { l: 'Gols Pró', v: linhaTime.gols_pro, cor: 'var(--text)' },
                { l: 'Gols Contra', v: linhaTime.gols_contra, cor: 'var(--text)' },
                { l: 'Saldo', v: linhaTime.saldo > 0 ? `+${linhaTime.saldo}` : linhaTime.saldo, cor: linhaTime.saldo >= 0 ? 'var(--libertadores)' : 'var(--rebaixamento)' },
              ].map(s => (
                <div key={s.l} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.8rem', color: s.cor, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.3rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Forma recente:</span>
            {forma.length === 0 ? <span style={{ color: '#444' }}>—</span> : forma.map((r, i) => (
              <span key={i} style={{ width: 22, height: 22, borderRadius: 4, background: formaColor[r], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{r}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={card}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde)', marginBottom: '.6rem' }}>🏠 Como Mandante</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                {mandJ} jogo(s) · <strong style={{ color: 'var(--text)' }}>{mandPts} pts</strong> · {mandV} vitória(s) · saldo {mandGP - mandGC > 0 ? '+' : ''}{mandGP - mandGC}
              </p>
            </div>
            <div style={card}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--amarelo)', marginBottom: '.6rem' }}>✈️ Como Visitante</h3>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
                {visJ} jogo(s) · <strong style={{ color: 'var(--text)' }}>{visPts} pts</strong> · {visV} vitória(s) · saldo {visGP - visGC > 0 ? '+' : ''}{visGP - visGC}
              </p>
            </div>
          </div>
        </section>

        {/* ── Partidas (com público e árbitro) ──────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>🗓️ Partidas ({jogosOrdemRecente.length})</h2>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  {['Rodada', 'Data', 'Local', 'Adversário', 'Placar', 'Resultado', 'Estádio', 'Público', 'Árbitro'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {jogosOrdemRecente.map(({ p, isCasa, adversario, meuPlacar, advPlacar, resultado, estadio }, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={td}>{p.rodada}</td>
                    <td style={td}>{formatarData(p.data)}</td>
                    <td style={td}>{isCasa ? '🏠' : '✈️'}</td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <EscudoTime time={adversario} size={22} /> {adversario?.nome ?? '—'}
                      </div>
                    </td>
                    <td style={{ ...td, fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>
                      <Link href={`/partida/${p.id}`} style={{ color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)' }}>
                        {meuPlacar} × {advPlacar}
                      </Link>
                    </td>
                    <td style={{ ...td, color: formaColor[resultado], fontWeight: 700 }}>{resultado}</td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: '.75rem' }}>{estadio?.nome ?? '—'}</td>
                    <td style={{ ...td, color: 'var(--text-muted)' }}>{p.publico > 0 ? p.publico.toLocaleString('pt-BR') : '—'}</td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: '.75rem' }}>{p.arbitragem?.principal || '—'}</td>
                  </tr>
                ))}
                {jogosOrdemRecente.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {jogosComPublicoCasa.length > 0 && (
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.6rem' }}>
              Média de público como mandante: <strong style={{ color: 'var(--verde)' }}>{mediaPublicoCasa.toLocaleString('pt-BR')}</strong> ({jogosComPublicoCasa.length} jogo(s) com público registrado)
            </p>
          )}
        </section>

        {/* ── Artilharia e Assistências ─────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h2 style={sectionTitle}>⚽ Artilharia do Time</h2>
              {artilheiros.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Sem gols registrados.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {artilheiros.map((s, i) => (
                    <div key={s.jogador.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", minWidth: 26, textAlign: 'center', color: 'var(--text-muted)' }}>{medalha(i)}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{s.jogador.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--amarelo)' }}>{s.gols}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 style={sectionTitle}>🎯 Assistências do Time</h2>
              {assistentes.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Sem assistências registradas.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {assistentes.map((s, i) => (
                    <div key={s.jogador.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", minWidth: 26, textAlign: 'center', color: 'var(--text-muted)' }}>{medalha(i)}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{s.jogador.nome}</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#60a5fa' }}>{s.assistencias}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Pontuação dos jogadores sobre os gols ─────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>⚖️ Pontuação dos Gols na Pontuação da Partida</h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 760 }}>
            Soma do peso de cada gol/pênalti defendido do jogador nos pontos que o resultado deu ao time (mesmo critério usado em Dados/Artilharia e Dados/Analítico).
          </p>
          {rankingPontuacao.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Sem dados suficientes.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {rankingPontuacao.map((r, i) => (
                <div key={r.jogador_id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", minWidth: 26, textAlign: 'center', color: 'var(--text-muted)' }}>{medalha(i)}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '.85rem' }}>{r.nome}</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: '#a78bfa' }}>
                    {r.pontuacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Cartões ────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>🟨 Cartões</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '.6rem' }}>🟨 Ranking de Amarelos</h3>
              {rankingAmarelos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Nenhum.</p> : rankingAmarelos.map(s => (
                <div key={s.jogador.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', padding: '.35rem .6rem', background: 'var(--surface2)', borderRadius: 6, marginBottom: '.25rem' }}>
                  <span>{s.jogador.nome}</span><strong style={{ color: '#f59e0b' }}>{s.amarelos}</strong>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--rebaixamento)', marginBottom: '.6rem' }}>🟥 Ranking de Vermelhos</h3>
              {rankingVermelhos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Nenhum.</p> : rankingVermelhos.map(s => (
                <div key={s.jogador.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', padding: '.35rem .6rem', background: 'var(--surface2)', borderRadius: 6, marginBottom: '.25rem' }}>
                  <span>{s.jogador.nome}</span><strong style={{ color: 'var(--rebaixamento)' }}>{s.vermelhos}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '.6rem' }}>⚠️ Pendurados</h3>
              {pendurados.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Ninguém pendurado.</p> : pendurados.map(s => (
                <div key={s.jogador.id} style={{ fontSize: '.82rem', padding: '.35rem .6rem', background: 'var(--surface2)', borderRadius: 6, marginBottom: '.25rem' }}>
                  {s.jogador.nome} <span style={{ color: 'var(--text-muted)' }}>({s.amarelos} amarelos)</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--rebaixamento)', marginBottom: '.6rem' }}>🚫 Suspensos</h3>
              {suspensos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Ninguém suspenso.</p> : suspensos.map((s, i) => (
                <div key={i} style={{ fontSize: '.82rem', padding: '.35rem .6rem', background: 'rgba(239,68,68,.08)', borderRadius: 6, marginBottom: '.25rem' }}>
                  {s.nome} <span style={{ color: 'var(--rebaixamento)' }}>· {s.motivo}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Analítico (elenco) ────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>🔬 Analítico do Elenco</h2>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  {['Jogador', 'Pos.', 'P', 'T', 'R', 'Min', 'Gols', 'GC', 'GS', 'Ast.', '🟨', '🟥'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {listaJogadores.map((s, i) => (
                  <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{s.jogador.nome}{s.jogador.numero ? ` #${s.jogador.numero}` : ''}</td>
                    <td style={td}>{posLabel[s.jogador.posicao] ?? s.jogador.posicao}</td>
                    <td style={td}>{s.partidas || '—'}</td>
                    <td style={{ ...td, color: 'var(--verde)' }}>{s.titular || '—'}</td>
                    <td style={td}>{s.reserva || '—'}</td>
                    <td style={{ ...td, fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)' }}>{s.minutos || '—'}</td>
                    <td style={{ ...td, color: s.gols > 0 ? 'var(--libertadores)' : 'var(--text-muted)', fontWeight: s.gols > 0 ? 700 : 400 }}>{s.gols || '—'}</td>
                    <td style={{ ...td, color: s.gols_contra > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{s.gols_contra || '—'}</td>
                    <td style={{ ...td, color: s.jogador.posicao === 'GOL' ? (s.gols_sofridos > 0 ? 'var(--rebaixamento)' : 'var(--libertadores)') : 'var(--text-muted)' }}>
                      {s.jogador.posicao === 'GOL' ? s.gols_sofridos : '—'}
                    </td>
                    <td style={{ ...td, color: s.assistencias > 0 ? '#60a5fa' : 'var(--text-muted)' }}>{s.assistencias || '—'}</td>
                    <td style={{ ...td, color: s.amarelos > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{s.amarelos || '—'}</td>
                    <td style={{ ...td, color: s.vermelhos > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{s.vermelhos || '—'}</td>
                  </tr>
                ))}
                {listaJogadores.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogador no elenco atual.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Estatísticas Opta ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>📈 Estatísticas (Opta)</h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Soma das estatísticas lançadas na aba &quot;Stats&quot; de cada partida encerrada. Só entram jogadores com ao menos uma partida com estatística registrada.
          </p>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  {['Jogador', 'Jogos c/ Stats', 'S', 'SoT', 'SB', 'P', 'C', 'Crn', 'Tk', 'Off', 'FC', 'FS', 'Sav'].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {jogadoresComOpta.length === 0 ? (
                  <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma estatística Opta lançada para o elenco.</td></tr>
                ) : jogadoresComOpta.map((s, i) => {
                  const o = statsOptaGeral[s.jogador.id];
                  return (
                    <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{s.jogador.nome}</td>
                      <td style={{ ...td, color: 'var(--amarelo)' }}>{o.partidas_com_stats}</td>
                      <td style={td}>{o.S || '—'}</td>
                      <td style={td}>{o.SoT || '—'}</td>
                      <td style={td}>{o.SB || '—'}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{o.P || '—'}</td>
                      <td style={td}>{o.C || '—'}</td>
                      <td style={td}>{o.Crn || '—'}</td>
                      <td style={td}>{o.Tk || '—'}</td>
                      <td style={td}>{o.Off || '—'}</td>
                      <td style={td}>{o.FC || '—'}</td>
                      <td style={td}>{o.FS || '—'}</td>
                      <td style={{ ...td, color: o.Sav > 0 ? 'var(--verde)' : 'var(--text-muted)', fontWeight: o.Sav > 0 ? 700 : 400 }}>{o.Sav || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Técnicos ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>🧑‍💼 Técnicos</h2>
          {tecStats.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum técnico com partidas registradas por este time.</p> : (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                  <tr>{['Técnico', 'Status', 'J', 'V', 'E', 'D', 'Aproveitamento'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tecStats.map((r, i) => {
                    const aprov = r.j > 0 ? Math.round((r.v * 3 + r.e) / (r.j * 3) * 100) : 0;
                    return (
                      <tr key={r.tecnico.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>{r.tecnico.nome}</td>
                        <td style={td}>{r.tecnico.time_atual === time!.id ? <span style={{ color: 'var(--verde)' }}>Atual</span> : <span style={{ color: 'var(--text-muted)' }}>Passagem anterior</span>}</td>
                        <td style={td}>{r.j}</td>
                        <td style={{ ...td, color: 'var(--libertadores)' }}>{r.v}</td>
                        <td style={td}>{r.e}</td>
                        <td style={{ ...td, color: 'var(--rebaixamento)' }}>{r.d}</td>
                        <td style={{ ...td, fontWeight: 700, color: aprov >= 60 ? 'var(--libertadores)' : aprov >= 40 ? '#f59e0b' : 'var(--rebaixamento)' }}>{aprov}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Substituições mais comuns ─────────────────────────────────────── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={sectionTitle}>🔄 Substituições Mais Comuns</h2>
          {substituicoesComuns.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhuma substituição registrada.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {substituicoesComuns.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", minWidth: 26, textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}º</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>↓ {nomeJog(s.sai)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>↑ {nomeJog(s.entra)}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{s.count}×</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Árbitros ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '1rem' }}>
          <h2 style={sectionTitle}>🟢 Árbitros Mais Frequentes</h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Árbitros principais que mais apitaram partidas deste time. A equipe de arbitragem completa (assistentes, 4º árbitro, VAR) de cada jogo aparece na tabela de Partidas acima e na página de cada partida.
          </p>
          {arbitrosFrequentes.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum árbitro registrado.</p> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {arbitrosFrequentes.map(([nome, count]) => (
                <Link key={nome} href={`/dados/arbitros/${encodeURIComponent(nome)}`} style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem', textDecoration: 'none',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '.5rem .85rem',
                }}>
                  <span style={{ color: 'var(--text)', fontSize: '.85rem' }}>{nome}</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)' }}>{count}j</span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
