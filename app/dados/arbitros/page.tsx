import { getPartidas, getEstadios } from '@/lib/data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type CargoArbitro = 'principal' | 'assistente1' | 'assistente2' | 'quarto' | 'var';

const CARGO_LABEL: Record<CargoArbitro, string> = {
  principal:   'Árbitro Principal',
  assistente1: 'Assistente 1',
  assistente2: 'Assistente 2',
  quarto:      '4º Árbitro',
  var:         'VAR',
};

const CARGO_EMOJI: Record<CargoArbitro, string> = {
  principal:   '🟢',
  assistente1: '🚩',
  assistente2: '🚩',
  quarto:      '📋',
  var:         '📺',
};

export default async function ArbitrosPage() {
  const partidas = await getPartidas();
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  // Construir mapa por nome → cargos e estatísticas
  const map: Record<string, {
    nome: string;
    cargos: Partial<Record<CargoArbitro, { jogos: number; gols: number; amarelos: number; vermelhos: number }>>;
    totalJogos: number;
    totalGols: number;
    totalAmarelos: number;
    totalVermelhos: number;
  }> = {};

  const addArbitro = (nome: string, cargo: CargoArbitro, gols: number, amarelos: number, vermelhos: number) => {
    if (!nome || !nome.trim()) return;
    const key = nome.trim();
    if (!map[key]) map[key] = { nome: key, cargos: {}, totalJogos: 0, totalGols: 0, totalAmarelos: 0, totalVermelhos: 0 };
    const entry = map[key];
    if (!entry.cargos[cargo]) entry.cargos[cargo] = { jogos: 0, gols: 0, amarelos: 0, vermelhos: 0 };
    entry.cargos[cargo]!.jogos++;
    entry.cargos[cargo]!.gols += gols;
    entry.cargos[cargo]!.amarelos += amarelos;
    entry.cargos[cargo]!.vermelhos += vermelhos;
    entry.totalJogos++;
    entry.totalGols += gols;
    entry.totalAmarelos += amarelos;
    entry.totalVermelhos += vermelhos;
  };

  for (const p of encerradas) {
    const gols = p.placar_casa + p.placar_visitante;
    let amarelos = 0, vermelhos = 0;
    for (const c of p.cartoes) {
      if (c.tipo === 'amarelo' || c.tipo === 'amarelo_tecnico') amarelos++;
      else if (c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico') vermelhos++;
    }
    const arb = p.arbitragem;
    if (arb?.principal)   addArbitro(arb.principal,   'principal',   gols, amarelos, vermelhos);
    if (arb?.assistente1) addArbitro(arb.assistente1, 'assistente1', gols, amarelos, vermelhos);
    if (arb?.assistente2) addArbitro(arb.assistente2, 'assistente2', gols, amarelos, vermelhos);
    if (arb?.quarto)      addArbitro(arb.quarto,      'quarto',      gols, amarelos, vermelhos);
    if (arb?.var)         addArbitro(arb.var,          'var',         gols, amarelos, vermelhos);
  }

  const lista = Object.values(map).sort((a, b) => b.totalJogos - a.totalJogos);

  // Separar árbitros principais dos auxiliares
  const principais   = lista.filter(a => a.cargos['principal']);
  const auxiliares   = lista.filter(a => !a.cargos['principal']);

  const cargosOrdenados: CargoArbitro[] = ['principal', 'assistente1', 'assistente2', 'quarto', 'var'];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Corpo de Arbitragem</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Árbitros</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.85rem' }}>
            {lista.length} árbitro(s) registrado(s) · {encerradas.length} partida(s) encerrada(s)
          </p>
        </div>
      </div>

      <div className="container">

        {/* Árbitros Principais */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            🟢 Árbitros Principais
            <span style={{ fontSize: '.8rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
              {principais.length} árbitro(s)
            </span>
          </h2>

          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
                <tr>
                  {['#', 'Árbitro', 'Jogos', 'Gols', 'G/Jogo', '🟨', '🟨/J', '🟥', '🟥/J'].map(h => (
                    <th key={h} style={{ padding: '.65rem .9rem', textAlign: h === 'Árbitro' ? 'left' : 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '.88rem', letterSpacing: '.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {principais.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum árbitro principal registrado.</td></tr>
                )}
                {principais.map((a, i) => {
                  const dados = a.cargos['principal']!;
                  const slug = encodeURIComponent(a.nome);
                  return (
                    <tr key={a.nome} style={{ borderBottom: '1px solid #1e1e1e', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td style={{ padding: '.6rem .9rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>{i + 1}</td>
                      <td style={{ padding: '.6rem .9rem' }}>
                        <Link href={`/dados/arbitros/${slug}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                          {a.nome}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.15rem', color: 'var(--amarelo)', padding: '.6rem .5rem' }}>{dados.jogos}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem' }}>{dados.gols}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--verde)' }}>{(dados.gols / dados.jogos).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: '#f59e0b', fontWeight: 600 }}>{dados.amarelos}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: '#f59e0b' }}>{(dados.amarelos / dados.jogos).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--rebaixamento)', fontWeight: 600 }}>{dados.vermelhos || '—'}</td>
                      <td style={{ textAlign: 'center', padding: '.6rem .5rem', color: 'var(--rebaixamento)' }}>{dados.vermelhos > 0 ? (dados.vermelhos / dados.jogos).toFixed(2) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Auxiliares */}
        {auxiliares.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              🚩 Auxiliares & VAR
              <span style={{ fontSize: '.8rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
                {auxiliares.length} árbitro(s)
              </span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {auxiliares.map(a => {
                const slug = encodeURIComponent(a.nome);
                return (
                  <div key={a.nome} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <Link href={`/dados/arbitros/${slug}`} style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                        {a.nome}
                      </Link>
                      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
                        {cargosOrdenados.filter(c => a.cargos[c]).map(c => (
                          <span key={c} style={{ fontSize: '.7rem', padding: '.15rem .45rem', borderRadius: 4, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {CARGO_EMOJI[c]} {CARGO_LABEL[c]} · {a.cargos[c]!.jogos}j
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.82rem', color: 'var(--text-muted)' }}>
                      <span><span style={{ color: 'var(--amarelo)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem' }}>{a.totalJogos}</span> jogos</span>
                      <span><span style={{ color: '#f59e0b', fontWeight: 600 }}>{a.totalAmarelos}</span> 🟨</span>
                      {a.totalVermelhos > 0 && <span><span style={{ color: 'var(--rebaixamento)', fontWeight: 600 }}>{a.totalVermelhos}</span> 🟥</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
              }
