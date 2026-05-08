import { calcularArtilharia, getJogadores, getTimes } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

export default function ArtilhariaPage() {
  const artilharia = calcularArtilharia();
  const jogadores = getJogadores();
  const times = getTimes();

  const nomeJog = (id: string) => jogadores.find(j => j.id === id)?.nome ?? id;
  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;

  const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Goleadores da Competição</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Artilharia</h1>
        </div>
      </div>

      <div className="container">
        {artilharia.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Nenhum gol registrado ainda.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', maxWidth: 680 }}>
          {artilharia.map((a, i) => {
            const isPrimeiro = i === 0;
            return (
              <div key={a.jogador_id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                background: isPrimeiro ? 'rgba(255,223,0,.04)' : 'var(--surface)',
                border: `1px solid ${isPrimeiro ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
                borderRadius: 10,
                transition: 'all .2s',
              }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', minWidth: 36, textAlign: 'center' }}>
                  {medalha(i)}
                </div>
                <EscudoTime timeId={a.time_id} size={isPrimeiro ? 48 : 36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1.1rem' : '1rem', color: 'var(--text)' }}>
                    {nomeJog(a.jogador_id)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                    {nomeTime(a.time_id)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2.2rem' : '1.8rem', color: 'var(--amarelo)', lineHeight: 1 }}>
                    {a.quantidade}
                  </span>
                  <span style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {a.quantidade === 1 ? 'gol' : 'gols'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
