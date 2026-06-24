import { times, confrontos } from '@/lib/data';

const PSEUDO_IDS = ['outros'];

interface Time {
  id: string | number;
  nome: string;
  cor: string;
}

interface Confronto {
  id: number;
  data: string;
  timeA: Time | string | number;
  timeB: Time | string | number;
  golsA: number;
  golsB: number;
  mandante: 'A' | 'B';
}

export default function ConfrontosPage() {
  // Filtra apenas confrontos válidos, ignorando pseudo-times como 'outros'
  const confrontosValidos = confrontos.filter((jogo: Confronto) => {
    const idA = typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA;
    const idB = typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB;
    return !PSEUDO_IDS.includes(String(idA)) && !PSEUDO_IDS.includes(String(idB));
  });

  const totalJogos = confrontosValidos.length;
  const totalGols = confrontosValidos.reduce((acc: number, jogo: Confronto) => acc + jogo.golsA + jogo.golsB, 0);
  const mediaGols = totalJogos ? (totalGols / totalJogos).toFixed(2) : '0.00';
  const vitoriasMandante = confrontosValidos.filter((jogo: Confronto) => {
    if (jogo.mandante === 'A') return jogo.golsA > jogo.golsB;
    return jogo.golsB > jogo.golsA;
  }).length;
  const empates = confrontosValidos.filter((jogo: Confronto) => jogo.golsA === jogo.golsB).length;
  const vitoriasVisitante = totalJogos - vitoriasMandante - empates;
  const maiorGoleada = confrontosValidos.reduce((acc: number, jogo: Confronto) => {
    return Math.max(acc, Math.abs(jogo.golsA - jogo.golsB));
  }, 0);
  const primeiroJogo = confrontosValidos[0];

  // Índice de recência dos confrontos em casa usando Map (0 = mais recente)
  const ultimas5Casa = new Map<string | number, number>();
  const ultimosCasa = confrontosValidos
    .slice()
    .sort((a: Confronto, b: Confronto) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .filter((jogo: Confronto) => {
      const mandanteId = jogo.mandante === 'A'
        ? (typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA)
        : (typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB);
      return !PSEUDO_IDS.includes(String(mandanteId));
    });

  ultimosCasa.forEach((jogo: Confronto, index: number) => {
    const mandanteId = jogo.mandante === 'A'
      ? (typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA)
      : (typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB);
    if (!ultimas5Casa.has(mandanteId)) {
      ultimas5Casa.set(mandanteId, Math.min(index, 4));
    }
  });

  // CORREÇÃO: idx indexado por time.id (string | number)
  const idx: Record<string | number, number> = {};
  times.forEach((time: Time, index: number) => {
    idx[time.id] = index;
  });

  const tabelaCruzada: number[][] = Array(times.length)
    .fill(null)
    .map(() => Array(times.length).fill(0));

  confrontosValidos.forEach((jogo: Confronto) => {
    const idA = typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA;
    const idB = typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB;
    const mandanteId = jogo.mandante === 'A' ? idA : idB;
    const visitanteId = jogo.mandante === 'A' ? idB : idA;
    const golsMandante = jogo.mandante === 'A' ? jogo.golsA : jogo.golsB;
    const golsVisitante = jogo.mandante === 'A' ? jogo.golsB : jogo.golsA;

    if (idx[mandanteId] !== undefined && idx[visitanteId] !== undefined) {
      tabelaCruzada[idx[mandanteId]][idx[visitanteId]] += golsMandante;
      tabelaCruzada[idx[visitanteId]][idx[mandanteId]] += golsVisitante;
    }
  });

  const resumoMandante = times.map((time: Time) => {
    const i = idx[time.id];
    const jogosCasa = confrontosValidos.filter((jogo: Confronto) => {
      const mandanteId = jogo.mandante === 'A'
        ? (typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA)
        : (typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB);
      return mandanteId === time.id;
    });
    const vitorias = jogosCasa.filter((jogo: Confronto) => {
      const golsMandante = jogo.mandante === 'A' ? jogo.golsA : jogo.golsB;
      const golsVisitante = jogo.mandante === 'A' ? jogo.golsB : jogo.golsA;
      return golsMandante > golsVisitante;
    }).length;
    const golsFeitos = jogosCasa.reduce((acc: number, jogo: Confronto) => {
      return acc + (jogo.mandante === 'A' ? jogo.golsA : jogo.golsB);
    }, 0);
    const golsSofridos = jogosCasa.reduce((acc: number, jogo: Confronto) => {
      return acc + (jogo.mandante === 'A' ? jogo.golsB : jogo.golsA);
    }, 0);
    return { time, jogos: jogosCasa.length, vitorias, golsFeitos, golsSofridos, saldo: golsFeitos - golsSofridos };
  }).sort((a, b) => b.vitorias - a.vitorias || b.saldo - a.saldo);

  const resumoVisitante = times.map((time: Time) => {
    const jogosFora = confrontosValidos.filter((jogo: Confronto) => {
      const visitanteId = jogo.mandante === 'A'
        ? (typeof jogo.timeB === 'object' ? jogo.timeB.id : jogo.timeB)
        : (typeof jogo.timeA === 'object' ? jogo.timeA.id : jogo.timeA);
      return visitanteId === time.id;
    });
    const vitorias = jogosFora.filter((jogo: Confronto) => {
      const golsMandante = jogo.mandante === 'A' ? jogo.golsA : jogo.golsB;
      const golsVisitante = jogo.mandante === 'A' ? jogo.golsB : jogo.golsA;
      return golsVisitante > golsMandante;
    }).length;
    const golsFeitos = jogosFora.reduce((acc: number, jogo: Confronto) => {
      return acc + (jogo.mandante === 'A' ? jogo.golsB : jogo.golsA);
    }, 0);
    const golsSofridos = jogosFora.reduce((acc: number, jogo: Confronto) => {
      return acc + (jogo.mandante === 'A' ? jogo.golsA : jogo.golsB);
    }, 0);
    return { time, jogos: jogosFora.length, vitorias, golsFeitos, golsSofridos, saldo: golsFeitos - golsSofridos };
  }).sort((a, b) => b.vitorias - a.vitorias || b.saldo - a.saldo);

  const homeShadeBg = (time: Time) => {
    const recencia = ultimas5Casa.get(time.id);
    if (recencia === undefined) return 'transparent';
    const opacity = 1 - recencia * 0.18;
    return `rgba(0, 128, 0, ${opacity.toFixed(2)})`;
  };

  const formatTimeNome = (time: Time) => time.nome;

  return (
    <div style={{ padding: '24px', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--verde)', backgroundColor: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '24px', letterSpacing: '1px' }}>
        CONFRONTOS ENTRE OS TIMES
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#14532d', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalJogos}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Total de Jogos</div>
        </div>
        <div style={{ backgroundColor: '#166534', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalGols}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Total de Gols</div>
        </div>
        <div style={{ backgroundColor: '#15803d', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{mediaGols}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Média de Gols</div>
        </div>
        <div style={{ backgroundColor: '#ca8a04', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{vitoriasMandante}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Vitórias Mandante</div>
        </div>
        <div style={{ backgroundColor: '#6b7280', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{empates}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Empates</div>
        </div>
        <div style={{ backgroundColor: '#1d4ed8', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{vitoriasVisitante}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Vitórias Visitante</div>
        </div>
        <div style={{ backgroundColor: '#be123c', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{maiorGoleada}</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>Maior Goleada</div>
        </div>
      </div>

      {primeiroJogo && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#1e293b', borderRadius: '8px', color: '#e2e8f0' }}>
          <strong>Primeiro jogo registrado:</strong>{' '}
          {new Date(primeiroJogo.data).toLocaleDateString('pt-BR')} —{' '}
          {typeof primeiroJogo.timeA === 'object' ? primeiroJogo.timeA.nome : primeiroJogo.timeA} {primeiroJogo.golsA} x {primeiroJogo.golsB}{' '}
          {typeof primeiroJogo.timeB === 'object' ? primeiroJogo.timeB.nome : primeiroJogo.timeB}
        </div>
      )}

      <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Bebas Neue, sans-serif', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #334155', padding: '10px', backgroundColor: '#064e3b', color: '#fff' }}>Mandante \ Visitante</th>
              {times.map((time: Time) => (
                <th key={String(time.id)} style={{ border: '1px solid #334155', padding: '10px', backgroundColor: time.cor, color: '#fff' }}>
                  {formatTimeNome(time)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((linha: Time, i: number) => (
              <tr key={String(linha.id)}>
                <td style={{ border: '1px solid #334155', padding: '10px', backgroundColor: linha.cor, color: '#fff', fontWeight: 'bold' }}>
                  {formatTimeNome(linha)}
                </td>
                {times.map((coluna: Time, j: number) => {
                  const ehMandante = i === j;
                  const bg = ehMandante ? homeShadeBg(linha) : '#1e293b';
                  return (
                    <td
                      key={String(coluna.id)}
                      style={{
                        border: '1px solid #334155',
                        padding: '10px',
                        textAlign: 'center',
                        backgroundColor: bg,
                        color: '#fff',
                        fontWeight: ehMandante ? 'bold' : 'normal',
                      }}
                    >
                      {ehMandante ? '—' : tabelaCruzada[i][j]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--verde)' }}>Resumo como Mandante</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Bebas Neue, sans-serif' }}>
            <thead>
              <tr style={{ backgroundColor: '#064e3b', color: '#fff' }}>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>#</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>Time</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>J</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>V</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>GP</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>GC</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>SG</th>
              </tr>
            </thead>
            <tbody>
              {resumoMandante.map((item, index) => (
                <tr key={String(item.time.id)} style={{ backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', color: '#fff' }}>{formatTimeNome(item.time)}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.jogos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.vitorias}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.golsFeitos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.golsSofridos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: item.saldo >= 0 ? '#4ade80' : '#f87171' }}>
                    {item.saldo > 0 ? `+${item.saldo}` : item.saldo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--verde)' }}>Resumo como Visitante</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Bebas Neue, sans-serif' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>#</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>Time</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>J</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>V</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>GP</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>GC</th>
                <th style={{ border: '1px solid #334155', padding: '8px' }}>SG</th>
              </tr>
            </thead>
            <tbody>
              {resumoVisitante.map((item, index) => (
                <tr key={String(item.time.id)} style={{ backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', color: '#fff' }}>{formatTimeNome(item.time)}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.jogos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.vitorias}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.golsFeitos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: '#fff' }}>{item.golsSofridos}</td>
                  <td style={{ border: '1px solid #334155', padding: '8px', textAlign: 'center', color: item.saldo >= 0 ? '#4ade80' : '#f87171' }}>
                    {item.saldo > 0 ? `+${item.saldo}` : item.saldo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        Dados processados automaticamente a partir de confrontos registrados em @/lib/data.
      </footer>
    </div>
  );
}
