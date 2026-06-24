import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confrontos - Tabela Cruzada',
  description: 'Análise cruzada de confrontos entre os times do campeonato.',
};

interface Time {
  id: number;
  nome: string;
  sigla: string;
  escudo?: string;
  cor?: string;
}

interface Partida {
  id: number;
  time_casa_id: number;
  time_visitante_id: number;
  placar_casa: number | null;
  placar_visitante: number | null;
  status: 'agendada' | 'encerrada' | 'em_andamento' | 'cancelada';
  data: string;
  hora?: string;
  rodada?: number;
}

interface Confronto {
  id: number;
  time_casa_id: number;
  time_visitante_id: number;
  placar_casa: number | null;
  placar_visitante: number | null;
  data: string;
  status: string;
}

interface Stats {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  aproveitamento: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api';

async function fetchTimes(): Promise<Time[]> {
  try {
    const res = await fetch(`${API_BASE}/times`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchPartidas(): Promise<Partida[]> {
  try {
    const res = await fetch(`${API_BASE}/partidas`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchConfrontos(): Promise<Confronto[]> {
  try {
    const res = await fetch(`${API_BASE}/confrontos`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function computeStats(
  partidas: Partida[],
  filter: (p: Partida) => boolean,
  side: 'casa' | 'visitante' | 'todos'
): Stats {
  let jogos = 0;
  let vitorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golsPro = 0;
  let golsContra = 0;

  partidas.filter(filter).forEach((p) => {
    if (p.status !== 'encerrada') return;
    if (p.placar_casa === null || p.placar_visitante === null) return;

    jogos += 1;

    const gcPro = side === 'casa' ? p.placar_casa : side === 'visitante' ? p.placar_visitante : 0;
    const gcContra = side === 'casa' ? p.placar_visitante : side === 'visitante' ? p.placar_casa : 0;

    if (side === 'todos') {
      golsPro += p.placar_casa + p.placar_visitante;
      golsContra += p.placar_casa + p.placar_visitante;
      if (p.placar_casa > p.placar_visitante) vitorias += 1;
      else if (p.placar_casa < p.placar_visitante) derrotas += 1;
      else empates += 1;
    } else {
      golsPro += gcPro;
      golsContra += gcContra;
      if (gcPro > gcContra) vitorias += 1;
      else if (gcPro < gcContra) derrotas += 1;
      else empates += 1;
    }
  });

  const aproveitamento = jogos > 0 ? ((vitorias * 3 + empates) / (jogos * 3)) * 100 : 0;

  return {
    jogos,
    vitorias,
    empates,
    derrotas,
    golsPro,
    golsContra,
    aproveitamento,
  };
}

function buildUltimas5Casa(partidas: Partida[]): Record<number, Map<string, number>> {
  const ultimas5Casa: Record<number, Map<string, number>> = {};
  const encerradas = partidas.filter((p) => p.status === 'encerrada');

  const porTimeCasa: Record<number, Partida[]> = {};
  encerradas.forEach((p) => {
    if (!porTimeCasa[p.time_casa_id]) porTimeCasa[p.time_casa_id] = [];
    porTimeCasa[p.time_casa_id].push(p);
  });

  Object.entries(porTimeCasa).forEach(([timeCasaId, jogos]) => {
    const sorted = jogos
      .slice()
      .sort(
        (a, b) =>
          new Date(`${b.data}T${b.hora || '00:00'}`).getTime() -
          new Date(`${a.data}T${a.hora || '00:00'}`).getTime()
      )
      .slice(0, 5);

    const map = new Map<string, number>();
    sorted.forEach((j, idx) => {
      map.set(String(j.time_visitante_id), idx);
    });

    ultimas5Casa[Number(timeCasaId)] = map;
  });

  return ultimas5Casa;
}

export default async function ConfrontosPage() {
  const [times, partidas, confrontos] = await Promise.all([
    fetchTimes(),
    fetchPartidas(),
    fetchConfrontos(),
  ]);

  const timesMap: Record<number, Time> = {};
  times.forEach((t) => {
    timesMap[t.id] = t;
  });

  const idx: Record<string | number, number> = {};
  times.forEach((t, i) => {
    idx[t.id] = i;
  });

  const ultimas5Casa: Record<number, Map<string, number>> = buildUltimas5Casa(partidas);

  const homeShadeBg = [
    'rgba(0, 128, 0, 0.14)',
    'rgba(0, 128, 0, 0.12)',
    'rgba(0, 128, 0, 0.10)',
    'rgba(0, 128, 0, 0.08)',
    'rgba(0, 128, 0, 0.06)',
  ];

  const totalPartidas = partidas.filter((p) => p.status === 'encerrada').length;
  const totalGols = partidas.reduce((acc, p) => {
    if (p.status !== 'encerrada') return acc;
    return acc + (p.placar_casa || 0) + (p.placar_visitante || 0);
  }, 0);
  const mediaGols = totalPartidas > 0 ? (totalGols / totalPartidas).toFixed(2) : '0.00';

  const vitoriasCasa = partidas.filter(
    (p) =>
      p.status === 'encerrada' &&
      p.placar_casa !== null &&
      p.placar_visitante !== null &&
      p.placar_casa > p.placar_visitante
  ).length;

  const empates = partidas.filter(
    (p) =>
      p.status === 'encerrada' &&
      p.placar_casa !== null &&
      p.placar_visitante !== null &&
      p.placar_casa === p.placar_visitante
  ).length;

  const vitoriasFora = partidas.filter(
    (p) =>
      p.status === 'encerrada' &&
      p.placar_casa !== null &&
      p.placar_visitante !== null &&
      p.placar_casa < p.placar_visitante
  ).length;

  const ambasMarcam = partidas.filter(
    (p) =>
      p.status === 'encerrada' &&
      (p.placar_casa || 0) > 0 &&
      (p.placar_visitante || 0) > 0
  ).length;

  const over25 = partidas.filter(
    (p) =>
      p.status === 'encerrada' &&
      (p.placar_casa || 0) + (p.placar_visitante || 0) > 2.5
  ).length;

  const statsCards = [
    { label: 'JOGOS', value: totalPartidas },
    { label: 'MÉDIA GOLS', value: mediaGols },
    { label: 'VITÓRIAS CASA', value: vitoriasCasa },
    { label: 'EMPATES', value: empates },
    { label: 'VITÓRIAS FORA', value: vitoriasFora },
    { label: 'AMBAS MARCAM', value: ambasMarcam },
    { label: 'OVER 2.5', value: over25 },
  ];

  const mandanteStats = times
    .map((t) => ({
      time: t,
      stats: computeStats(
        partidas,
        (p) => p.time_casa_id === t.id,
        'casa'
      ),
    }))
    .sort((a, b) => b.stats.aproveitamento - a.stats.aproveitamento);

  const visitanteStats = times
    .map((t) => ({
      time: t,
      stats: computeStats(
        partidas,
        (p) => p.time_visitante_id === t.id,
        'visitante'
      ),
    }))
    .sort((a, b) => b.stats.aproveitamento - a.stats.aproveitamento);

  const cellSize = '42px';

  return (
    <main style={{ padding: '24px', fontFamily: 'Arial, sans-serif', backgroundColor: '#0f172a' }}>
      <h1
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: '2.5rem',
          color: 'var(--verde)',
          marginBottom: '24px',
          textAlign: 'center',
          letterSpacing: '1px',
        }}
      >
        CONFRONTOS - TABELA CRUZADA
      </h1>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {statsCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid var(--verde)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.8rem',
                color: 'var(--verde)',
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '4px',
                textTransform: 'uppercase',
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          overflowX: 'auto',
          borderRadius: '12px',
          border: '1px solid var(--verde)',
          backgroundColor: '#1e293b',
          marginBottom: '32px',
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
          <thead>
            <tr>
              <th
                style={{
                  width: '220px',
                  minWidth: '220px',
                  padding: '10px',
                  backgroundColor: '#0f172a',
                  color: 'var(--verde)',
                  fontFamily: '"Bebas Neue", sans-serif',
                  fontSize: '1rem',
                  borderBottom: '1px solid var(--verde)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 10,
                  textAlign: 'left',
                }}
              >
                CASA \ FORA
              </th>
              {times.map((t) => (
                <th
                  key={t.id}
                  style={{
                    width: cellSize,
                    minWidth: cellSize,
                    height: '80px',
                    padding: '4px',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '0.7rem',
                    borderBottom: '1px solid var(--verde)',
                    borderLeft: '1px solid #334155',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.sigla || t.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((casa) => (
              <tr key={casa.id}>
                <td
                  style={{
                    width: '220px',
                    minWidth: '220px',
                    padding: '8px 10px',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontWeight: 700,
                    borderBottom: '1px solid #334155',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {casa.escudo && (
                    <img
                      src={casa.escudo}
                      alt={casa.nome}
                      width={24}
                      height={24}
                      style={{ borderRadius: '50%' }}
                    />
                  )}
                  <span>{casa.sigla || casa.nome}</span>
                </td>
                {times.map((fora) => {
                  const recencyIdx =
                    casa.id !== fora.id
                      ? ultimas5Casa[casa.id]?.get(String(fora.id))
                      : undefined;

                  const confronto = confrontos.find(
                    (c) => c.time_casa_id === casa.id && c.time_visitante_id === fora.id
                  );

                  const resultado =
                    confronto && confronto.status === 'encerrada' &&
                    confronto.placar_casa !== null &&
                    confronto.placar_visitante !== null
                      ? `${confronto.placar_casa} x ${confronto.placar_visitante}`
                      : casa.id === fora.id
                      ? '—'
                      : '';

                  return (
                    <td
                      key={fora.id}
                      style={{
                        width: cellSize,
                        minWidth: cellSize,
                        height: cellSize,
                        padding: '4px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: '#e2e8f0',
                        borderBottom: '1px solid #334155',
                        borderLeft: '1px solid #334155',
                        background:
                          recencyIdx !== undefined ? homeShadeBg[recencyIdx] : 'transparent',
                        cursor: confronto ? 'pointer' : 'default',
                      }}
                      title={
                        confronto
                          ? `${casa.nome} x ${fora.nome} ${resultado ? `(${resultado})` : ''}`
                          : undefined
                      }
                    >
                      {resultado}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid var(--verde)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              color: 'var(--verde)',
              marginBottom: '12px',
              fontSize: '1.5rem',
            }}
          >
            RESUMO MANDANTE
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>TIME</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>J</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>V</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>E</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>D</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>APV</th>
              </tr>
            </thead>
            <tbody>
              {mandanteStats.map((item) => (
                <tr key={item.time.id}>
                  <td style={{ padding: '8px 0', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.time.sigla || item.time.nome}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.jogos}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.vitorias}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.empates}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.derrotas}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      color: 'var(--verde)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.stats.aproveitamento.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid var(--verde)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              color: 'var(--verde)',
              marginBottom: '12px',
              fontSize: '1.5rem',
            }}
          >
            RESUMO VISITANTE
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>TIME</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>J</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>V</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>E</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>D</th>
                <th style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>APV</th>
              </tr>
            </thead>
            <tbody>
              {visitanteStats.map((item) => (
                <tr key={item.time.id}>
                  <td style={{ padding: '8px 0', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.time.sigla || item.time.nome}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.jogos}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.vitorias}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.empates}
                  </td>
                  <td style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {item.stats.derrotas}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      color: 'var(--verde)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.stats.aproveitamento.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
