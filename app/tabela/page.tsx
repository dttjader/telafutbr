import { calcularTabela, getTimes, getPartidas } from '@/lib/data';
import { getConfig, zonaClassificacao } from '@/lib/config';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

export default async function TabelaPage() {
  const [tabela, times, todasPartidas, config] = await Promise.all([
    calcularTabela(), getTimes(), getPartidas(), Promise.resolve(getConfig()),
  ]);

  const totalTimes = times.length || 20;

  // Últimas 5 datas com partidas encerradas
  const encerradas = todasPartidas
    .filter(p => p.status === 'encerrada')
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  const ultimas5Datas = [...new Set(encerradas.map(p => p.data))].slice(0, 5);
  const timesRecentes = new Set(
    encerradas.filter(p => ultimas5Datas.includes(p.data))
      .flatMap(p => [p.time_casa_id, p.time_visitante_id])
  );

  // Forma recente (últimas 5 por time)
  const formaTime: Record<string, string[]> = {};
  times.forEach(t => { formaTime[t.id] = []; });
  for (const p of encerradas) {
    const add = (id: string, r: string) => {
      if (!formaTime[id]) formaTime[id] = [];
      if (formaTime[id].length < 5) formaTime[id].push(r);
    };
    if (p.placar_casa > p.placar_visitante) { add(p.time_casa_id, 'V'); add(p.time_visitante_id, 'D'); }
    else if (p.placar_casa < p.placar_visitante) { add(p.time_casa_id, 'D'); add(p.time_visitante_id, 'V'); }
    else { add(p.time_casa_id, 'E'); add(p.time_visitante_id, 'E'); }
  }
  const formaColor: Record<string, string> = { V: 'var(--libertadores)', E: '#f59e0b', D: 'var(--rebaixamento)' };

  // Cores e labels por zona
  const zonaColor: Record<string, string> = {
    'libertadores': 'var(--libertadores)',
    'libertadores-direta': '#a3e635',
    'sulamericana': 'var(--sulamericana)',
    'sulamericana-direta': '#60a5fa',
    'rebaixamento': 'var(--rebaixamento)',
    'neutro': 'transparent',
  };
  const zonaRowBg: Record<string, string> = {
    'libertadores': 'rgba(34,197,94,.04)',
    'libertadores-direta': 'rgba(163,230,53,.04)',
    'sulamericana': 'rgba(59,130,246,.03)',
    'sulamericana-direta': 'rgba(96,165,250,.03)',
    'rebaixamento': 'rgba(239,68,68,.04)',
    'neutro': 'transparent',
  };

  const vagasLib = config.libertadores.vagas_tabela;
  const vagasSul = config.sulamericana.vagas_tabela;
  const vagasReb = config.rebaixamento.vagas;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Classificação Geral</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Tabela</h1>
        </div>
      </div>

      <div className="container">
        {/* Legenda */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--libertadores)', display: 'inline-block' }} />
            Libertadores ({vagasLib} vagas tabela)
          </span>
          {config.libertadores.vagas_diretas.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} />
              Libertadores (vaga direta)
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--sulamericana)', display: 'inline-block' }} />
            Sul-Americana ({vagasSul} vagas tabela)
          </span>
          {config.sulamericana.vagas_diretas.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
              Sul-Americana (vaga direta)
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rebaixamento)', display: 'inline-block' }} />
            Rebaixamento ({vagasReb} times)
          </span>
          {ultimas5Datas.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              <span style={{ width: 10, height: 10, background: 'rgba(255,223,0,.25)', border: '1px solid rgba(255,223,0,.5)', borderRadius: 2, display: 'inline-block' }} />
              Jogou nas últimas {ultimas5Datas.length} datas
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
            <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
              <tr>
                {['#', 'Time', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Forma'].map(h => (
                  <th key={h} style={{ padding: '.7rem .9rem', textAlign: h === 'Time' ? 'left' : 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.9rem', letterSpacing: '.08em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map(row => {
                const zona = zonaClassificacao(row.posicao, row.time_id, config, totalTimes);
                const t = times.find(t => t.id === row.time_id);
                const isRecente = timesRecentes.has(row.time_id);
                const forma = formaTime[row.time_id] ?? [];
                const vagaDireta = [...config.libertadores.vagas_diretas, ...config.sulamericana.vagas_diretas]
                  .find(v => v.time_id === row.time_id);

                return (
                  <tr key={row.time_id} style={{
                    borderBottom: '1px solid #1e1e1e',
                    background: isRecente
                      ? zonaRowBg[zona].replace(',.04)', ',.08)').replace(',.03)', ',.06)')
                      : zonaRowBg[zona],
                  }}>
                    {/* Posição */}
                    <td style={{ padding: '.6rem .9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <span style={{ width: 3, height: 22, borderRadius: 2, background: zonaColor[zona], display: 'inline-block' }} />
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem' }}>{row.posicao}</span>
                      </div>
                    </td>
                    {/* Time */}
                    <td style={{ padding: '.6rem .9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
                        <EscudoTime time={t ?? undefined} size={30} />
                        <span style={{ fontWeight: 600 }}>{t?.nome}</span>
                        {isRecente && (
                          <span style={{ fontSize: '.6rem', background: 'rgba(255,223,0,.15)', color: 'var(--amarelo)', padding: '.1rem .35rem', borderRadius: 3, fontWeight: 700 }}>RECENTE</span>
                        )}
                        {vagaDireta && (
                          <span title={vagaDireta.motivo} style={{ fontSize: '.6rem', background: 'rgba(163,230,53,.15)', color: '#a3e635', padding: '.1rem .35rem', borderRadius: 3, fontWeight: 700, cursor: 'help' }}>
                            ⭐ VAGA DIRETA
                          </span>
                        )}
                      </div>
                      {vagaDireta && (
                        <div style={{ fontSize: '.68rem', color: '#a3e635', opacity: .8, marginTop: '.1rem', paddingLeft: 36 }}>
                          {vagaDireta.motivo}
                        </div>
                      )}
                    </td>
                    {/* Stats */}
                    <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: 'var(--amarelo)', padding: '.6rem .9rem' }}>{row.pontos}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.jogos}</td>
                    <td style={{ textAlign: 'center', color: 'var(--libertadores)', fontWeight: 600, padding: '.6rem .9rem' }}>{row.vitorias}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.empates}</td>
                    <td style={{ textAlign: 'center', color: 'var(--rebaixamento)', fontWeight: 600, padding: '.6rem .9rem' }}>{row.derrotas}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.gols_pro}</td>
                    <td style={{ textAlign: 'center', padding: '.6rem .9rem' }}>{row.gols_contra}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, padding: '.6rem .9rem', color: row.saldo > 0 ? 'var(--libertadores)' : row.saldo < 0 ? 'var(--rebaixamento)' : 'inherit' }}>
                      {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                    </td>
                    {/* Forma */}
                    <td style={{ textAlign: 'center', padding: '.6rem .5rem' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {forma.length === 0
                          ? <span style={{ fontSize: '.7rem', color: '#444' }}>—</span>
                          : forma.map((r, i) => (
                            <span key={i} style={{ width: 16, height: 16, borderRadius: 3, background: formaColor[r], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{r}</span>
                          ))
                        }
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tabela.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhuma partida encerrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
