import { getTime } from '@/lib/data';
import styles from './EscudoTime.module.css';

interface Props {
  timeId: string;
  size?: 'sm' | 'md' | 'lg';
  showNome?: boolean;
}

export function EscudoTime({ timeId, size = 'md', showNome = false }: Props) {
  const time = getTime(timeId);
  if (!time) return null;

  return (
    <div className={`${styles.wrapper} ${styles[size]}`}>
      <div
        className={styles.escudo}
        style={{ background: `linear-gradient(135deg, ${time.cor_primaria} 0%, ${time.cor_secundaria || '#fff'} 100%)` }}
        title={time.nome}
      >
        <span className={styles.sigla}>{time.sigla}</span>
      </div>
      {showNome && <span className={styles.nome}>{time.nome}</span>}
    </div>
  );
}
