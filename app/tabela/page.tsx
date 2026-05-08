import { getTabela, getTime, getZonaClassificacao } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import styles from './page.module.css';

export default function TabelaPage() {
  const tabela = getTabela();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className="container">
          <p className={styles.heroSub}>Classificação Geral</p>
          <h1 className={styles.heroTitle}>Tabela</h1>
        </div>
      </div>

      <div className="container">
        <div className={styles.legenda}>
          <span className={styles.legendaItem}><span className={`${styles.dot} ${styles.libertadores}`} /> Libertadores</span>
          <span className={styles.legendaItem}><span className={`${styles.dot} ${styles.sulamericana}`} /> Sul-Americana</span>
          <span className={styles.legendaItem}><span className={`${styles.dot} ${styles.rebaixamento}`} /> Rebaixamento</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th className={styles.thTime}>Time</th>
                <th title="Pontos">P</th>
                <th title="Jogos">J</th>
                <th title="Vitórias">V</th>
                <th title="Empates">E</th>
                <th title="Derrotas">D</th>
                <th title="Gols Pró">GP</th>
                <th title="Gols Contra">GC</th>
                <th title="Saldo de Gols">SG</th>
              </tr>
            </thead>
            <tbody>
              {tabela.map(row => {
                const time = getTime(row.time);
                const zona = getZonaClassificacao(row.posicao);
                return (
                  <tr key={row.time} className={`${styles.row} ${styles[`zona_${zona}`]}`}>
                    <td className={styles.pos}>
                      <span className={`${styles.posIndicador} ${styles[zona]}`} />
                      {row.posicao}
                    </td>
                    <td className={styles.tdTime}>
                      <EscudoTime timeId={row.time} size="sm" />
                      <span className={styles.timeNome}>{time?.nome}</span>
                      <span className={styles.timeSigla}>{time?.sigla}</span>
                    </td>
                    <td className={styles.pontos}>{row.pontos}</td>
                    <td>{row.jogos}</td>
                    <td className={styles.v}>{row.vitorias}</td>
                    <td>{row.empates}</td>
                    <td className={styles.d}>{row.derrotas}</td>
                    <td>{row.gols_pro}</td>
                    <td>{row.gols_contra}</td>
                    <td className={row.saldo > 0 ? styles.saldoPos : row.saldo < 0 ? styles.saldoNeg : ''}>
                      {row.saldo > 0 ? `+${row.saldo}` : row.saldo}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
