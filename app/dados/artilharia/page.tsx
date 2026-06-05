import { calcularArtilharia, getJogadores, getTimes, getTecnicos, getPartidas } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

export default async function ArtilhariaPage() {
  const [artilharia, jogadores, times, tecnicos, partidas] = await Promise.all([
    calcularArtilharia(), getJogadores(), getTimes(), getTecnicos(), getPartidas()
  ]);

  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const assistMap: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};
  for (const p of encerradas) {
    for (const g of p.gols) {
      if (g.tipo === 'contra' || !g.assistencia_id) continue;
      if (!assistMap[g.assistencia_id]) assistMap[g.assistencia_id] = { jogador_id: g.assistencia_id, time_id: g.time_id, quantidade: 0 };
      assistMap[g.assistencia_id].quantidade++;
    }
  }
  const assistencias = Object.values(assistMap).sort((a, b) => b.quantidade - a.quantidade);

  const statsJogMap: Record<string, { nome: string; time_id: string; gols: number; minutos: number }> = {};
  for (const j of jogadores) {
    statsJogMap[j.id] = { nome: j.nome, time_id: j.time_atual, gols: 0, minutos: 0 };
  }
  for (const p of encerradas) {
    const acr1 = p.acrescimo_primeiro ?? 0;
    const acr2 = p.acrescimo_segundo ?? 0;
    const totalP = 45 + acr1 + 45 + acr2;
    const todosEsc = [
      ...p.escalacao_casa.map((e: any) => ({ ...e })),
      ...p.escalacao_visitante.map((e: any) => ({ ...e })),
    ];
    for (const esc of todosEsc) {
      if (!statsJogMap[esc.jogador_id]) continue;
      const vermelho = p.cartoes.find((c: any) => c.jogador_id === esc.jogador_id && c.tipo === 'vermelho');
      const minVerm = vermelho?.minuto ?? Infinity;
      let mins: number;
      if (esc.titular) {
        const sub = p.substituicoes.find((s: any) => s.sai_id === esc.jogador_id);
        mins = Math.min(sub ? sub.minuto : totalP, minVerm, totalP);
      } else {
        const ent = p.substituicoes.find((s: any) => s.entra_id === esc.jogador_id);
        if (!ent) continue;
        const sai = p.substituicoes.find((s: any) => s.sai_id === esc.jogador_id);
        mins = Math.min(sai ? sai.minuto : totalP, minVerm, totalP) - ent.minuto;
      }
      statsJogMap[esc.jogador_id].minutos += mins;
    }
    for (const g of p.gols) {
      if (g.tipo === 'contra') continue;
      if (statsJogMap[g.jogador_id]) statsJogMap[g.jogador_id].gols++;
    }
  }
  const rankingG90 = Object.values(statsJogMap)
    .filter(j => j.minutos >= 90 && j.gols > 0)
    .map(j => ({ ...j, g90: (j.gols / j.minutos) * 90 }))
    .sort((a, b) => b.g90 - a.g90)
    .slice(0, 20);

  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;
  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  const RankingCol = ({ titulo, dados, valorLabel, cor }: {
    titulo: string;
    dados: { jogador_id: string; time_id: string; quantidade: number }[];
    valorLabel: string;
    cor: string;
  }) => (
    <div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {titulo}
      </h2>
      {dados.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum registro ainda.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {dados.slice(0, 30).map((a, i) => {
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
        {dados.length > 30 && (
          <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
            Exibindo apenas os 30 melhores.
          </p>
        )}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <RankingCol titulo="⚽ Artilharia" dados={artilharia} valorLabel="gols" cor="var(--amarelo)" />
          <RankingCol titulo="🎯 Assistências" dados={assistencias} valorLabel="assist." cor="#60a5fa" />
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            ⚡ Gols por 90 minutos <span style={{ fontSize: '.9rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>(mín. 90min jogados)</span>
          </h2>
          {rankingG90.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Sem dados suficientes.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '.6rem' }}>
            {rankingG90.map((j, i) => {
              const time = times.find(t => t.id === j.time_id);
              const maxG90 = rankingG90[0]?.g90 ?? 1;
              const isPrimeiro = i === 0;
              return (
                <div key={j.nome + i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '.75rem',
                  padding: isPrimeiro ? '1rem 1.25rem' : '.75rem 1rem',
                  background: isPrimeiro ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                  border: `1px solid ${isPrimeiro ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)', minWidth: 28 }}>{medalha(i)}</span>
                    <EscudoTime time={time ?? undefined} size={isPrimeiro ? 40 : 30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1rem' : '.9rem' }}>{j.nome}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{j.gols} gols · {j.minutos}min · {nomeTime(j.time_id)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2rem' : '1.6rem', color: 'var(--amarelo)', lineHeight: 1 }}>{j.g90.toFixed(2)}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>G/90</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 4, marginTop: '.4rem' }}>
                    <div style={{ width: `${(j.g90 / maxG90) * 100}%`, height: '100%', background: 'var(--amarelo)', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
      }
