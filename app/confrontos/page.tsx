"use client";

import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

// ------------------------------------------------------------------
// Tipos exatos do original (2026)
// ------------------------------------------------------------------
interface Time {
  id: number;
  nome: string;
  sigla?: string;
  escudo?: string;
}

interface Partida {
  time_casa_id: number;
  time_visitante_id: number;
  placar_casa: number;
  placar_visitante: number;
  status: string;
  data: string;
  hora: string;
}

interface Estatisticas {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
  pontos: number;
}

// ------------------------------------------------------------------
// Constantes do original (PSEUDO_IDS e paleta 2026)
// ------------------------------------------------------------------
const PSEUDO_IDS: Record<string | number, number> = {};

const homeShadeBg = [
  "rgba(34,197,94,0.85)", // 0 – mais recente
  "rgba(34,197,94,0.70)",
  "rgba(34,197,94,0.55)",
  "rgba(34,197,94,0.40)",
  "rgba(34,197,94,0.25)", // 4 – mais antigo
];

const awayShadeBg = [
  "rgba(239,68,68,0.85)",
  "rgba(239,68,68,0.70)",
  "rgba(239,68,68,0.55)",
  "rgba(239,68,68,0.40)",
  "rgba(239,68,68,0.25)",
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function parseDateTime(p: Partida): Date {
  const [d, m, y] = p.data.split("/").map(Number);
  const [hh, mm] = (p.hora || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

function computeStats(partidas: Partida[], times: Time[]) {
  const geral: Record<number, Estatisticas> = {};
  const mandante: Record<number, Estatisticas> = {};
  const visitante: Record<number, Estatisticas> = {};

  times.forEach((t) => {
    const base = {
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      gols_pro: 0,
      gols_contra: 0,
      saldo: 0,
      pontos: 0,
    };
    geral[t.id] = { ...base };
    mandante[t.id] = { ...base };
    visitante[t.id] = { ...base };
  });

  const encerradas = partidas.filter((p) => p.status === "encerrada");

  encerradas.forEach((p) => {
    const casa = p.time_casa_id;
    const fora = p.time_visitante_id;
    const gc = Number(p.placar_casa) || 0;
    const gf = Number(p.placar_visitante) || 0;

    [geral, mandante].forEach((map) => {
      if (!map[casa]) return;
      map[casa].jogos += 1;
      map[casa].gols_pro += gc;
      map[casa].gols_contra += gf;
      if (gc > gf) {
        map[casa].vitorias += 1;
        map[casa].pontos += 3;
      } else if (gc === gf) {
        map[casa].empates += 1;
        map[casa].pontos += 1;
      } else {
        map[casa].derrotas += 1;
      }
    });

    [geral, visitante].forEach((map) => {
      if (!map[fora]) return;
      map[fora].jogos += 1;
      map[fora].gols_pro += gf;
      map[fora].gols_contra += gc;
      if (gf > gc) {
        map[fora].vitorias += 1;
        map[fora].pontos += 3;
      } else if (gf === gc) {
        map[fora].empates += 1;
        map[fora].pontos += 1;
      } else {
        map[fora].derrotas += 1;
      }
    });
  });

  Object.values(geral).forEach((s) => (s.saldo = s.gols_pro - s.gols_contra));
  Object.values(mandante).forEach((s) => (s.saldo = s.gols_pro - s.gols_contra));
  Object.values(visitante).forEach((s) => (s.saldo = s.gols_pro - s.gols_contra));

  return { geral, mandante, visitante, encerradas };
}

// ------------------------------------------------------------------
// Componente da página
// ------------------------------------------------------------------
export default function ConfrontosPage() {
  const [times, setTimes] = useState<Time[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/confrontos");
        if (!res.ok) throw new Error("Erro ao carregar dados");
        const json = await res.json();
        setTimes(json.times || []);
        setPartidas(json.partidas || []);
      } catch (e) {
        // fallback silencioso para evitar quebrar a página
        setTimes([]);
        setPartidas([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { geral, mandante, visitante, encerradas } = useMemo(
    () => computeStats(partidas, times),
    [partidas, times]
  );

  const ultimas5Casa: Record<number, Map<string, number>> = useMemo(() => {
    const map: Record<number, Map<string, number>> = {};

    const encerradasOrdenadas = encerradas
      .slice()
      .sort((a, b) => parseDateTime(b).getTime() - parseDateTime(a).getTime());

    times.forEach((time) => {
      const jogosComoMandante = encerradasOrdenadas.filter(
        (p) => p.time_casa_id === time.id
      );
      const ultimos5 = jogosComoMandante.slice(0, 5);
      const visitanteMap = new Map<string, number>();
      ultimos5.forEach((p, index) => {
        visitanteMap.set(String(p.time_visitante_id), index);
      });
      map[time.id] = visitanteMap;
    });

    return map;
  }, [encerradas, times]);

  const ultimas5Fora: Record<number, Map<string, number>> = useMemo(() => {
    const map: Record<number, Map<string, number>> = {};

    const encerradasOrdenadas = encerradas
      .slice()
      .sort((a, b) => parseDateTime(b).getTime() - parseDateTime(a).getTime());

    times.forEach((time) => {
      const jogosComoVisitante = encerradasOrdenadas.filter(
        (p) => p.time_visitante_id === time.id
      );
      const ultimos5 = jogosComoVisitante.slice(0, 5);
      const casaMap = new Map<string, number>();
      ultimos5.forEach((p, index) => {
        casaMap.set(String(p.time_casa_id), index);
      });
      map[time.id] = casaMap;
    });

    return map;
  }, [encerradas, times]);

  const totalJogos = encerradas.length;
  const totalVitorias = Object.values(geral).reduce((a, s) => a + s.vitorias, 0);
  const totalEmpates = Object.values(geral).reduce((a, s) => a + s.empates, 0);
  const totalDerrotas = Object.values(geral).reduce((a, s) => a + s.derrotas, 0);
  const totalGolsPro = Object.values(geral).reduce((a, s) => a + s.gols_pro, 0);
  const totalGolsContra = Object.values(geral).reduce(
    (a, s) => a + s.gols_contra,
    0
  );
  const totalSaldo = totalGolsPro - totalGolsContra;

  const classificacaoMandante = useMemo(
    () =>
      Object.entries(mandante)
        .map(([id, stats]) => ({
          id: Number(id),
          ...stats,
        }))
        .sort((a, b) => {
          if (b.pontos !== a.pontos) return b.pontos - a.pontos;
          if (b.saldo !== a.saldo) return b.saldo - a.saldo;
          return b.gols_pro - a.gols_pro;
        }),
    [mandante]
  );

  const classificacaoVisitante = useMemo(
    () =>
      Object.entries(visitante)
        .map(([id, stats]) => ({
          id: Number(id),
          ...stats,
        }))
        .sort((a, b) => {
          if (b.pontos !== a.pontos) return b.pontos - a.pontos;
          if (b.saldo !== a.saldo) return b.saldo - a.saldo;
          return b.gols_pro - a.gols_pro;
        }),
    [visitante]
  );

  const confrontoKey = (casaId: number, foraId: number) =>
    `${casaId}-${foraId}`;

  const resultados Cruzados = useMemo(() => {
    const map: Record<string, { gc: number; gf: number; status: string }> = {};
    partidas.forEach((p) => {
      map[confrontoKey(p.time_casa_id, p.time_visitante_id)] = {
        gc: Number(p.placar_casa) || 0,
        gf: Number(p.placar_visitante) || 0,
        status: p.status,
      };
    });
    return map;
  }, [partidas]);

  const findResult = (casaId: number, foraId: number) =>
    resultados Cruzados[confrontoKey(casaId, foraId)];

  const renderCelula = (casaId: number, foraId: number) => {
    if (casaId === foraId) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#e5e7eb",
          }}
        />
      );
    }

    const res = findResult(casaId, foraId);
    if (!res || res.status !== "encerrada") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          -
        </div>
      );
    }

    const recencyIdx = ultimas5Casa[casaId]?.get(String(foraId));
    const bg = recencyIdx !== undefined ? homeShadeBg[recencyIdx] : "transparent";
    const corTexto = recencyIdx !== undefined ? "#111827" : "#374151";

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          color: corTexto,
          background: bg,
        }}
      >
        {res.gc} x {res.gf}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 24,
        }}
      >
        Carregando confrontos 2026...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Confrontos 2026</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "#f8fafc",
          fontFamily: "Bebas Neue, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: 40,
            textAlign: "center",
            marginBottom: 24,
            color: "#0f172a",
            letterSpacing: 1,
          }}
        >
          Confrontos 2026
        </h1>

        {/* Barra de estatísticas - 7 cards coloridos */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {[
            { label: "Jogos", value: totalJogos, bg: "#3b82f6" },
            { label: "Vitórias", value: totalVitorias, bg: "#22c55e" },
            { label: "Empates", value: totalEmpates, bg: "#eab308" },
            { label: "Derrotas", value: totalDerrotas, bg: "#ef4444" },
            { label: "Gols Pró", value: totalGolsPro, bg: "#06b6d4" },
            { label: "Gols Contra", value: totalGolsContra, bg: "#f97316" },
            { label: "Saldo", value: totalSaldo, bg: "#8b5cf6" },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                background: card.bg,
                color: "#fff",
                borderRadius: 8,
                padding: 16,
                textAlign: "center",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: 14,
                  marginTop: 6,
                  opacity: 0.95,
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </section>

        {/* Tabela cruzada de confrontos */}
        <section
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            overflowX: "auto",
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              marginBottom: 16,
              color: "#1e293b",
            }}
          >
            Tabela Cruzada de Confrontos
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "Bebas Neue, sans-serif",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #e2e8f0",
                    padding: 8,
                    background: "#f1f5f9",
                    fontSize: 13,
                    minWidth: 140,
                  }}
                >
                  Mandante \ Visitante
                </th>
                {times.map((t) => (
                  <th
                    key={t.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: 8,
                      background: "#f1f5f9",
                      fontSize: 12,
                      minWidth: 56,
                    }}
                    title={t.nome}
                  >
                    {t.sigla || t.nome.slice(0, 3).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((casa) => (
                <tr key={casa.id}>
                  <td
                    style={{
                      border: "1px solid #e2e8f0",
                      padding: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#f8fafc",
                      textAlign: "left",
                    }}
                  >
                    {casa.nome}
                  </td>
                  {times.map((fora) => (
                    <td
                      key={fora.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: 0,
                        width: 56,
                        height: 40,
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {renderCelula(casa.id, fora.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Tabelas de resumo inferior - Mandante e Visitante */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: 24,
                marginBottom: 16,
                color: "#1e293b",
              }}
            >
              Classificação Mandante
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["#", "Time", "J", "V", "E", "D", "GP", "GC", "SG", "PTS"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: h === "#" || h === "Time" ? "left" : "center",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {classificacaoMandante.map((row, index) => {
                  const time = times.find((t) => t.id === row.id);
                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        {time?.nome || "Desconhecido"}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.jogos}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.vitorias}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.empates}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.derrotas}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.gols_pro}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.gols_contra}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 700,
                        }}
                      >
                        {row.saldo}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 700,
                          background: "#ecfdf5",
                        }}
                      >
                        {row.pontos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontSize: 24,
                marginBottom: 16,
                color: "#1e293b",
              }}
            >
              Classificação Visitante
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["#", "Time", "J", "V", "E", "D", "GP", "GC", "SG", "PTS"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: h === "#" || h === "Time" ? "left" : "center",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {classificacaoVisitante.map((row, index) => {
                  const time = times.find((t) => t.id === row.id);
                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                        {time?.nome || "Desconhecido"}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.jogos}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.vitorias}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.empates}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.derrotas}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.gols_pro}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {row.gols_contra}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 700,
                        }}
                      >
                        {row.saldo}
                      </td>
                      <td
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 700,
                          background: "#fef2f2",
                        }}
                      >
                        {row.pontos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer
          style={{
            marginTop: 40,
            textAlign: "center",
            fontSize: 14,
            color: "#64748b",
          }}
        >
          Dados 2026 - Últimos 5 jogos como mandante destacados em degradê
        </footer>
      </main>
    </>
  );
}
