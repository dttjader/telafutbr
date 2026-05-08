import { getArtilharia, getTime } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import styles from './page.module.css';

export default function ArtilhariaPage() {
  const artilheiros = getArtilharia();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className="container">
          <p className={styles.heroSub}>Goleadores da Competição</p>
          <h1 className={styles.heroTitle}>Artilharia</h1>
        </div>
      </div>

      <div className="container">
        <div className={styles.lista}>
          {artilheiros.length === 0 && (
            <p style={{ color: 'var(--texto-suave)', textAlign: 'center', padding: '3rem' }}>
              Nenhum gol registrado ainda.
            </p>
          )}
          {artilheiros.map((a, i) => {
            const time = getTime(a.time);
            const isPrimeiro = i === 0;
            return (
              <div key={`${a.jogador}-${a.time}`} className={`${styles.item} ${isPrimeiro ? styles.primeiro : ''}`}>
                <div className={styles.rank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                </div>
                <EscudoTime timeId={a.time} size={isPrimeiro ? 'md' : 'sm'} />
                <div className={styles.info}>
                  <div className={styles.nome}>{a.jogador}</div>
                  <div className={styles.time}>{time?.nome}</div>
                </div>
                <div className={styles.gols}>
                  <span className={styles.golsNum}>{a.quantidade}</span>
                  <span className={styles.golsLabel}>{a.quantidade === 1 ? 'gol' : 'gols'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
