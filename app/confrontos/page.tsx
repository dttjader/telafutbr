import { getPartidas, getTimes } from "@/lib/data";

export default async function Home() {
  const partidas = await getPartidas();
  const times = await getTimes();

  const idx: Record<number, number> = {};
  const timesList = Object.values(times);
  timesList.forEach((time, i) => {
    idx[time.id] = i;
  });

  const n = timesList.length;

  const matrixCasa: Record<number, Record<number, string>> = {};
  const matrixVisitante: Record<number, Record<number, string>> = {};
  const ultimas5Casa: Record<number, Map<string, number>> = {};

  for (let i = 0; i < n; i++) {
    matrixCasa[i] = {};
    matrixVisitante[i] = {};
    ultimas5Casa[i] = new Map<string, number>();
  }

  const jogosTime: Record<number, typeof partidas> = {};
  timesList.forEach((time) => {
    jogosTime[time.id] = partidas.filter(
      (p) => p.time_casa_id === time.id || p.time_visitante_id === time.id
    );
  });

  partidas.forEach((p) => {
    const i = idx[p.time_casa_id];
    const j = idx[p.time_visitante_id];
    if (i === undefined || j === undefined) return;

    matrixCasa[i][j] = `${p.gols_casa ?? "-"} x ${p.gols_visitante ?? "-"}`;
    matrixVisitante[j][i] = `${p.gols_visitante ?? "-"} x ${p.gols_casa ?? "-"}`;

    const jogosCasa = jogosTime[p.time_casa_id].filter(
      (jogo) => jogo.time_casa_id === p.time_casa_id
    );
    const recencyIdx = jogosCasa.indexOf(p);
    if (recencyIdx >= 0 && recencyIdx < 5) {
      ultimas5Casa[i].set(`${i}-${j}`, recencyIdx);
    }
  });

  const homeShadeBg = [
    "rgba(59, 130, 246, 0.35)",
    "rgba(59, 130, 246, 0.28)",
    "rgba(59, 130, 246, 0.21)",
    "rgba(59, 130, 246, 0.14)",
    "rgba(59, 130, 246, 0.07)",
  ];

  const homeShadeOutline = [
    "rgba(59, 130, 246, 0.55)",
    "rgba(59, 130, 246, 0.48)",
    "rgba(59, 130, 246, 0.41)",
    "rgba(59, 130, 246, 0.34)",
    "rgba(59, 130, 246, 0.27)",
  ];

  const totalJogos = partidas.length;
  const totalGols = partidas.reduce(
    (acc, p) => acc + (p.gols_casa || 0) + (p.gols_visitante || 0),
    0
  );
  const mediaGols = totalJogos > 0 ? (totalGols / totalJogos).toFixed(2) : "0";
  const vitoriasCasa = partidas.filter(
    (p) => (p.gols_casa ?? 0) > (p.gols_visitante ?? 0)
  ).length;
  const vitoriasVisitante = partidas.filter(
    (p) => (p.gols_visitante ?? 0) > (p.gols_casa ?? 0)
  ).length;
  const empates = partidas.filter(
    (p) => (p.gols_casa ?? 0) === (p.gols_visitante ?? 0)
  ).length;

  const mandanteStats = {
    vitorias: vitoriasCasa,
    empates: empates,
    derrotas: vitoriasVisitante,
    golsMarcados: partidas.reduce((acc, p) => acc + (p.gols_casa || 0), 0),
    golsSofridos: partidas.reduce((acc, p) => acc + (p.gols_visitante || 0), 0),
  };

  const visitanteStats = {
    vitorias: vitoriasVisitante,
    empates: empates,
    derrotas: vitoriasCasa,
    golsMarcados: partidas.reduce((acc, p) => acc + (p.gols_visitante || 0), 0),
    golsSofridos: partidas.reduce((acc, p) => acc + (p.gols_casa || 0), 0),
  };

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "24px",
        background: "var(--bg, #f8fafc)",
        color: "var(--fg, #0f172a)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        Últimos jogos - Tabela cruzada
      </h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
            Total de jogos
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{totalJogos}</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
            Média de gols
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{mediaGols}</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
            Vitórias mandante
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{vitoriasCasa}</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
            Empates
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{empates}</div>
        </div>
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>
            Vitórias visitante
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{vitoriasVisitante}</div>
        </div>
      </section>

      <div
        style={{
          overflowX: "auto",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
          background: "white",
          marginBottom: "24px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #e2e8f0",
                  background: "#f1f5f9",
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  minWidth: "140px",
                  textAlign: "left",
                }}
              >
                Mandante \ Visitante
              </th>
              {timesList.map((time) => (
                <th
                  key={time.id}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#f1f5f9",
                    minWidth: "60px",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {time.sigla}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timesList.map((timeCasa, i) => (
              <tr key={timeCasa.id}>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #e2e8f0",
                    position: "sticky",
                    left: 0,
                    background: "white",
                    zIndex: 5,
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  {timeCasa.nome}
                </td>
                {timesList.map((timeVisitante, j) => {
                  const recencyIdx = ultimas5Casa[i].get(`${i}-${j}`);
                  const isDiag = i === j;
                  const bg = isDiag
                    ? "#e2e8f0"
                    : recencyIdx !== undefined
                    ? homeShadeBg[recencyIdx]
                    : "white";
                  const outlineColor =
                    recencyIdx !== undefined ? homeShadeOutline[recencyIdx] : "transparent";

                  return (
                    <td
                      key={timeVisitante.id}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "center",
                        background: bg,
                        outline: `1px solid ${outlineColor}`,
                        outlineOffset: "-2px",
                        fontWeight: recencyIdx !== undefined ? 600 : 400,
                      }}
                    >
                      {isDiag ? "—" : matrixCasa[i][j] ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "32px",
          padding: "12px 16px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          fontSize: "0.8rem",
        }}
      >
        <span style={{ fontWeight: 600 }}>Legenda - Últimos 5 jogos em casa:</span>
        {homeShadeBg.map((bg, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                background: bg,
                outline: `1px solid ${homeShadeOutline[idx]}`,
                outlineOffset: "-1px",
              }}
            />
            <span>{idx + 1}º mais recente</span>
          </div>
        ))}
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "16px",
              color: "#1e293b",
            }}
          >
            Resumo Mandante
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Vitórias</span>
              <strong>{mandanteStats.vitorias}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Empates</span>
              <strong>{mandanteStats.empates}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Derrotas</span>
              <strong>{mandanteStats.derrotas}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Gols marcados</span>
              <strong>{mandanteStats.golsMarcados}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
              }}
            >
              <span>Gols sofridos</span>
              <strong>{mandanteStats.golsSofridos}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "12px",
            background: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "16px",
              color: "#1e293b",
            }}
          >
            Resumo Visitante
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Vitórias</span>
              <strong>{visitanteStats.vitorias}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Empates</span>
              <strong>{visitanteStats.empates}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Derrotas</span>
              <strong>{visitanteStats.derrotas}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <span>Gols marcados</span>
              <strong>{visitanteStats.golsMarcados}</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
              }}
            >
              <span>Gols sofridos</span>
              <strong>{visitanteStats.golsSofridos}</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
