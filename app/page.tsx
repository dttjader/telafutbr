import { getCampeonato, getRodadas } from '@/lib/data';
import { CardPartida } from '@/components/CardPartida';
import styles from './page.module.css';

export default function Home() {
  const rodadas = getRodadas();
  const { campeonato } = getCampeonato();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className="container">
          <p className={styles.heroSub}>Resultados & Jogos</p>
          <h1 className={styles.heroTitle}>Rodadas</h1>
        </div>
      </div>

      <div className="container">
        {rodadas.length === 0 && (
          <p style={{ color: 'var(--texto-suave)', textAlign: 'center', padding: '3rem' }}>
            Nenhuma rodada cadastrada ainda.
          </p>
        )}

        {rodadas.map(rodada => (
          <section key={rodada.numero} className={styles.rodada}>
            <div className={styles.rodadaHeader}>
              <h2 className={styles.rodadaTitulo}>
                {rodada.numero}ª Rodada
              </h2>
              <span className={`${styles.rodadaStatus} ${styles[rodada.status]}`}>
                {rodada.status === 'encerrada' ? 'Encerrada' :
                 rodada.status === 'em_andamento' ? 'Em Andamento' : 'Em Breve'}
              </span>
            </div>
            <div className={styles.grid}>
              {rodada.partidas.map(partida => (
                <CardPartida key={partida.id} partida={partida} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
