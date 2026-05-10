import { getPartidas, getTimes, getEstadios } from '@/lib/data';
import { CardPartida } from '@/components/CardPartida';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [partidas, times, estadios] = await Promise.all([getPartidas(), getTimes(), getEstadios()]);
  const sorted = [...partidas].sort((a, b) => a.rodada - b.rodada || a.data.localeCompare(b.data));
  const rodadas = [...new Set(sorted.map(p => p.rodada))].sort((a, b) => a - b);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Resultados & Jogos</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', color: 'var(--text)' }}>Rodadas</h1>
        </div>
      </div>
      <div className="container">
        {rodadas.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            Nenhuma partida cadastrada ainda. <a href="/admin/partidas" style={{ color: 'var(--verde)' }}>Cadastrar →</a>
          </p>
        )}
        {rodadas.map(rod => (
          <section key={rod} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '.75rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>{rod}ª Rodada</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
              {sorted.filter(p => p.rodada === rod).map(p => (
                <CardPartida key={p.id} partida={p} times={times} estadios={estadios} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
