import React, { useEffect, useMemo, useState } from 'react';
import { times, confrontos } from '@/lib/data';

interface Time {
  id: number;
  nome: string;
  sigla?: string;
  cor?: string;
  escudo?: string;
}

interface Confronto {
  id: number;
  time_casa_id: number;
  time_visitante_id: number;
  placar_casa: number;
  placar_visitante: number;
  status: string;
  data: string;
  hora: string;
}

const PSEUDO_IDS = new Set(['outros']);

export default function ConfrontosPage(): JSX.Element {
  const [lista, setLista] = useState<Confronto[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const dados = await confrontos();
        if (ativo) setLista(dados as Confronto[]);
      } catch (e) {
        console.error('Erro ao carregar confrontos:', e);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const timesMap = useMemo(() => {
    const mapa: Record<number, Time> = {};
    const listaTimes = times() as Time[];
    for (let i = 0; i < listaTimes.length; i++) {
      const t = listaTimes[i];
      if (t && typeof t.id === 'number') {
        mapa[t.id] = t;
      }
    }
    return mapa;
  }, []);

  const {
    totalJogos,
    totalVitoriasCasa,
    totalEmpates,
    totalVitoriasFora,
    totalGols,
    mediaGols,
    aproveitamentoMandante,
  } = useMemo(() => {
    let jogos = 0;
    let vitoriasCasa = 0;
    let empates = 0;
    let vitoriasFora = 0;
    let gols = 0;
    let pontosMandantePossiveis = 0;
    let pontosMandanteGanhos = 0;

    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (!c || c.status !== 'finalizado') continue;
      jogos++;
      gols = gols + c.placar_casa + c.placar_visitante;
      pontosMandantePossiveis = pontosMandantePossiveis + 3;

      if (c.placar_casa > c.placar_visitante) {
        vitoriasCasa++;
        pontosMandanteGanhos = pontosMandanteGanhos + 3;
      } else if (c.placar_casa < c.placar_visitante) {
        vitoriasFora++;
      } else {
        empates++;
        pontosMandanteGanhos = pontosMandanteGanhos + 1;
      }
    }

    const media = jogos > 0 ? Number((gols / jogos).toFixed(2)) : 0;
    const aproveitamento =
      pontosMandantePossiveis > 0
        ? Number(((pontosMandanteGanhos / pontosMandantePossiveis) * 100).toFixed(1))
        : 0;

    return {
      totalJogos: jogos,
      totalVitoriasCasa: vitoriasCasa,
      totalEmpates: empates,
      totalVitoriasFora: vitoriasFora,
      totalGols: gols,
      mediaGols: media,
      aproveitamentoMandante: aproveitamento,
    };
  }, [lista]);

  const resultadosCruzados = useMemo(() => {
    const mapa: Record<string, { v: number; e: number; d: number; gp: number; gc: number }> = {};

    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (!c || c.status !== 'finalizado') continue;
      const chave = `${c.time_casa_id}x${c.time_visitante_id}`;
      if (!mapa[chave]) {
        mapa[chave] = { v: 0, e: 0, d: 0, gp: 0, gc: 0 };
      }
      const item = mapa[chave];
      item.gp = item.gp + c.placar_casa;
      item.gc = item.gc + c.placar_visitante;
      if (c.placar_casa > c.placar_visitante) item.v++;
      else if (c.placar_casa < c.placar_visitante) item.d++;
      else item.e++;
    }

    return mapa;
  }, [lista]);

  const ultimas5Casa = useMemo<Record<number, Map<string, number>>>(() => {
    const mapa: Record<number, Map<string, number>> = {};

    const porMandante: Record<number, Confronto[]> = {};
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (!c || c.status !== 'finalizado') continue;
      if (!porMandante[c.time_casa_id]) porMandante[c.time_casa_id] = [];
      porMandante[c.time_casa_id].push(c);
    }

    const chaves = Object.keys(porMandante);
    for (let i = 0; i < chaves.length; i++) {
      const timeId = Number(chaves[i]);
      const jogosTime = porMandante[timeId];
      const ultimos = jogosTime.slice(-5);
      const degrades = new Map<string, number>();

      for (let j = 0; j < ultimos.length; j++) {
        const c = ultimos[j];
        const chave = `${c.data}T${c.hora}`;
        const peso = j + 1;
        degrades.set(chave, peso);
      }
      mapa[timeId] = degrades;
    }

    return mapa;
  }, [lista]);

  const resumoMandante = useMemo(() => {
    const mapa: Record<number, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; nome: string }> = {};

    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (!c || c.status !== 'finalizado') continue;
      const id = c.time_casa_id;
      if (!mapa[id]) {
        const t = timesMap[id];
        mapa[id] = { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, nome: t ? t.nome : `Time ${id}` };
      }
      const item = mapa[id];
      item.j++;
      item.gp = item.gp + c.placar_casa;
      item.gc = item.gc + c.placar_visitante;
      if (c.placar_casa > c.placar_visitante) {
        item.v++;
        item.p = item.p + 3;
      } else if (c.placar_casa < c.placar_visitante) {
        item.d++;
      } else {
        item.e++;
        item.p = item.p + 1;
      }
      item.sg = item.gp - item.gc;
    }

    const arr = Object.values(mapa);
    arr.sort((a, b) => {
      if (b.p !== a.p) return b.p - a.p;
      return b.sg - a.sg;
    });
    return arr;
  }, [lista, timesMap]);

  const resumoVisitante = useMemo(() => {
    const mapa: Record<number, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number; sg: number; nome: string }> = {};

    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (!c || c.status !== 'finalizado') continue;
      const id = c.time_visitante_id;
      if (!mapa[id]) {
        const t = timesMap[id];
        mapa[id] = { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, nome: t ? t.nome : `Time ${id}` };
      }
      const item = mapa[id];
      item.j++;
      item.gp = item.gp + c.placar_visitante;
      item.gc = item.gc + c.placar_casa;
      if (c.placar_visitante > c.placar_casa) {
        item.v++;
        item.p = item.p + 3;
      } else if (c.placar_visitante < c.placar_casa) {
        item.d++;
      } else {
        item.e++;
        item.p = item.p + 1;
      }
      item.sg = item.gp - item.gc;
    }

    const arr = Object.values(mapa);
    arr.sort((a, b) => {
      if (b.p !== a.p) return b.p - a.p;
      return b.sg - a.sg;
    });
    return arr;
  }, [lista, timesMap]);

  if (carregando) {
    return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Carregando confrontos...</div>;
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 42, marginBottom: 24, color: '#1a1a1a' }}>
        Confrontos
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 32 }}>
        <div style={{ background: '#1e3a8a', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{totalJogos}</div>
          <div style={{ fontSize: 14 }}>Jogos</div>
        </div>
        <div style={{ background: '#166534', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{totalVitoriasCasa}</div>
          <div style={{ fontSize: 14 }}>Vitórias Casa</div>
        </div>
        <div style={{ background: '#ca8a04', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{totalEmpates}</div>
          <div style={{ fontSize: 14 }}>Empates</div>
        </div>
        <div style={{ background: '#7f1d1d', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{totalVitoriasFora}</div>
          <div style={{ fontSize: 14 }}>Vitórias Fora</div>
        </div>
        <div style={{ background: '#4338ca', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{totalGols}</div>
          <div style={{ fontSize: 14 }}>Gols</div>
        </div>
        <div style={{ background: '#0f766e', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{mediaGols}</div>
          <div style={{ fontSize: 14 }}>Média Gols</div>
        </div>
        <div style={{ background: '#c2410c', color: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', fontFamily: 'Bebas Neue, sans-serif' }}>
          <div style={{ fontSize: 28 }}>{aproveitamentoMandante}%</div>
          <div style={{ fontSize: 14 }}>Aproveitamento Mandante</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, marginBottom: 12 }}>Resumo Mandante</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Time</th>
                <th style={{ padding: 8, textAlign: 'center' }}>P</th>
                <th style={{ padding: 8, textAlign: 'center' }}>J</th>
                <th style={{ padding: 8, textAlign: 'center' }}>V</th>
                <th style={{ padding: 8, textAlign: 'center' }}>E</th>
                <th style={{ padding: 8, textAlign: 'center' }}>D</th>
                <th style={{ padding: 8, textAlign: 'center' }}>SG</th>
              </tr>
            </thead>
            <tbody>
              {resumoMandante.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{item.nome}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.p}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.j}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.v}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.e}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.d}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.sg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, marginBottom: 12 }}>Resumo Visitante</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Time</th>
                <th style={{ padding: 8, textAlign: 'center' }}>P</th>
                <th style={{ padding: 8, textAlign: 'center' }}>J</th>
                <th style={{ padding: 8, textAlign: 'center' }}>V</th>
                <th style={{ padding: 8, textAlign: 'center' }}>E</th>
                <th style={{ padding: 8, textAlign: 'center' }}>D</th>
                <th style={{ padding: 8, textAlign: 'center' }}>SG</th>
              </tr>
            </thead>
            <tbody>
              {resumoVisitante.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{item.nome}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.p}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.j}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.v}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.e}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.d}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{item.sg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, marginBottom: 12 }}>Lista de Confrontos</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lista.map((c) => {
            const casa = timesMap[c.time_casa_id];
            const visitante = timesMap[c.time_visitante_id];
            const degrades = ultimas5Casa[c.time_casa_id];
            const peso = degrades ? degrades.get(`${c.data}T${c.hora}`) : undefined;
            const opacidade = peso ? 0.4 + peso * 0.12 : 1;
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 6,
                  background: `rgba(30, 58, 138, ${opacidade})`,
                  color: '#fff',
                }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>{casa ? casa.nome : c.time_casa_id}</div>
                <div style={{ fontWeight: 'bold', fontSize: 20, minWidth: 80, textAlign: 'center' }}>
                  {c.placar_casa} x {c.placar_visitante}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>{visitante ? visitante.nome : c.time_visitante_id}</div>
                <div style={{ minWidth: 120, textAlign: 'right', fontSize: 12, opacity: 0.8 }}>
                  {c.data} {c.hora}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
