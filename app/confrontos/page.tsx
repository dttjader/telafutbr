import React from "react";
import { getPartidas, getTimes } from "@/lib/data";

type Time = {
  id: string | number;
  nome: string;
  sigla?: string;
  [key: string]: any;
};

type Partida = {
  id: string | number;
  mandante_id: string | number;
  visitante_id: string | number;
  gols_mandante?: number;
  gols_visitante?: number;
  status?: string;
  data?: string;
  hora?: string;
  [key: string]: any;
};

const PSEUDO_IDS = new Set(['outros']);

function parseDateTime(p: Partida): number {
  if (!p.data) return 0;
  const data = String(p.data);
  const hora = p.hora ? String(p.hora) : '00:00';
  return new Date(`${data}T${hora}`).getTime();
}

export default async function Home() {
  const times = await getTimes();
  const partidas = await getPartidas();

  const idx: Record<string | number, number> = {};
  times.forEach((time: Time, index: number) => {
    idx[time.id] = index;
  });

  const encerradas = partidas.filter(
    (p: Partida) => p.status === 'encerrada' || p.status === 'finalizada'
  );

  const totPart = encerradas.length;
  const totManVit = encerradas.filter(
    (p: Partida) => (p.gols_mandante ?? 0) > (p.gols_visitante ?? 0)
  ).length;
  const totEmp = encerradas.filter(
    (p: Partida) => (p.gols_mandante ?? 0) === (p.gols_visitante ?? 0)
  ).length;
  const totVisVit = encerradas.filter(
    (p: Partida) => (p.gols_mandante ?? 0) < (p.gols_visitante ?? 0)
  ).length;
  const totGols = encerradas.reduce(
    (acc: number, p: Partida) => acc + (p.gols_mandante ?? 0) + (p.gols_visitante ?? 0),
    0
  );
  const totGolsMan = encerradas.reduce(
    (acc: number, p: Partida) => acc + (p.gols_mandante ?? 0),
    0
  );
  const totGolsVis = encerradas.reduce(
    (acc: number, p: Partida) => acc + (p.gols_visitante ?? 0),
    0
  );

  const ultimas5Casa: Record<number, Map<string, number>> = {};
  times.forEach((time: Time, i: number) => {
    const partidasCasa = encerradas
      .filter((p: Partida) => String(p.mandante_id) === String(time.id))
      .sort((a: Partida, b: Partida) => parseDateTime(b) - parseDateTime(a))
      .slice(0, 5);

    const map = new Map<string, number>();
    partidasCasa.forEach((p: Partida, index: number) => {
      map.set(String(p.visitante_id), index);
    });
    ultimas5Casa[i] = map;
  });

  const homeShadeBg = ['#e6f7e6', '#c6e9c6', '#a6dba6', '#86cd86', '#66bf66'];
  const homeShadeText = ['#1a4a1a', '#1a4a1a', '#1a4a1a', '#1a4a1a', '#ffffff'];

  const statsMandante = times.map((time: Time, i: number) => {
    const jogos = encerradas.filter(
      (p: Partida) => String(p.mandante_id) === String(time.id)
    );
    const v = jogos.filter(
      (p: Partida) => (p.gols_mandante ?? 0) > (p.gols_visitante ?? 0)
    ).length;
    const e = jogos.filter(
      (p: Partida) => (p.gols_mandante ?? 0) === (p.gols_visitante ?? 0)
    ).length;
    const d = jogos.filter(
      (p: Partida) => (p.gols_mandante ?? 0) < (p.gols_visitante ?? 0)
    ).length;
    const gp = jogos.reduce((acc: number, p: Partida) => acc + (p.gols_mandante ?? 0), 0);
    const gc = jogos.reduce((acc: number, p: Partida) => acc + (p.gols_visitante ?? 0), 0);
    const pts = v * 3 + e;
    return { time, v, e, d, gp, gc, saldo: gp - gc, pts, i };
  });

  const statsVisitante = times.map((time: Time, i: number) => {
    const jogos = encerradas.filter(
      (p: Partida) => String(p.visitante_id) === String(time.id)
    );
    const v = jogos.filter(
      (p: Partida) => (p.gols_visitante ?? 0) > (p.gols_mandante ?? 0)
    ).length;
    const e = jogos.filter(
      (p: Partida) => (p.gols_visitante ?? 0) === (p.gols_mandante ?? 0)
    ).length;
    const d = jogos.filter(
      (p: Partida) => (p.gols_visitante ?? 0) < (p.gols_mandante ?? 0)
    ).length;
    const gp = jogos.reduce((acc: number, p: Partida) => acc + (p.gols_visitante ?? 0), 0);
    const gc = jogos.reduce((acc: number, p: Partida) => acc + (p.gols_mandante ?? 0), 0);
    const pts = v * 3 + e;
    return { time, v, e, d, gp, gc, saldo: gp - gc, pts, i };
  });

  const rankMandante = [...statsMandante].sort(
    (a, b) => b.pts - a.pts || b.saldo - a.saldo
  );
  const rankVisitante = [...statsVisitante].sort(
    (a, b) => b.pts - a.pts || b.saldo - a.saldo
  );

  const cardStats = [
    { label: 'JOGOS', value: totPart, bg: '#3498db', color: '#fff' },
    { label: 'VITÓRIAS MANDANTE', value: totManVit, bg: '#2ecc71', color: '#fff' },
    { label: 'EMPATES', value: totEmp, bg: '#f1c40f', color: '#000' },
    { label: 'VITÓRIAS VISITANTE', value: totVisVit, bg: '#e74c3c', color: '#fff' },
    { label: 'GOLS', value: totGols, bg: '#9b59b6', color: '#fff' },
    { label: 'GOLS MANDANTE', value: totGolsMan, bg: '#1abc9c', color: '#fff' },
    { label: 'GOLS VISITANTE', value: totGolsVis, bg: '#e67e22', color: '#fff' },
  ];

  return (
    <main
      style={{
        fontFamily: 'Bebas Neue, sans-serif',
        padding: '2rem',
        background: '#f8f9fa',
        minHeight: '100vh',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <h1
        style={{
          fontSize: '2.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
          color: '#1a1a1a',
          letterSpacing: '1px',
        }}
      >
        Estatísticas 2026
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {cardStats.map((card, index) => (
          <div
            key={index}
            style={{
              background: card.bg,
              color: card.color,
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.95rem' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: '2rem', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
          Tabela Cruzada
        </h2>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            background: '#fff',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                  background: '#333',
                  color: '#fff',
                  minWidth: '120px',
                }}
              >
                Mandante \ Visitante
              </th>
              {times.map((time: Time) => (
                <th
                  key={time.id}
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.75rem',
                    minWidth: '60px',
                  }}
                >
                  {time.sigla || time.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((timeCasa: Time, i: number) => (
              <tr key={timeCasa.id}>
                <td
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                    fontWeight: 'bold',
                    background: '#f0f0f0',
                    fontSize: '0.85rem',
                  }}
                >
                  {timeCasa.nome}
                </td>
                {times.map((timeFora: Time, j: number) => {
                  const recencyIdx = ultimas5Casa[i]?.get(
                    String(times[j].id)
                  );
                  const cellStyle: React.CSSProperties = {
                    border: '1px solid #ddd',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    background:
                      recencyIdx !== undefined
                        ? homeShadeBg[recencyIdx]
                        : 'transparent',
                    color:
                      recencyIdx !== undefined
                        ? homeShadeText[recencyIdx]
                        : '#333',
                  };
                  return (
                    <td key={timeFora.id} style={cellStyle}>
                      {i === j ? '—' : recencyIdx !== undefined ? recencyIdx + 1 : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        <section>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
            Classificação Mandante
          </h2>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              background: '#fff',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <thead>
              <tr>
                {['#', 'Time', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts'].map(
                  (header) => (
                    <th
                      key={header}
                      style={{
                        border: '1px solid #ddd',
                        padding: '8px',
                        background: '#2ecc71',
                        color: '#fff',
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rankMandante.map((s, pos) => (
                <tr key={s.time.id}>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {pos + 1}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {s.time.nome}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.v + s.e + s.d}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.v}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.e}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.d}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.gp}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.gc}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.saldo}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {s.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
            Classificação Visitante
          </h2>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              background: '#fff',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <thead>
              <tr>
                {['#', 'Time', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Pts'].map(
                  (header) => (
                    <th
                      key={header}
                      style={{
                        border: '1px solid #ddd',
                        padding: '8px',
                        background: '#e74c3c',
                        color: '#fff',
                      }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rankVisitante.map((s, pos) => (
                <tr key={s.time.id}>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {pos + 1}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {s.time.nome}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.v + s.e + s.d}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.v}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.e}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.d}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.gp}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.gc}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    {s.saldo}
                  </td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {s.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
