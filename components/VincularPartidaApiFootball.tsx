'use client';
import { useState } from 'react';
import { Partida, Time } from '@/lib/types';
import { ApiFootballBadge } from './ApiFootballBadge';

interface Candidato {
  fixture_id: number;
  data: string;
  rodada_api: string;
  placar_casa: number | null;
  placar_visitante: number | null;
  status: string;
}

interface Props {
  partida: Partida;
  timeCasa?: (Time & { api_football_id?: number | null });
  timeVisitante?: (Time & { api_football_id?: number | null });
  onVinculado: () => void;
}

export function VincularPartidaApiFootball({ partida, timeCasa, timeVisitante, onVinculado }: Props) {
  const [aberto, setAberto] = useState(false);
  const [season, setSeason] = useState(partida.data ? +partida.data.slice(0, 4) : new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [erro, setErro] = useState('');

  const ambosVinculados = !!timeCasa?.api_football_id && !!timeVisitante?.api_football_id;

  const buscar = async () => {
    setErro(''); setLoading(true); setCandidatos(null);
    try {
      const r = await fetch('/api/sync/partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'buscar-h2h',
          timeCasaApiId: timeCasa!.api_football_id,
          timeVisitanteApiId: timeVisitante!.api_football_id,
          season,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Erro na busca.');
      setCandidatos(data.candidatos);
    } catch (e) { setErro(String(e)); }
    setLoading(false);
  };

  const vincular = async (fixtureId: number) => {
    setLoading(true); setErro('');
    try {
      const r = await fetch('/api/sync/partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'vincular', partidaId: partida.id, fixtureId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Erro ao vincular.');
      setAberto(false); setCandidatos(null);
      onVinculado();
    } catch (e) { setErro(String(e)); }
    setLoading(false);
  };

  const desvincular = async () => {
    if (!confirm('Remover o vínculo desta partida com a API-Football?')) return;
    setLoading(true); setErro('');
    try {
      await fetch('/api/sync/partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'desvincular', partidaId: partida.id }),
      });
      onVinculado();
    } catch (e) { setErro(String(e)); }
    setLoading(false);
  };

  if (partida.api_football_id) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <ApiFootballBadge apiFootballId={partida.api_football_id} />
        <button className="btn btn-ghost btn-sm" onClick={desvincular} disabled={loading}>Desvincular</button>
      </div>
    );
  }

  return (
    <div>
      {!aberto ? (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setAberto(true)}
          disabled={!ambosVinculados}
          title={!ambosVinculados ? 'Vincule os dois times primeiro em /admin/sync' : undefined}
        >
          🔗 Vincular API-Football
        </button>
      ) : (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem', marginTop: '.5rem', minWidth: 280 }}>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-end', marginBottom: '.5rem' }}>
            <div className="form-group" style={{ margin: 0, width: 100 }}>
              <label>Temporada</label>
              <input type="number" value={season} onChange={e => setSeason(+e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={buscar} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar (1 req)'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAberto(false); setCandidatos(null); }}>Cancelar</button>
          </div>
          {erro && <p style={{ color: 'var(--rebaixamento)', fontSize: '.78rem' }}>{erro}</p>}
          {candidatos && candidatos.length === 0 && (
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Nenhuma partida encontrada nessa temporada.</p>
          )}
          {candidatos && candidatos.map(c => (
            <div key={c.fixture_id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem 0', borderTop: '1px solid var(--border)', fontSize: '.8rem' }}>
              <span>{new Date(c.data).toLocaleDateString('pt-BR')}</span>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif" }}>{c.placar_casa ?? '–'} × {c.placar_visitante ?? '–'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{c.status}</span>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => vincular(c.fixture_id)} disabled={loading}>
                Vincular
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
                     }
