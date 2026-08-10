'use client';
import { useState } from 'react';
import { Partida, Gol, Cartao, Substituicao, EscalacaoJogador } from '@/lib/types';
import { ApiFootballBadge } from '@/components/ApiFootballBadge';

interface Preview {
  gols: Gol[];
  cartoes: Cartao[];
  substituicoes: Substituicao[];
  escalacao_casa: EscalacaoJogador[];
  escalacao_visitante: EscalacaoJogador[];
  avisos: string[];
}

interface Props {
  partida: Partida;
  onImportado: () => void;
}

export function ImportarApiFootballTab({ partida, onImportado }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  const preVisualizar = async () => {
    setErro(''); setMsg(''); setLoading(true); setPreview(null);
    try {
      const r = await fetch('/api/sync/partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'pre-importar', partidaId: partida.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Erro ao pré-visualizar.');
      setPreview(data.preview);
    } catch (e) { setErro(String(e)); }
    setLoading(false);
  };

  const confirmar = async () => {
    if (!preview) return;
    if (!confirm('Isso vai SOBRESCREVER gols, cartões, substituições e escalação atuais desta partida com os dados importados. Continuar?')) return;
    setLoading(true); setErro('');
    try {
      const r = await fetch('/api/sync/partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'confirmar-importar', partidaId: partida.id, preview }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Erro ao salvar.');
      setMsg('Importado com sucesso!');
      setPreview(null);
      onImportado();
    } catch (e) { setErro(String(e)); }
    setLoading(false);
  };

  if (!partida.api_football_id) {
    return (
      <div className="card">
        <p style={{ color: 'var(--text-muted)' }}>
          Esta partida ainda não está vinculada a um fixture da API-Football. Vá em <strong>/admin/partidas</strong> e use o botão &quot;🔗 Vincular API-Football&quot; nesta partida primeiro.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <ApiFootballBadge apiFootballId={partida.api_football_id} />
          <button className="btn btn-primary" onClick={preVisualizar} disabled={loading}>
            {loading ? 'Buscando...' : '📥 Pré-visualizar importação (2 requisições)'}
          </button>
        </div>
        {erro && <div className="alert alert-error">{erro}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}
        <p style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
          Busca eventos (gols/cartões/substituições) e escalações do fixture vinculado. Nada é salvo até você confirmar abaixo.
          Jogadores sem <code>api_football_id</code> cadastrado localmente aparecem como aviso e ficam de fora do preview.
        </p>
      </div>

      {preview && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--amarelo)' }}>Prévia da importação</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '.85rem' }}>
            <span>⚽ {preview.gols.length} gol(is)</span>
            <span>🟨 {preview.cartoes.length} cartão(ões)</span>
            <span>🔄 {preview.substituicoes.length} substituição(ões)</span>
            <span>👕 {preview.escalacao_casa.length + preview.escalacao_visitante.length} jogador(es) escalado(s)</span>
          </div>

          {preview.avisos.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '.75rem 1rem', marginBottom: '1rem' }}>
              <strong style={{ color: '#f59e0b' }}>⚠️ {preview.avisos.length} aviso(s):</strong>
              <ul style={{ marginTop: '.4rem', paddingLeft: '1.2rem', fontSize: '.8rem', maxHeight: 200, overflowY: 'auto' }}>
                {preview.avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            ⚠️ O goleiro adversário de cada gol e o tipo &quot;falta&quot; não vêm da API — revise manualmente na aba Gols depois de importar.
            A direção de cada substituição (quem entra/quem sai) também vale conferir na aba Substituições.
          </p>

          <button className="btn btn-primary" onClick={confirmar} disabled={loading}>
            {loading ? 'Salvando...' : '✅ Confirmar e Salvar'}
          </button>
        </div>
      )}
    </div>
  );
}
