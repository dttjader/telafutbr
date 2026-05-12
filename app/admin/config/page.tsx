'use client';
import { useState, useEffect } from 'react';
import { Config, VagaDireta } from '@/lib/config';
import { clientGetTimes } from '@/lib/client';
import { Time } from '@/lib/types';

const defaultConfig = (): Config => ({
  libertadores: { vagas_tabela: 5, vagas_diretas: [] },
  sulamericana: { vagas_tabela: 6, vagas_diretas: [] },
  rebaixamento: { vagas: 4 },
});

export default function AdminConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig());
  const [times, setTimes] = useState<Time[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State for new vaga direta forms
  const [novaLibTime, setNovaLibTime] = useState('');
  const [novaLibMotivo, setNovaLibMotivo] = useState('');
  const [novaSulTime, setNovaSulTime] = useState('');
  const [novaSulMotivo, setNovaSulMotivo] = useState('');

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
    clientGetTimes().then(setTimes);
  }, []);

  const flash = (ok: boolean, t: string) => {
    if (ok) setMsg(t); else setError(t);
    setTimeout(() => { setMsg(''); setError(''); }, 3500);
  };

  const save = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (r.ok) flash(true, 'Configurações salvas!');
      else flash(false, 'Erro ao salvar.');
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
    setLoading(false);
  };

  const addVagaDireta = (zona: 'libertadores' | 'sulamericana', time_id: string, motivo: string) => {
    if (!time_id || !motivo) return flash(false, 'Selecione o time e informe o motivo.');
    const already = config[zona].vagas_diretas.some(v => v.time_id === time_id);
    if (already) return flash(false, 'Este time já tem vaga direta nessa zona.');
    setConfig(c => ({
      ...c,
      [zona]: { ...c[zona], vagas_diretas: [...c[zona].vagas_diretas, { time_id, motivo }] },
    }));
    if (zona === 'libertadores') { setNovaLibTime(''); setNovaLibMotivo(''); }
    else { setNovaSulTime(''); setNovaSulMotivo(''); }
  };

  const removeVagaDireta = (zona: 'libertadores' | 'sulamericana', time_id: string) => {
    setConfig(c => ({
      ...c,
      [zona]: { ...c[zona], vagas_diretas: c[zona].vagas_diretas.filter(v => v.time_id !== time_id) },
    }));
  };

  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;

  const totalLib = config.libertadores.vagas_tabela + config.libertadores.vagas_diretas.length;
  const totalSul = config.sulamericana.vagas_tabela + config.sulamericana.vagas_diretas.length;
  const totalTimes = times.length || 20;

  const ZonaSection = ({
    zona, cor, emoji, label,
  }: {
    zona: 'libertadores' | 'sulamericana';
    cor: string; emoji: string; label: string;
  }) => {
    const novoTime = zona === 'libertadores' ? novaLibTime : novaSulTime;
    const novoMotivo = zona === 'libertadores' ? novaLibMotivo : novaSulMotivo;
    const setNovoTime = zona === 'libertadores' ? setNovaLibTime : setNovaSulTime;
    const setNovoMotivo = zona === 'libertadores' ? setNovaLibMotivo : setNovaSulMotivo;

    return (
      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: `4px solid ${cor}` }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: cor }}>
          {emoji} {label}
        </h3>

        {/* Vagas pela tabela */}
        <div className="form-group" style={{ maxWidth: 280 }}>
          <label>Vagas pela tabela (colocação)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setConfig(c => ({ ...c, [zona]: { ...c[zona], vagas_tabela: Math.max(0, c[zona].vagas_tabela - 1) } }))}>−</button>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: cor, minWidth: 32, textAlign: 'center' }}>
              {config[zona].vagas_tabela}
            </span>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setConfig(c => ({ ...c, [zona]: { ...c[zona], vagas_tabela: c[zona].vagas_tabela + 1 } }))}>+</button>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
              vagas (posições 1 a {config[zona].vagas_tabela})
            </span>
          </div>
        </div>

        {/* Vagas diretas existentes */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, marginBottom: '.5rem' }}>
            Vagas diretas por título ({config[zona].vagas_diretas.length})
          </p>
          {config[zona].vagas_diretas.length === 0 && (
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Nenhuma vaga direta cadastrada.</p>
          )}
          {config[zona].vagas_diretas.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem .75rem', background: 'var(--surface2)', borderRadius: 6, marginBottom: '.3rem' }}>
              <span style={{ flex: 1 }}>
                <strong>{nomeTime(v.time_id)}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}> · {v.motivo}</span>
              </span>
              <button className="btn btn-danger btn-sm" onClick={() => removeVagaDireta(zona, v.time_id)}>✕</button>
            </div>
          ))}
        </div>

        {/* Adicionar vaga direta */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.6rem', fontWeight: 600 }}>+ Adicionar vaga direta</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <select value={novoTime} onChange={e => setNovoTime(e.target.value)}
              style={{ flex: '0 0 180px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .6rem', fontSize: '.85rem' }}>
              <option value="">Selecione o time...</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <input value={novoMotivo} onChange={e => setNovoMotivo(e.target.value)}
              placeholder="Ex: Campeão Copa do Brasil 2025"
              style={{ flex: 1, minWidth: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .6rem', fontSize: '.85rem' }} />
            <button className="btn btn-primary btn-sm" onClick={() => addVagaDireta(zona, novoTime, novoMotivo)}>
              Adicionar
            </button>
          </div>
        </div>

        <div style={{ marginTop: '.75rem', fontSize: '.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,.03)', borderRadius: 6, padding: '.5rem .75rem' }}>
          Total de vagas {label}: <strong style={{ color: cor }}>{zona === 'libertadores' ? totalLib : totalSul}</strong>
          {' '}({config[zona].vagas_tabela} pela tabela + {config[zona].vagas_diretas.length} diretas)
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: 760 }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>⚙️ Configurações</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Defina o número de vagas por zona de classificação e registre times com vagas diretas por títulos.
      </p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <ZonaSection zona="libertadores" cor="var(--libertadores)" emoji="🟢" label="Libertadores" />
      <ZonaSection zona="sulamericana" cor="var(--sulamericana)" emoji="🔵" label="Sul-Americana" />

      {/* Rebaixamento */}
      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--rebaixamento)' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--rebaixamento)' }}>🔴 Rebaixamento</h3>
        <div className="form-group" style={{ maxWidth: 280 }}>
          <label>Número de times rebaixados</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setConfig(c => ({ ...c, rebaixamento: { vagas: Math.max(1, c.rebaixamento.vagas - 1) } }))}>−</button>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: 'var(--rebaixamento)', minWidth: 32, textAlign: 'center' }}>
              {config.rebaixamento.vagas}
            </span>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setConfig(c => ({ ...c, rebaixamento: { vagas: c.rebaixamento.vagas + 1 } }))}>+</button>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
              últimas posições ({totalTimes - config.rebaixamento.vagas + 1}º ao {totalTimes}º)
            </span>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface2)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '.75rem' }}>📊 Resumo da tabela</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.85rem' }}>
          {[
            { label: `🟢 Libertadores (vagas tabela)`, pos: `1º ao ${config.libertadores.vagas_tabela}º`, cor: 'var(--libertadores)' },
            { label: `🔵 Sul-Americana (vagas tabela)`, pos: `${config.libertadores.vagas_tabela + 1}º ao ${config.libertadores.vagas_tabela + config.sulamericana.vagas_tabela}º`, cor: 'var(--sulamericana)' },
            { label: `⚪ Neutro`, pos: `${config.libertadores.vagas_tabela + config.sulamericana.vagas_tabela + 1}º ao ${totalTimes - config.rebaixamento.vagas}º`, cor: 'var(--text-muted)' },
            { label: `🔴 Rebaixamento`, pos: `${totalTimes - config.rebaixamento.vagas + 1}º ao ${totalTimes}º`, cor: 'var(--rebaixamento)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem .5rem', borderRadius: 4, background: 'var(--surface)' }}>
              <span style={{ color: row.cor, fontWeight: 600 }}>{row.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{row.pos}</span>
            </div>
          ))}
        </div>
        {config.libertadores.vagas_diretas.length > 0 && (
          <div style={{ marginTop: '.75rem', fontSize: '.78rem', color: 'var(--amarelo)', background: 'rgba(255,223,0,.06)', borderRadius: 6, padding: '.5rem .75rem' }}>
            ⭐ {config.libertadores.vagas_diretas.length} time(s) com vaga direta para a Libertadores serão destacados com badge especial na tabela, independente da colocação.
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save} disabled={loading} style={{ fontSize: '1.1rem', padding: '.65rem 2rem' }}>
        {loading ? 'Salvando...' : '💾 Salvar configurações'}
      </button>
    </div>
  );
}
