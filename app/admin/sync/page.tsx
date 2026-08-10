'use client';
import { useState, useEffect } from 'react';

interface Orcamento { usadas: number; restantes: number; limite: number; }

interface ResultadoTimes {
  timesAtualizados: { id: string; nome: string; api_football_id: number }[];
  timesNaoEncontrados: { id: string; nome: string }[];
  estadiosAtualizados: { id: string; nome: string; api_football_id: number }[];
}

interface ResultadoJogadores {
  porTime: {
    time_id: string; time_nome: string;
    jogadoresAtualizados: { id: string; nome: string; api_football_id: number }[];
    naoEncontrados: { id_api: number; nome_api: string; posicao_sugerida: string }[];
  }[];
  timesPulados: { id: string; nome: string; motivo: string }[];
}

interface LigaEncontrada {
  id: number;
  nome: string;
  tipo: string;
  temporadaAtual: number | null;
}

function parseNumeros(texto: string): number[] {
  return texto
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => !Number.isNaN(n));
}

export default function AdminSync() {
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [temporadasTexto, setTemporadasTexto] = useState(String(new Date().getFullYear()));
  const [ligasExtrasTexto, setLigasExtrasTexto] = useState('');
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loadingJogadores, setLoadingJogadores] = useState(false);
  const [loadingLigas, setLoadingLigas] = useState(false);
  const [resultadoTimes, setResultadoTimes] = useState<ResultadoTimes | null>(null);
  const [resultadoJogadores, setResultadoJogadores] = useState<ResultadoJogadores | null>(null);
  const [ligas, setLigas] = useState<LigaEncontrada[] | null>(null);
  const [erro, setErro] = useState('');

  const carregarOrcamento = async () => {
    const r = await fetch('/api/sync/times-jogadores');
    setOrcamento(await r.json());
  };
  useEffect(() => { carregarOrcamento(); }, []);

  const chamar = async (body: Record<string, unknown>) => {
    const r = await fetch('/api/sync/times-jogadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? 'Erro desconhecido');
    return data;
  };

  const rodarTimes = async () => {
    setErro(''); setLoadingTimes(true);
    try {
      const data = await chamar({
        etapa: 'times',
        temporadas: parseNumeros(temporadasTexto),
        ligasExtras: parseNumeros(ligasExtrasTexto),
      });
      setResultadoTimes(data);
      await carregarOrcamento();
    } catch (e) { setErro(String(e)); }
    setLoadingTimes(false);
  };

  const rodarJogadores = async () => {
    setErro(''); setLoadingJogadores(true);
    try {
      const data = await chamar({ etapa: 'jogadores' });
      setResultadoJogadores(data);
      await carregarOrcamento();
    } catch (e) { setErro(String(e)); }
    setLoadingJogadores(false);
  };

  const descobrirLigas = async () => {
    setErro(''); setLoadingLigas(true);
    try {
      const data = await chamar({ etapa: 'descobrir-ligas' });
      setLigas(data.ligas);
      await carregarOrcamento();
    } catch (e) { setErro(String(e)); }
    setLoadingLigas(false);
  };

  const pct = orcamento ? (orcamento.usadas / orcamento.limite) * 100 : 0;

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: 900 }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>🔗 Sincronização API-Football</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Vincula times, estádios e jogadores locais aos IDs da API-Football.
      </p>

      {erro && <div className="alert alert-error">{erro}</div>}

      {/* Cota diária */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '.75rem' }}>📊 Cota diária (plano gratuito)</h3>
        {orcamento ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.4rem' }}>
              <span>{orcamento.usadas} / {orcamento.limite} requisições usadas hoje</span>
              <span style={{ color: orcamento.restantes < 10 ? 'var(--rebaixamento)' : 'var(--verde)' }}>
                {orcamento.restantes} disponíveis (com margem de segurança)
              </span>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 8 }}>
              <div style={{
                width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4,
                background: pct > 80 ? 'var(--rebaixamento)' : 'var(--verde)', transition: 'width .3s',
              }} />
            </div>
          </>
        ) : <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>}
      </div>

      {/* Descobrir ligas do Brasil */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--amarelo)' }}>🔍 Descobrir ligas do Brasil</h2>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
              Rode 1x para achar o ID exato da Série B (ou outra competição) — evita chutar um ID errado.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={descobrirLigas} disabled={loadingLigas}>
            {loadingLigas ? 'Buscando...' : 'Buscar (1 requisição)'}
          </button>
        </div>
        {ligas && (
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '.4rem .6rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '.4rem .6rem', textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: '.4rem .6rem', textAlign: 'left' }}>Tipo</th>
                  <th style={{ padding: '.4rem .6rem', textAlign: 'left' }}>Temporada atual</th>
                </tr>
              </thead>
              <tbody>
                {ligas.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '.35rem .6rem', color: 'var(--amarelo)', fontFamily: "'Bebas Neue',sans-serif" }}>{l.id}</td>
                    <td style={{ padding: '.35rem .6rem' }}>{l.nome}</td>
                    <td style={{ padding: '.35rem .6rem', color: 'var(--text-muted)' }}>{l.tipo}</td>
                    <td style={{ padding: '.35rem .6rem', color: 'var(--text-muted)' }}>{l.temporadaAtual ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Etapa 1: Times */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--amarelo)', marginBottom: '.75rem' }}>1️⃣ Times &amp; Estádios</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Temporadas (separadas por vírgula)</label>
            <input value={temporadasTexto} onChange={e => setTemporadasTexto(e.target.value)} placeholder="Ex: 2026, 2025, 2024" />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Ligas extras (IDs, separados por vírgula)</label>
            <input value={ligasExtrasTexto} onChange={e => setLigasExtrasTexto(e.target.value)} placeholder="Ex: 72 (Série B)" />
          </div>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Custo: 1 requisição por temporada + 1 por liga extra. Ex: 3 temporadas + Série B = 4 requisições.
        </p>
        <button className="btn btn-primary" onClick={rodarTimes} disabled={loadingTimes}>
          {loadingTimes ? 'Sincronizando...' : '▶️ Sincronizar Times'}
        </button>

        {resultadoTimes && (
          <div style={{ fontSize: '.85rem', marginTop: '1rem' }}>
            <p style={{ color: 'var(--verde)', marginBottom: '.5rem' }}>
              ✅ {resultadoTimes.timesAtualizados.length} time(s) vinculado(s) · {resultadoTimes.estadiosAtualizados.length} estádio(s) vinculado(s)
            </p>
            {resultadoTimes.timesNaoEncontrados.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '.75rem 1rem' }}>
                <strong style={{ color: 'var(--rebaixamento)' }}>⚠️ Sem correspondência automática:</strong>
                <ul style={{ marginTop: '.4rem', paddingLeft: '1.2rem' }}>
                  {resultadoTimes.timesNaoEncontrados.map(t => <li key={t.id}>{t.nome} ({t.id})</li>)}
                </ul>
                <p style={{ color: 'var(--text-muted)', marginTop: '.4rem' }}>
                  Tente adicionar mais temporadas/ligas acima, ou vincule manualmente pela coluna <code>api_football_id</code> desses times no Supabase.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Etapa 2: Jogadores */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', color: 'var(--amarelo)' }}>2️⃣ Jogadores</h2>
          <button className="btn btn-primary" onClick={rodarJogadores} disabled={loadingJogadores}>
            {loadingJogadores ? 'Sincronizando...' : '▶️ Sincronizar Elencos (1 requisição/time)'}
          </button>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
          Só sincroniza times que já têm <code>api_football_id</code> (rode a etapa 1 primeiro).
        </p>
        {resultadoJogadores && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {resultadoJogadores.porTime.map(t => (
              <div key={t.time_id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.85rem' }}>
                <strong>{t.time_nome}</strong> — {t.jogadoresAtualizados.length} vinculado(s)
                {t.naoEncontrados.length > 0 && (
                  <div style={{ marginTop: '.4rem', color: 'var(--text-muted)' }}>
                    ⚠️ {t.naoEncontrados.length} jogador(es) do elenco da API sem correspondência local:
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginTop: '.4rem' }}>
                      {t.naoEncontrados.map((n, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap',
                          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                          padding: '.35rem .6rem',
                        }}>
                          <span style={{
                            fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem', color: '#60a5fa',
                            background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)',
                            borderRadius: 4, padding: '.05rem .4rem', minWidth: 60, textAlign: 'center',
                          }}>
                            #{n.id_api}
                          </span>
                          <span style={{ color: 'var(--text)' }}>{n.nome_api}</span>
                          <span style={{ color: '#555' }}>(sugestão: {n.posicao_sugerida})</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ marginLeft: 'auto', padding: '.15rem .5rem', fontSize: '.7rem' }}
                            onClick={() => navigator.clipboard.writeText(String(n.id_api))}
                          >
                            📋 Copiar ID
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {resultadoJogadores.timesPulados.length > 0 && (
              <div style={{ color: 'var(--rebaixamento)', fontSize: '.8rem' }}>
                Times pulados por erro: {resultadoJogadores.timesPulados.map(t => t.nome).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
