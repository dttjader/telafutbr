import Link from 'next/link';
import { Partida } from '@/lib/types';
import { getTime, formatDate, getStatusLabel, getStatusColor } from '@/lib/data';
import { EscudoTime } from './EscudoTime';
import styles from './CardPartida.module.css';

interface Props {
  partida: Partida;
}

export function CardPartida({ partida }: Props) {
  const timeCasa = getTime(partida.time_casa);
  const timeVisitante = getTime(partida.time_visitante);
  const isEncerrada = partida.status === 'encerrada';
  const isAoVivo = partida.status === 'ao_vivo';

  return (
    <Link href={`/partida/${partida.id}`} className={styles.card}>
      <div className={styles.top}>
        <span
          className={styles.status}
          style={{ color: getStatusColor(partida.status) }}
        >
          {isAoVivo && <span className={styles.dot} />}
          {getStatusLabel(partida.status)}
        </span>
        <span className={styles.meta}>
          {formatDate(partida.data)} · {partida.hora}
        </span>
      </div>

      <div className={styles.placar}>
        <div className={styles.time}>
          <EscudoTime timeId={partida.time_casa} size="md" />
          <span className={styles.timeNome}>{timeCasa?.sigla}</span>
        </div>

        <div className={styles.resultado}>
          {isEncerrada || isAoVivo ? (
            <div className={styles.placarNumeros}>
              <span>{partida.placar_casa}</span>
              <span className={styles.vs}>×</span>
              <span>{partida.placar_visitante}</span>
            </div>
          ) : (
            <div className={styles.vsHorario}>
              <span className={styles.vsTexto}>VS</span>
            </div>
          )}
        </div>

        <div className={`${styles.time} ${styles.timeRight}`}>
          <EscudoTime timeId={partida.time_visitante} size="md" />
          <span className={styles.timeNome}>{timeVisitante?.sigla}</span>
        </div>
      </div>

      {isEncerrada && partida.gols.length > 0 && (
        <div className={styles.gols}>
          <div className={styles.golsLado}>
            {partida.gols
              .filter(g => g.time === partida.time_casa)
              .map(g => (
                <span key={g.id} className={styles.gol}>
                  ⚽ {g.jogador} <span className={styles.minuto}>{g.minuto}&apos;</span>
                </span>
              ))}
          </div>
          <div className={`${styles.golsLado} ${styles.golsRight}`}>
            {partida.gols
              .filter(g => g.time === partida.time_visitante)
              .map(g => (
                <span key={g.id} className={styles.gol}>
                  ⚽ {g.jogador} <span className={styles.minuto}>{g.minuto}&apos;</span>
                </span>
              ))}
          </div>
        </div>
      )}

      <div className={styles.bottom}>
        <span>{partida.estadio} · {partida.cidade}</span>
        {isEncerrada && partida.publico > 0 && (
          <span>{partida.publico.toLocaleString('pt-BR')} presentes</span>
        )}
      </div>
    </Link>
  );
}
