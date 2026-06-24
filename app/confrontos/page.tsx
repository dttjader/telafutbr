import { getPartidas, getTimes } from "@/lib/data";

interface Partida {
  id?: string | number;
  time_casa_id: string | number;
  time_visitante_id: string | number;
  gols_casa: number;
  gols_visitante: number;
  data?: string;
}

interface Time {
  id: string | number;
  nome: string;
}

const PSEUDO_IDS = new Set(["outros"]);

export default async function ConfrontosPage() {
  const partidas: Partida[] = await getPartidas();
  const times: Time[] = await getTimes();

  const idx: Record<string | number, number> = {};
  times.forEach((t, i) => {
    idx[t.id] = i;
  });

  const n = times.length;

  let totPart = 0;
  let totManVit = 0;
  let totEmp = 0;
  let totVisVit = 0;
  let totGols = 0;
  let totGolsMan = 0;
  let totGolsVis = 0;

  const mMat: Array<Array<{ jc: number; jf: number; gc: number; gf: number; recency: number } | null>> = Array.from({ length: n }, () => Array.from({ length: n }, () => null));
  const homeStats: Array<{ pj: number; v: number; e: number; d: number; gp: number; gc: number; pts: number; saldo: number }> = Array.from({ length: n }, () => ({ pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, saldo: 0 }));
  const awayStats: Array<{ pj: number; v: number; e: number; d: number; gp: number; gc: number; pts: number; saldo: number }> = Array.from({ length: n }, () => ({ pj: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, saldo: 0 }));

  const now = Date.now();

  partidas.forEach((p) => {
    const cid = p.time_casa_id;
    const vid = p.time_visitante_id;
    if (PSEUDO_IDS.has(String(cid)) || PSEUDO_IDS.has(String(vid))) return;

    const i = idx[cid];
    const j = idx[vid];
    if (i === undefined || j === undefined) return;

    const gc = Number(p.gols_casa) || 0;
    const gf = Number(p.gols_visitante) || 0;

    totPart += 1;
    totGols += gc + gf;
    totGolsMan += gc;
    totGolsVis += gf;

    if (gc > gf) {
      totManVit += 1;
      homeStats[i].v += 1;
      homeStats[i].pts += 3;
      awayStats[j].d += 1;
    } else if (gc === gf) {
      totEmp += 1;
      homeStats[i].e += 1;
      homeStats[i].pts += 1;
      awayStats[j].e += 1;
      awayStats[j].pts += 1;
    } else {
      totVisVit += 1;
      homeStats[i].d += 1;
      awayStats[j].v += 1;
      awayStats[j].pts += 3;
    }

    homeStats[i].pj += 1;
    homeStats[i].gp += gc;
    homeStats[i].gc += gf;
    homeStats[i].saldo += gc - gf;

    awayStats[j].pj += 1;
    awayStats[j].gp += gf;
    awayStats[j].gc += gc;
    awayStats[j].saldo += gf - gc;

    const recency = p.data ? (now - new Date(p.data).getTime()) / (1000 * 60 * 60 * 24) : 9999;

    const existing = mMat[i][j];
    if (existing) {
      existing.jc += 1;
      existing.gc += gc;
      existing.gf += gf;
      if (recency < existing.recency) existing.recency = recency;
    } else {
      mMat[i][j] = { jc: 1, jf: 0, gc, gf, recency };
    }
  });

  const homeShadeBg = (recency: number) => {
    if (recency <= 30) return "linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)";
    if (recency <= 90) return "linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)";
    if (recency <= 180) return "linear-gradient(135deg, #558b2f 0%, #9ccc65 100%)";
    if (recency <= 365) return "linear-gradient(135deg, #f9a825 0%, #ffee58 100%)";
    return "linear-gradient(135deg, #c62828 0%, #ef5350 100%)";
  };

  const statCards = [
    { label: "JOGOS", value: totPart, color: "#0d47a1" },
    { label: "VITÓRIAS MANDANTE", value: totManVit, color: "#1b5e20" },
    { label: "EMPATES", value: totEmp, color: "#f9a825" },
    { label: "VITÓRIAS VISITANTE", value: totVisVit, color: "#c62828" },
    { label: "GOLS TOTAIS", value: totGols, color: "#4a148c" },
    { label: "GOLS MANDANTE", value: totGolsMan, color: "#006064" },
    { label: "GOLS VISITANTE", value: totGolsVis, color: "#bf360c" },
  ];

  const homeRank = times
    .map((t, i) => ({ ...t, i, ...homeStats[i] }))
    .filter((x) => x.pj > 0)
    .sort((a, b) => b.pts - a.pts || b.saldo - a.saldo || b.gp - a.gp);

  const awayRank = times
    .map((t, i) => ({ ...t, i, ...awayStats[i] }))
    .filter((x) => x.pj > 0)
    .sort((a, b) => b.pts - a.pts || b.saldo - a.saldo || b.gp - a.gp);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#f5f5f5",
        fontFamily: "'Bebas Neue', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <h1
        style={{
          fontSize: "48px",
          textAlign: "center",
          marginBottom: "24px",
          letterSpacing: "2px",
          color: "#212121",
        }}
      >
        CONFRONTOS
      </h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {statCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: card.color,
              color: "#fff",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "4px" }}>{card.value}</div>
            <div style={{ fontSize: "18px", opacity: 0.9 }}>{card.label}</div>
          </div>
        ))}
      </section>

      <section style={{ overflowX: "auto", marginBottom: "32px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#263238" }}>
              <th
                style={{
                  padding: "12px",
                  color: "#fff",
                  fontSize: "18px",
                  border: "1px solid #37474f",
                  minWidth: "180px",
                }}
              >
                MANDANTE \ VISITANTE
              </th>
              {times.map((t) => (
                <th
                  key={t.id}
                  style={{
                    padding: "12px",
                    color: "#fff",
                    fontSize: "16px",
                    border: "1px solid #37474f",
                    minWidth: "100px",
                  }}
                >
                  {t.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((tCasa, i) => (
              <tr key={tCasa.id}>
                <td
                  style={{
                    padding: "12px",
                    fontWeight: "bold",
                    backgroundColor: "#eceff1",
                    border: "1px solid #b0bec5",
                    fontSize: "18px",
                  }}
                >
                  {tCasa.nome}
                </td>
                {times.map((tVis, j) => {
                  const cell = i === j ? null : mMat[i][j];
                  return (
                    <td
                      key={tVis.id}
                      style={{
                        padding: "8px",
                        border: "1px solid #b0bec5",
                        textAlign: "center",
                        fontSize: "16px",
                        background: cell ? homeShadeBg(cell.recency) : "#cfd8dc",
                        color: cell ? "#fff" : "#90a4ae",
                      }}
                    >
                      {i === j ? "—" : cell ? `${cell.gc} x ${cell.gf}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "16px",
              color: "#1b5e20",
              borderBottom: "2px solid #1b5e20",
              paddingBottom: "8px",
            }}
          >
            MANDANTE
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#1b5e20", color: "#fff" }}>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>#</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c", textAlign: "left" }}>TIME</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>J</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>V</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>E</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>D</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>GP</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>GC</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>SG</th>
                <th style={{ padding: "8px", border: "1px solid #388e3c" }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {homeRank.map((t, pos) => (
                <tr key={t.id} style={{ backgroundColor: pos % 2 === 0 ? "#f1f8e9" : "#fff" }}>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{pos + 1}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9" }}>{t.nome}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.pj}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.v}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.e}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.d}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.gp}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.gc}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center" }}>{t.saldo}</td>
                  <td style={{ padding: "8px", border: "1px solid #c8e6c9", textAlign: "center", fontWeight: "bold" }}>{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "16px",
              color: "#c62828",
              borderBottom: "2px solid #c62828",
              paddingBottom: "8px",
            }}
          >
            VISITANTE
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#c62828", color: "#fff" }}>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>#</th>
                <th style={{ padding: "8px", border: "1px solid #e53935", textAlign: "left" }}>TIME</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>J</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>V</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>E</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>D</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>GP</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>GC</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>SG</th>
                <th style={{ padding: "8px", border: "1px solid #e53935" }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {awayRank.map((t, pos) => (
                <tr key={t.id} style={{ backgroundColor: pos % 2 === 0 ? "#ffebee" : "#fff" }}>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{pos + 1}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2" }}>{t.nome}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.pj}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.v}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.e}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.d}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.gp}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.gc}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center" }}>{t.saldo}</td>
                  <td style={{ padding: "8px", border: "1px solid #ffcdd2", textAlign: "center", fontWeight: "bold" }}>{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
