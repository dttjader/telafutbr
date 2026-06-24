import { getPartidas, getTimes } from "@/lib/data";
import { CSSProperties } from "react";

interface Time {
  id: string | number;
  nome: string;
  sigla?: string;
  cor?: string;
}

interface Partida {
  id: string;
  time_mandante_id: string | number;
  time_visitante_id: string | number;
  gols_mandante: number;
  gols_visitante: number;
  data?: string;
}

const PSEUDO_IDS = new Set(["outros"]);

function getTime(d?: string): number {
  return d ? new Date(d).getTime() : 0;
}

export default async function ConfrontosPage() {
  const [times, partidas] = await Promise.all([getTimes(), getPartidas()]);

  const timesValidos: Time[] = (times ?? []).filter(
    (t) => !PSEUDO_IDS.has(String(t.id))
  );

  const idx: Record<string | number, number> = {};
  timesValidos.forEach((t, i) => {
    idx[t.id] = i;
  });

  const homeStats = timesValidos.map(() => ({
    J: 0,
    V: 0,
    E: 0,
    D: 0,
    GP: 0,
    GC: 0,
    SG: 0,
    Pts: 0,
  }));

  const awayStats = timesValidos.map(() => ({
    J: 0,
    V: 0,
    E: 0,
    D: 0,
    GP: 0,
    GC: 0,
    SG: 0,
    Pts: 0,
  }));

  let totPart = 0;
  let totManVit = 0;
  let totEmp = 0;
  let totVisVit = 0;
  let totGolsMan = 0;
  let totGolsVis = 0;
  let totGols = 0;

  const homeMatchesByTeam: Record<number, Partida[]> = {};
  const matchesByHomeAway: Record<number, Record<number, Partida[]>> = {};

  (partidas ?? []).forEach((p) => {
    const h = idx[p.time_mandante_id];
    const a = idx[p.time_visitante_id];
    if (h === undefined || a === undefined) return;
    if (h === a) return;

    const gm = p.gols_mandante ?? 0;
    const gv = p.gols_visitante ?? 0;

    totPart++;
    totGolsMan += gm;
    totGolsVis += gv;

    homeStats[h].J++;
    homeStats[h].GP += gm;
    homeStats[h].GC += gv;

    awayStats[a].J++;
    awayStats[a].GP += gv;
    awayStats[a].GC += gm;

    if (gm > gv) {
      totManVit++;
      homeStats[h].V++;
      homeStats[h].Pts += 3;
      awayStats[a].D++;
    } else if (gm === gv) {
      totEmp++;
      homeStats[h].E++;
      homeStats[h].Pts += 1;
      awayStats[a].E++;
      awayStats[a].Pts += 1;
    } else {
      totVisVit++;
      homeStats[h].D++;
      awayStats[a].V++;
      awayStats[a].Pts += 3;
    }

    if (!homeMatchesByTeam[h]) homeMatchesByTeam[h] = [];
    homeMatchesByTeam[h].push(p);

    if (!matchesByHomeAway[h]) matchesByHomeAway[h] = {};
    if (!matchesByHomeAway[h][a]) matchesByHomeAway[h][a] = [];
    matchesByHomeAway[h][a].push(p);
  });

  totGols = totGolsMan + totGolsVis;
  homeStats.forEach((s) => {
    s.SG = s.GP - s.GC;
  });
  awayStats.forEach((s) => {
    s.SG = s.GP - s.GC;
  });

  const ultimas5Casa: Record<number, Map<string, number>> = {};
  Object.keys(homeMatchesByTeam).forEach((hStr) => {
    const h = Number(hStr);
    const sorted = homeMatchesByTeam[h]
      .slice()
      .sort((a, b) => getTime(b.data) - getTime(a.data))
      .slice(0, 5);

    const map = new Map<string, number>();
    sorted.forEach((p, index) => {
      const a = idx[p.time_visitante_id];
      if (a === undefined) return;
      map.set(String(a), 4 - index);
    });
    ultimas5Casa[h] = map;
  });

  function homeShadeBg(homeIdx: number, awayIdx: number): CSSProperties {
    const map = ultimas5Casa[homeIdx];
    if (!map) return {};
    const recency = map.get(String(awayIdx));
    if (recency === undefined) return {};
    const opacity = 0.15 + (recency / 4) * 0.7;
    return {
      backgroundImage: `linear-gradient(135deg, rgba(37, 99, 235, ${opacity}) 0%, rgba(37, 99, 235, ${
        opacity * 0.35
      }) 100%)`,
    };
  }

  function latestScore(homeIdx: number, awayIdx: number): string {
    const matches = matchesByHomeAway[homeIdx]?.[awayIdx];
    if (!matches || matches.length === 0) return "—";
    const latest = matches
      .slice()
      .sort((a, b) => getTime(b.data) - getTime(a.data))[0];
    return `${latest.gols_mandante ?? 0} x ${latest.gols_visitante ?? 0}`;
  }

  type TeamWithStats = Time & {
    index: number;
    stats: (typeof homeStats)[number];
  };

  const homeRanking: TeamWithStats[] = timesValidos
    .map((t, i) => ({ ...t, index: i, stats: homeStats[i] }))
    .sort((a, b) => {
      if (b.stats.Pts !== a.stats.Pts) return b.stats.Pts - a.stats.Pts;
      if (b.stats.SG !== a.stats.SG) return b.stats.SG - a.stats.SG;
      return a.nome.localeCompare(b.nome);
    });

  const awayRanking: TeamWithStats[] = timesValidos
    .map((t, i) => ({ ...t, index: i, stats: awayStats[i] }))
    .sort((a, b) => {
      if (b.stats.Pts !== a.stats.Pts) return b.stats.Pts - a.stats.Pts;
      if (b.stats.SG !== a.stats.SG) return b.stats.SG - a.stats.SG;
      return a.nome.localeCompare(b.nome);
    });

  const cardStyle: CSSProperties = {
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    color: "#fff",
    minWidth: "120px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
  };

  const tableHeaderStyle: CSSProperties = {
    backgroundColor: "#1e293b",
    color: "#fff",
    padding: "0.5rem",
    border: "1px solid #334155",
    textAlign: "center",
    fontWeight: 600,
  };

  const cellStyle: CSSProperties = {
    padding: "0.5rem",
    border: "1px solid #cbd5e1",
    textAlign: "center",
    minWidth: "60px",
  };

  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1
        style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: "2.5rem",
          marginBottom: "1rem",
        }}
      >
        Confrontos
      </h1>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          fontFamily: '"Bebas Neue", sans-serif',
        }}
      >
        <div style={{ ...cardStyle, backgroundColor: "#3b82f6" }}>
          <div style={{ fontSize: "1.75rem" }}>{totPart}</div>
          <div style={{ fontSize: "0.9rem" }}>Partidas</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#10b981" }}>
          <div style={{ fontSize: "1.75rem" }}>{totManVit}</div>
          <div style={{ fontSize: "0.9rem" }}>Vitórias Mandante</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#f59e0b" }}>
          <div style={{ fontSize: "1.75rem" }}>{totEmp}</div>
          <div style={{ fontSize: "0.9rem" }}>Empates</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#ef4444" }}>
          <div style={{ fontSize: "1.75rem" }}>{totVisVit}</div>
          <div style={{ fontSize: "0.9rem" }}>Vitórias Visitante</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#8b5cf6" }}>
          <div style={{ fontSize: "1.75rem" }}>{totGols}</div>
          <div style={{ fontSize: "0.9rem" }}>Gols</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#06b6d4" }}>
          <div style={{ fontSize: "1.75rem" }}>{totGolsMan}</div>
          <div style={{ fontSize: "0.9rem" }}>Gols Mandante</div>
        </div>
        <div style={{ ...cardStyle, backgroundColor: "#f97316" }}>
          <div style={{ fontSize: "1.75rem" }}>{totGolsVis}</div>
          <div style={{ fontSize: "0.9rem" }}>Gols Visitante</div>
        </div>
      </div>

      <section
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8fafc",
          borderRadius: "0.5rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: "1.5rem",
            marginBottom: "0.5rem",
          }}
        >
          Legenda
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          <li>
            Cada linha da tabela cruzada representa o time{" "}
            <strong>mandante</strong>.
          </li>
          <li>Cada coluna representa o time <strong>visitante</strong>.</li>
          <li>
            O placar exibido é o resultado do <strong>último confronto</strong>{" "}
            entre mandante e visitante.
          </li>
          <li>
            O degradê azul no fundo indica a recência do mandante: quanto mais
            intenso, mais recente foi o último jogo em casa contra o adversário.
          </li>
          <li>
            As tabelas de resumo abaixo ordenam os times por pontuação e saldo
            de gols.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: "1.75rem",
            marginBottom: "0.75rem",
          }}
        >
          Tabela Cruzada
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Mandante \ Visitante</th>
                {timesValidos.map((t) => (
                  <th
                    key={String(t.id)}
                    style={{ ...tableHeaderStyle, minWidth: "70px" }}
                  >
                    {t.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timesValidos.map((home, i) => (
                <tr key={String(home.id)}>
                  <th style={{ ...tableHeaderStyle, textAlign: "left" }}>
                    {home.nome}
                  </th>
                  {timesValidos.map((away, j) => (
                    <td
                      key={String(away.id)}
                      style={{ ...cellStyle, ...homeShadeBg(i, j) }}
                    >
                      {i === j ? "—" : latestScore(i, j)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
        }}
      >
        <section>
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: "1.75rem",
              marginBottom: "0.75rem",
            }}
          >
            Resumo Mandante
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>#</th>
                  <th style={tableHeaderStyle}>Time</th>
                  <th style={tableHeaderStyle}>J</th>
                  <th style={tableHeaderStyle}>V</th>
                  <th style={tableHeaderStyle}>E</th>
                  <th style={tableHeaderStyle}>D</th>
                  <th style={tableHeaderStyle}>GP</th>
                  <th style={tableHeaderStyle}>GC</th>
                  <th style={tableHeaderStyle}>SG</th>
                  <th style={tableHeaderStyle}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {homeRanking.map((t, pos) => (
                  <tr key={String(t.id)}>
                    <td style={cellStyle}>{pos + 1}</td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: "left",
                        fontWeight: 600,
                      }}
                    >
                      {t.nome}
                    </td>
                    <td style={cellStyle}>{t.stats.J}</td>
                    <td style={cellStyle}>{t.stats.V}</td>
                    <td style={cellStyle}>{t.stats.E}</td>
                    <td style={cellStyle}>{t.stats.D}</td>
                    <td style={cellStyle}>{t.stats.GP}</td>
                    <td style={cellStyle}>{t.stats.GC}</td>
                    <td style={cellStyle}>{t.stats.SG}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>
                      {t.stats.Pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: "1.75rem",
              marginBottom: "0.75rem",
            }}
          >
            Resumo Visitante
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>#</th>
                  <th style={tableHeaderStyle}>Time</th>
                  <th style={tableHeaderStyle}>J</th>
                  <th style={tableHeaderStyle}>V</th>
                  <th style={tableHeaderStyle}>E</th>
                  <th style={tableHeaderStyle}>D</th>
                  <th style={tableHeaderStyle}>GP</th>
                  <th style={tableHeaderStyle}>GC</th>
                  <th style={tableHeaderStyle}>SG</th>
                  <th style={tableHeaderStyle}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {awayRanking.map((t, pos) => (
                  <tr key={String(t.id)}>
                    <td style={cellStyle}>{pos + 1}</td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: "left",
                        fontWeight: 600,
                      }}
                    >
                      {t.nome}
                    </td>
                    <td style={cellStyle}>{t.stats.J}</td>
                    <td style={cellStyle}>{t.stats.V}</td>
                    <td style={cellStyle}>{t.stats.E}</td>
                    <td style={cellStyle}>{t.stats.D}</td>
                    <td style={cellStyle}>{t.stats.GP}</td>
                    <td style={cellStyle}>{t.stats.GC}</td>
                    <td style={cellStyle}>{t.stats.SG}</td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>
                      {t.stats.Pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
