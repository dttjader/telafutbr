import { getPartidas, getTimes } from '@/lib/data';
import { getConfig, zonaClassificacao } from '@/lib/config';
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

// Gera os 11 dias da linha do tempo: 5 no passado, hoje, 5 no futuro
function gerarDias(partidas: Partida[]): DiaResumo[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias: DiaResumo[] = [];
  for (let offset = -5; offset <= 5; offset++) {
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

const zonaColor: Record<string, string> = {
  libertadores: 'var(--libertadores)', 'libertadores-direta': '#a3e635',
  sulamericana: 'var(--sulamericana)', 'sulamericana-direta': '#60a5fa',
  rebaixamento: 'var(--rebaixamento)', neutro: 'transparent',
};
const zonaRowBg: Record<string, string> = {
  libertadores: 'rgba(34,197,94,.04)', 'libertadores-direta': 'rgba(163,230,53,.04)',
  sulamericana: 'rgba(59,130,246,.03)', 'sulamericana-direta': 'rgba(96,165,250,.03)',
  rebaixamento: 'rgba(239,68,68,.04)', neutro: 'transparent',
};

export default async function ResumoPage() {
  const [partidas, times, config] = await Promise.all([
    getPartidas(), getTimes(), getConfig(),
  ]);

  const dias = gerarDias(partidas);

  // ── Tabela de classificação (resumida) ────────────────────────────────────
  const encerradas = partidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));

  const map: Record<string, {
    time_id: string; pontos: number; jogos: number; vitorias: number;
    empates: number; derrotas: number; gols_pro: number; gols_contra: number;
  }> = {};
  times.forEach(t => { map[t.id] = { time_id: t.id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 }; });

  for (const p of encerradas) {
    const c = map[p.time_casa_id]; const v = map[p.time_visitante_id];
    if (!c || !v) continue;
    c.jogos++; v.jogos++; c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
    v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
    if (p.placar_casa > p.placar_visitante) { c.vitorias++; c.pontos += 3; v.derrotas++; }
    else if (p.placar_casa < p.placar_visitante) { v.vitorias++; v.pontos += 3; c.derrotas++; }
    else { c.empates++; c.pontos++; v.empates++; v.pontos++; }
  }

  const tabela = Object.values(map)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => ({ ...t, posicao: i + 1, saldo: t.gols_pro - t.gols_contra }));

  const totalTimes = times.length || 20;

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
        {/* 📅 Linha do tempo — 11 dias */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📅 Próximos Jogos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(120px, 1fr))', gap: '.6rem', overflowX: 'auto', paddingBottom: '.5rem' }}>
            {dias.map(dia => (
              <div key={dia.data} style={{
                background: dia.isHoje ? 'rgba(0,168,79,.08)' : 'var(--surface)',
                border: `1px solid ${dia.isHoje ? 'var(--verde)' : 'var(--border)'}`,
                borderRadius: 8, padding: '.6rem', minWidth: 120,
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  {['#', 'Time', 'Pts', 'J', 'V', 'E', 'D', 'SG'].map(h => (
                    <th key={h} style={{
                      padding: '.5rem .7rem', textAlign: h === 'Time' ? 'left' : 'center',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: '.8rem', letterSpacing: '.06em',
                      color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</td></tr>
                )}
                {tabela.map(row => {
                  const zona = zonaClassificacao(row.posicao, row.time_id, config, totalTimes);
                  const t = times.find(t => t.id === row.time_id);
                  return (
                    <tr key={row.time_id} style={{ borderBottom: '1px solid #1e1e1e', background: zonaRowBg[zona] }}>
                      <td style={{ padding: '.5rem .7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                          <span style={{ width: 3, height: 18, borderRadius: 2, background: zonaColor[zona], display: 'inline-block' }} />
                          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{row.posicao}</span>
                        </div>
                      </td>
                      <td style={{ padding: '.5rem .7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <EscudoTime time={t} size={22} />
                          <span style={{ fontWeight: 600 }}>{t?.nome}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem', color: 'var(--amarelo)' }}>{row.pontos}</td>
                      <td style={{ textAlign: 'center' }}>{row.jogos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--libertadores)' }}>{row.vitorias}</td>
                      <td style={{ textAlign: 'center' }}>{row.empates}</td>
                      <td style={{ textAlign: 'center', color: 'var(--rebaixamento)' }}>{row.derrotas}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: row.saldo > 0 ? 'var(--libertadores)' : row.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                        {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                      </td>
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
