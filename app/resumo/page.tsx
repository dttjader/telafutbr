import { getPartidas, getTimes } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import { Partida } from '@/lib/types';

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

export default async function ResumoPage() {
  const [partidas, times] = await Promise.all([
    getPartidas(), getTimes(),
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
          ultima: ultMandante ? {
            placarCasa: ultMandante.placar_casa, placarVisitante: ultMandante.placar_visitante,
            adversarioSigla: times.find(tm => tm.id === ultMandante.time_visitante_id)?.sigla ?? ultMandante.time_visitante_id,
          } : null,
        },
        visitante: {
          pontos: mv.pontos, vitorias: mv.vitorias, saldo: mv.golsPro - mv.golsContra,
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
                  <th colSpan={4} style={th('center', { borderBottom: '1px solid var(--border)', color: 'var(--verde)' })}>Como Mandante</th>
                  <th colSpan={4} style={th('center', { borderBottom: '1px solid var(--border)', color: 'var(--amarelo)' })}>Como Visitante</th>
                </tr>
                <tr>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Última</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Pts</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>V</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>SG</th>
                  <th style={th('center', { borderBottom: '2px solid var(--verde)' })}>Última</th>
                </tr>
              </thead>
              <tbody>
                {tabela.length === 0 && (
                  <tr><td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</td></tr>
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
                      <td style={{ textAlign: 'center' }}>{row.mandante.vitorias}</td>
                      <td style={{ textAlign: 'center', color: row.mandante.saldo > 0 ? 'var(--libertadores)' : row.mandante.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                        {row.mandante.saldo > 0 ? `+${row.mandante.saldo}` : row.mandante.saldo}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ultimaTexto(row.mandante.ultima)}</td>
                      {/* Visitante */}
                      <td style={{ textAlign: 'center', color: 'var(--amarelo)', fontWeight: 600 }}>{row.visitante.pontos}</td>
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
      </div>
    </div>
  );
}
