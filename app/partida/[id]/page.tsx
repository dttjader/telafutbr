import { notFound } from 'next/navigation';
import { getPartida, getTime, formatDate, getGolTipoLabel, getPosicaoLabel } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import styles from './page.module.css';

interface Props {
  params: { id: string };
}

export default function PartidaPage({ params }: Props) {
  const partida = getPartida(params.id);
  if (!partida) notFound();

  const timeCasa = getTime(partida.time_casa)!;
  const timeVisitante = getTime(partida.time_visitante)!;
  const isEncerrada = partida.status === 'encerrada';

  return (
    <div className={styles.page}>
      {/* Cabeçalho do placar */}
      <div className={styles.hero}>
        <div className="container">
          <p className={styles.info}>{formatDate(partida.data)} · {partida.hora} · {partida.estadio}, {partida.cidade}</p>

          <div className={styles.placar}>
            <div className={styles.timeSide}>
              <EscudoTime timeId={partida.time_casa} size="lg" />
              <h2>{timeCasa.nome}</h2>
              <span className={styles.mando}>Mandante</span>
            </div>

            <div className={styles.placarCentro}>
              {isEncerrada ? (
                <div className={styles.placarNumeros}>
                  <span>{partida.placar_casa}</span>
                  <span className={styles.sep}>×</span>
                  <span>{partida.placar_visitante}</span>
                </div>
              ) : (
                <div className={styles.vs}>VS</div>
              )}
              <div className={styles.rodadaTag}>Rodada {partida.rodada}</div>
            </div>

            <div className={`${styles.timeSide} ${styles.timeSideRight}`}>
              <EscudoTime timeId={partida.time_visitante} size="lg" />
              <h2>{timeVisitante.nome}</h2>
              <span className={styles.mando}>Visitante</span>
            </div>
          </div>

          {isEncerrada && partida.publico > 0 && (
            <p className={styles.publico}>👥 {partida.publico.toLocaleString('pt-BR')} presentes</p>
          )}
        </div>
      </div>

      <div className={`container ${styles.content}`}>
        {/* GOLS */}
        {partida.gols.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>⚽ Gols</h3>
            <div className={styles.timeline}>
              {partida.gols.map(gol => {
                const isCasa = gol.time === partida.time_casa;
                return (
                  <div key={gol.id} className={`${styles.golItem} ${isCasa ? styles.golCasa : styles.golVisitante}`}>
                    <div className={styles.golMinuto}>
                      {gol.minuto}{gol.acrescimo > 0 ? `+${gol.acrescimo}` : ''}&apos;
                    </div>
                    <div className={styles.golBola}>⚽</div>
                    <div className={styles.golInfo}>
                      <strong>{gol.jogador}</strong>
                      {gol.assistencia && <span> · Assistência: {gol.assistencia}</span>}
                      <div className={styles.golMeta}>
                        {getGolTipoLabel(gol.tipo)} · Goleiro: {gol.goleiro_adversario}
                      </div>
                      {gol.descricao && <div className={styles.golDesc}>{gol.descricao}</div>}
                    </div>
                    <div className={styles.golTime}>
                      <EscudoTime timeId={gol.time} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CARTÕES */}
        {partida.cartoes.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🟨 Cartões</h3>
            <div className={styles.cartoesList}>
              {partida.cartoes.map((cartao, i) => (
                <div key={i} className={styles.cartaoItem}>
                  <span className={`${styles.cartao} ${cartao.tipo === 'vermelho' ? styles.vermelho : styles.amarelo}`} />
                  <span className={styles.cartaoMinuto}>{cartao.minuto}&apos;</span>
                  <span className={styles.cartaoJogador}>{cartao.jogador}</span>
                  <EscudoTime timeId={cartao.time} size="sm" />
                  <span className={styles.cartaoMotivo}>{cartao.motivo}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SUBSTITUIÇÕES */}
        {partida.substituicoes.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🔄 Substituições</h3>
            <div className={styles.subsList}>
              {partida.substituicoes.map((sub, i) => (
                <div key={i} className={styles.subItem}>
                  <span className={styles.subMinuto}>{sub.minuto}&apos;</span>
                  <EscudoTime timeId={sub.time} size="sm" />
                  <span className={styles.subSai}>↑ {sub.entra}</span>
                  <span className={styles.subEntra}>↓ {sub.sai}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ESCALAÇÕES */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>👕 Escalações</h3>
          <div className={styles.escalacoes}>
            {[
              { time: timeCasa, escalacao: partida.escalacao_casa },
              { time: timeVisitante, escalacao: partida.escalacao_visitante },
            ].map(({ time, escalacao }) => (
              <div key={time.id} className={styles.escalacao}>
                <div className={styles.escHeader}>
                  <EscudoTime timeId={time.id} size="sm" />
                  <div>
                    <strong>{time.nome}</strong>
                    <div className={styles.formacao}>{escalacao.formacao}</div>
                  </div>
                </div>
                <div className={styles.jogadoresList}>
                  <div className={styles.posGrupo}>
                    <span className={styles.posLabel}>Titulares</span>
                    {escalacao.titulares.map(j => (
                      <div key={j.numero} className={styles.jogador}>
                        <span className={styles.numero}>#{j.numero}</span>
                        <span className={styles.jogadorNome}>{j.nome}</span>
                        <span className={styles.posicao}>{j.posicao}</span>
                      </div>
                    ))}
                  </div>
                  {escalacao.reservas.length > 0 && (
                    <div className={styles.posGrupo}>
                      <span className={styles.posLabel}>Reservas / Entraram</span>
                      {escalacao.reservas.map(j => (
                        <div key={j.numero} className={`${styles.jogador} ${styles.reserva}`}>
                          <span className={styles.numero}>#{j.numero}</span>
                          <span className={styles.jogadorNome}>{j.nome}</span>
                          <span className={styles.posicao}>{j.posicao}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ARBITRAGEM */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🟢 Arbitragem</h3>
          <div className={styles.arb}>
            <div className={styles.arbItem}><span>Principal</span><strong>{partida.arbitragem.principal}</strong></div>
            <div className={styles.arbItem}><span>Assistente 1</span><strong>{partida.arbitragem.assistente1}</strong></div>
            <div className={styles.arbItem}><span>Assistente 2</span><strong>{partida.arbitragem.assistente2}</strong></div>
            <div className={styles.arbItem}><span>4º Árbitro</span><strong>{partida.arbitragem.quarto}</strong></div>
            <div className={styles.arbItem}><span>VAR</span><strong>{partida.arbitragem.var}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
