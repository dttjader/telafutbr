import { calcularArtilharia, calcularRankingTecnicos, getJogadores, getTimes, getTecnicos } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import { getPartidas } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ArtilhariaPage() {
  const [artilharia, rankingTecnicos, jogadores, times, tecnicos, partidas] = await Promise.all([
    calcularArtilharia(), calcularRankingTecnicos(), getJogadores(), getTimes(), getTecnicos(), getPartidas()
  ]);

  // Calcular assistências
  const assistMap: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};
  for (const p of partidas.filter(p => p.status === 'encerrada')) {
    for (const g of p.gols) {
      if (g.tipo === 'contra' || !g.assistencia_id) continue;
      if (!assistMap[g.assistencia_id]) assistMap[g.assistencia_id] = { jogador_id: g.assistencia_id, time_id: g.time_id, quantidade: 0 };
      assistMap[g.assistencia_id].quantidade++;
    }
  }
  const assistencias = Object.values(assistMap).sort((a, b) => b.quantidade - a.quantidade);

  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;
  const nomeTecnico = (id: string) => tecnicos.find(t => t.id === id)?.nome ?? id;
  const timeDoTecnico = (id: string) => {
    const t = tecnicos.find(t => t.id === id);
    return t?.time_atual ? times.find(tm => tm.id === t.time_atual) : undefined;
  };
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  const RankingCol = ({ titulo, dados, valorKey, valorLabel, cor }: {
    titulo: string;
    dados: { jogador_id: string; time_id: string; quantidade: number }[];
    valorKey?: string;
    valorLabel: string;
    cor: string;
  }) => (
    <div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {titulo}
      </h2>
      {dados.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum registro ainda.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {dados.map((a, i) => {
          const time = times.find(t => t.id === a.time_id);
          const isPrimeiro = i === 0;
          return (
            <div key={`${a.jogador_id}-${i}`} style={{
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
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2rem' : '1.6rem', color: cor, lineHeight: 1 }}>{a.quantidade}</div>
                <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{valorLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Artilharia & Rankings</h1>
        </div>
      </div>

      <div className="container">
        {/* Linha 1: Artilharia + Assistências */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <RankingCol titulo="⚽ Artilharia" dados={artilharia} valorLabel="gols" cor="var(--amarelo)" />
          <RankingCol titulo="🎯 Assistências" dados={assistencias} valorLabel="assist." cor="#60a5fa" />
        </div>

        {/* Linha 2: Ranking técnicos */}
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🧑‍💼 Ranking de Técnicos
          </h2>
          {rankingTecnicos.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhuma partida com técnico registrado.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {rankingTecnicos.slice(0, Math.ceil(rankingTecnicos.length / 2)).map((r, i) => {
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
                    <EscudoTime time={time ?? undefined} size={isPrimeiro ? 44 : 34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1rem' : '.9rem' }}>{nomeTecnico(r.tecnico_id)}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', gap: '.5rem' }}>
                        <span style={{ color: 'var(--libertadores)' }}>{r.v}V</span>
                        <span>{r.e}E</span>
                        <span style={{ color: 'var(--rebaixamento)' }}>{r.d}D</span>
                        <span>· {r.j}j</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {rankingTecnicos.slice(Math.ceil(rankingTecnicos.length / 2)).map((r, i) => {
                const idx = i + Math.ceil(rankingTecnicos.length / 2);
                const time = timeDoTecnico(r.tecnico_id);
                return (
                  <div key={r.tecnico_id} style={{
                    display: 'flex', alignItems: 'center', gap: '.85rem',
                    padding: '.75rem 1rem', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 10,
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', minWidth: 32, textAlign: 'center' }}>{medalha(idx)}</div>
                    <EscudoTime time={time ?? undefined} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{nomeTecnico(r.tecnico_id)}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', gap: '.5rem' }}>
                        <span style={{ color: 'var(--libertadores)' }}>{r.v}V</span>
                        <span>{r.e}E</span>
                        <span style={{ color: 'var(--rebaixamento)' }}>{r.d}D</span>
                        <span>· {r.j}j</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>{r.aproveitamento}%</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>aproveit.</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {rankingTecnicos.length > 0 && (
            <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.75rem' }}>
              * Aproveitamento = (pontos / pontos possíveis) × 100
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
