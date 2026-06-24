import { getPartidas, getTimes } from "@/lib/data";
import Head from "next/head";

interface Time {
  id: number | string;
  nome: string;
  sigla?: string;
}

interface Partida {
  id: number | string;
  time_casa_id: number | string;
  time_visitante_id: number | string;
  placar_casa: number;
  placar_visitante: number;
  data?: string;
  rodada?: number;
}

const PSEUDO_IDS = new Set(["outros"]);

export default async function Page() {
  const partidas: Partida[] = await getPartidas();
  const times: Time[] = await getTimes();

  const idx: Record<string | number, number> = {};
  times.forEach((t, i) => {
    idx[t.id] = i;
  });

  const n = times.length;
  const vitorias = Array.from({ length: n }, () => Array(n).fill(0));
  const empates = Array.from({ length: n }, () => Array(n).fill(0));
  const derrotas = Array.from({ length: n }, () => Array(n).fill(0));
  const gols = Array.from({ length: n }, () => Array(n).fill(0));
  const golsContra = Array.from({ length: n }, () => Array(n).fill(0));
  const jogos = Array.from({ length: n }, () => Array(n).fill(0));
  const ultimas5Casa: Record<number, Map<string, number>> = {};

  let totPart = 0;
  let totManVit = 0;
  let totEmp = 0;
  let totVisVit = 0;
  let totGols = 0;
  let totGolsMan = 0;
  let totGolsVis = 0;

  const partidasOrdenadas = [...partidas].sort(
    (a, b) =>
      new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime()
  );

  partidasOrdenadas.forEach((p) => {
    if (PSEUDO_IDS.has(String(p.time_casa_id))) return;
    if (PSEUDO_IDS.has(String(p.time_visitante_id))) return;

    const i = idx[p.time_casa_id];
    const j = idx[p.time_visitante_id];
    if (i === undefined || j === undefined) return;

    jogos[i][j] += 1;
    gols[i][j] += p.placar_casa;
    golsContra[i][j] += p.placar_visitante;
    totGols += p.placar_casa + p.placar_visitante;
    totGolsMan += p.placar_casa;
    totGolsVis += p.placar_visitante;
    totPart += 1;

    if (p.placar_casa > p.placar_visitante) {
      vitorias[i][j] += 1;
      totManVit += 1;
    } else if (p.placar_casa === p.placar_visitante) {
      empates[i][j] += 1;
      totEmp += 1;
    } else {
      derrotas[i][j] += 1;
      totVisVit += 1;
    }

    if (!ultimas5Casa[i]) {
      ultimas5Casa[i] = new Map();
    }
    const map = ultimas5Casa[i];
    if (!map.has(String(j))) {
      map.set(String(j), 0);
    }
    const rec = map.get(String(j)) || 0;
    if (rec < 5) {
      map.set(String(j), rec + 1);
    }
  });

  const homeShadeBg = [
    "#14532d",
    "#166534",
    "#15803d",
    "#16a34a",
    "#22c55e",
  ];

  const statCards = [
    { label: "Jogos", value: totPart, color: "#2563eb" },
    { label: "Vitórias Mandante", value: totManVit, color: "#16a34a" },
    { label: "Empates", value: totEmp, color: "#ca8a04" },
    { label: "Vitórias Visitante", value: totVisVit, color: "#dc2626" },
    { label: "Gols", value: totGols, color: "#9333ea" },
    { label: "Gols Mandante", value: totGolsMan, color: "#0891b2" },
    { label: "Gols Visitante", value: totGolsVis, color: "#ea580c" },
  ];

  const resumoMandante = times
    .map((t, i) => ({
      time: t,
      jogos: jogos[i].reduce((a, b) => a + b, 0),
      vitorias: vitorias[i].reduce((a, b) => a + b, 0),
      empates: empates[i].reduce((a, b) => a + b, 0),
      derrotas: derrotas[i].reduce((a, b) => a + b, 0),
      golsPro: gols[i].reduce((a, b) => a + b, 0),
      golsContra: golsContra[i].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.vitorias - a.vitorias || b.golsPro - a.golsPro);

  const resumoVisitante = times
    .map((t, j) => ({
      time: t,
      jogos: jogos.reduce((a, row) => a + row[j], 0),
      vitorias: jogos.reduce((a, row) => a + vitorias[row.indexOf?.(j) ?? 0] ? row[j] : 0, 0),
      empates: jogos.reduce((a, row) => a + row[j], 0),
      derrotas: jogos.reduce((a, row) => a + row[j], 0),
      golsPro: jogos.reduce((a, row) => a + row[j], 0),
      golsContra: jogos.reduce((a, row) => a + row[j], 0),
    }));

  const resumoVisitanteCorrigido = times
    .map((t, j) => {
      let jogosV = 0;
      let vitoriasV = 0;
      let empatesV = 0;
      let derrotasV = 0;
      let golsProV = 0;
      let golsContraV = 0;
      for (let i = 0; i < n; i++) {
        jogosV += jogos[i][j];
        vitoriasV += vitorias[i][j];
        empatesV += empates[i][j];
        derrotasV += derrotas[i][j];
        golsProV += golsContra[i][j];
        golsContraV += gols[i][j];
      }
      return {
        time: t,
        jogos: jogosV,
        vitorias: vitoriasV,
        empates: empatesV,
        derrotas: derrotasV,
        golsPro: golsProV,
        golsContra: golsContraV,
      };
    })
    .sort((a, b) => b.vitorias - a.vitorias || b.golsPro - a.golsPro);

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </Head>
      <main style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 42 }}>
          Confrontos
        </h1>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {statCards.map((c) => (
            <div
              key={c.label}
              style={{
                background: c.color,
                color: "#fff",
                padding: "16px 24px",
                borderRadius: 8,
                minWidth: 120,
                textAlign: "center",
                fontFamily: "Bebas Neue, sans-serif",
              }}
            >
              <div style={{ fontSize: 28 }}>{c.value}</div>
              <div style={{ fontSize: 14 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16, fontSize: 12, color: "#555" }}>
          <strong>Legenda:</strong> nas células da tabela cruzada, o formato é
          V-E-D (Vitórias-Empates-Derrotas) e gols marcados/sofridos do mandante.
          O tom de verde indica a recência do último confronto em casa (mais
          escuro = mais recente).
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: 8,
                    background: "#f3f4f6",
                  }}
                >
                  Mandante \ Visitante
                </th>
                {times.map((t) => (
                  <th
                    key={String(t.id)}
                    style={{
                      border: "1px solid #ccc",
                      padding: 8,
                      background: "#f3f4f6",
                      minWidth: 60,
                    }}
                  >
                    {t.sigla || t.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t, i) => (
                <tr key={String(t.id)}>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: 8,
                      background: "#f9fafb",
                      fontWeight: "bold",
                      textAlign: "left",
                    }}
                  >
                    {t.nome}
                  </td>
                  {times.map((_, j) => {
                    if (i === j) {
                      return (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            background: "#e5e7eb",
                          }}
                        >
                          —
                        </td>
                      );
                    }
                    const recencyIdx = ultimas5Casa[i]?.get(String(j));
                    const bg = recencyIdx !== undefined ? homeShadeBg[recencyIdx - 1] || "#fff" : "#fff";
                    return (
                      <td
                        key={j}
                        style={{
                          border: "1px solid #ccc",
                          padding: 8,
                          background: bg,
                          color: bg !== "#fff" ? "#fff" : "#111",
                          minWidth: 70,
                        }}
                      >
                        {jogos[i][j] > 0 ? (
                          <>
                            {vitorias[i][j]}-{empates[i][j]}-{derrotas[i][j]}
                            <br />
                            {gols[i][j]}x{golsContra[i][j]}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28 }}>
              Resumo Mandante
            </h2>
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Time</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>J</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>V</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>E</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>D</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>GP</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>GC</th>
                </tr>
              </thead>
              <tbody>
                {resumoMandante.map((r) => (
                  <tr key={String(r.time.id)}>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.time.nome}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.jogos}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.vitorias}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.empates}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.derrotas}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.golsPro}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.golsContra}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28 }}>
              Resumo Visitante
            </h2>
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>Time</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>J</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>V</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>E</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>D</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>GP</th>
                  <th style={{ border: "1px solid #ccc", padding: 8 }}>GC</th>
                </tr>
              </thead>
              <tbody>
                {resumoVisitanteCorrigido.map((r) => (
                  <tr key={String(r.time.id)}>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.time.nome}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.jogos}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.vitorias}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.empates}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.derrotas}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.golsPro}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: 8 }}>
                      {r.golsContra}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
