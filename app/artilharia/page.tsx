import { calcularArtilharia, calcularRankingTecnicos, getJogadores, getTimes, getTecnicos } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

export default async function ArtilhariaPage() {
  const [artilharia, rankingTecnicos, jogadores, times, tecnicos] = await Promise.all([
    calcularArtilharia(), calcularRankingTecnicos(), getJogadores(), getTimes(), getTecnicos()
  ]);

  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;
  const nomeTecnico = (id: string) => tecnicos.find(t => t.id === id)?.nome ?? id;
  const timeDoTecnico = (id: string) => {
    const t = tecnicos.find(t => t.id === id);
    return t?.time_atual ? times.find(tm => tm.id === t.time_atual) : undefined;
  };
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  const heroStyle = { background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={heroStyle}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Artilharia & Técnicos</h1>
        </div>
      </div>

      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* ── ARTILHARIA ── */}
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
              ⚽ Artilharia
            </h2>
            {artilharia.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum gol registrado.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {artilharia.map((a, i) => {
                const time = times.find(t => t.id === a.time_id);
                const isPrimeiro = i === 0;
                return (
                  <div key={a.jogador_id} style={{
                    display: 'flex', alignItems: 'center', gap: '.85rem',
                    padding: isPrimeiro ? '1rem 1.25rem' : '.75rem 1rem',
                    background: isPrimeiro ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                    border: `1px solid ${isPrimeiro ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', minWidth: 32, textAlign: 'center' }}>{medalha(i)}</div>
                    <EscudoTime time={time ?? undefined} size={isPrimeiro ? 44 : 34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1rem' : '.9rem' }}>{nomeJog(a.jogador_id)}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{nomeTime(a.time_id)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2rem' : '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>{a.quantidade}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{a.quantidade === 1 ? 'gol' : 'gols'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RANKING TÉCNICOS ── */}
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
              🧑‍💼 Ranking de Técnicos
            </h2>
            {rankingTecnicos.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhuma partida com técnico registrado.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {rankingTecnicos.map((r, i) => {
                const time = timeDoTecnico(r.tecnico_id);
                const isPrimeiro = i === 0;
                return (
                  <div key={r.tecnico_id} style={{
                    display: 'flex', alignItems: 'center', gap: '.85rem',
                    padding: isPrimeiro ? '1rem 1.25rem' : '.75rem 1rem',
                    background: isPrimeiro ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                    border: `1px solid ${isPrimeiro ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', minWidth: 32, textAlign: 'center' }}>{medalha(i)}</div>
                    <EscudoTime time={time} size={isPrimeiro ? 44 : 34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1rem' : '.9rem' }}>{nomeTecnico(r.tecnico_id)}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', gap: '.75rem', marginTop: '.1rem' }}>
                        <span style={{ color: 'var(--libertadores)' }}>{r.v}V</span>
                        <span>{r.e}E</span>
                        <span style={{ color: 'var(--rebaixamento)' }}>{r.d}D</span>
                        <span>· {r.j} jogos</span>
                        <span>· {r.gp} gols pró</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2rem' : '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>{r.aproveitamento}%</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>aproveit.</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda aproveitamento */}
            {rankingTecnicos.length > 0 && (
              <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.75rem' }}>
                * Aproveitamento = (pontos obtidos / pontos possíveis) × 100
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
