'use client';
import { useState, useEffect } from 'react';
import { clientGetTimes } from '@/lib/client';
import { Time } from '@/lib/types';

interface VagaDireta { time_id: string; motivo: string; }
interface Config {
  libertadores: { vagas_tabela: number; vagas_diretas: VagaDireta[] };
  sulamericana: { vagas_tabela: number; vagas_diretas: VagaDireta[] };
  rebaixamento: { vagas: number };
}

export default function AdminConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [novaLibTime, setNovaLibTime] = useState('');
  const [novaLibMotivo, setNovaLibMotivo] = useState('');
  const [novaSulTime, setNovaSulTime] = useState('');
  const [novaSulMotivo, setNovaSulMotivo] = useState('');

  const load = async () => {
    const [cfg, tms] = await Promise.all([
      fetch('/api/config').then(r => r.json()),
      clientGetTimes(),
    ]);
    setConfig(cfg);
    setTimes(tms);
  };

  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, t: string) => {
    if (ok) setMsg(t); else setError(t);
    setTimeout(() => { setMsg(''); setError(''); }, 3500);
  };

  const save = async (cfg: Config) => {
    setLoading(true);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (r.ok) { flash(true, 'Configurações salvas!'); setConfig(cfg); }
      else flash(false, 'Erro ao salvar.');
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
    setLoading(false);
  };

  const setVagas = (zona: 'libertadores' | 'sulamericana', delta: number) => {
    if (!config) return;
    const atual = config[zona].vagas_tabela;
    const novo = Math.max(0, atual + delta);
    const updated = { ...config, [zona]: { ...config[zona], vagas_tabela: novo } };
    setConfig(updated);
  };

  const setVagasReb = (delta: number) => {
    if (!config) return;
    const updated = { ...config, rebaixamento: { vagas: Math.max(1, config.rebaixamento.vagas + delta) } };
    setConfig(updated);
  };

  const addVagaDireta = (zona: 'libertadores' | 'sulamericana', time_id: string, motivo: string) => {
    if (!config) return;
    if (!time_id || !motivo) return flash(false, 'Selecione o time e informe o motivo.');
    if (config[zona].vagas_diretas.some(v => v.time_id === time_id))
      return flash(false, 'Este time já tem vaga direta nessa zona.');
    const updated = { ...config, [zona]: { ...config[zona], vagas_diretas: [...config[zona].vagas_diretas, { time_id, motivo }] } };
    setConfig(updated);
    if (zona === 'libertadores') { setNovaLibTime(''); setNovaLibMotivo(''); }
    else { setNovaSulTime(''); setNovaSulMotivo(''); }
  };

  const removeVagaDireta = (zona: 'libertadores' | 'sulamericana', time_id: string) => {
    if (!config) return;
    const updated = { ...config, [zona]: { ...config[zona], vagas_diretas: config[zona].vagas_diretas.filter(v => v.time_id !== time_id) } };
    setConfig(updated);
  };

  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;
  const totalTimes = times.length || 20;

  if (!config) return (
    <div className="container" style={{ paddingTop: '3rem', color: 'var(--text-muted)' }}>
      Carregando configurações...
    </div>
  );

  const totalLib = config.libertadores.vagas_tabela + config.libertadores.vagas_diretas.length;
  const totalSul = config.sulamericana.vagas_tabela + config.sulamericana.vagas_diretas.length;

  const ZonaSection = ({ zona, cor, emoji, label }: { zona: 'libertadores' | 'sulamericana'; cor: string; emoji: string; label: string }) => {
    const novoTime = zona === 'libertadores' ? novaLibTime : novaSulTime;
    const novoMotivo = zona === 'libertadores' ? novaLibMotivo : novaSulMotivo;
    const setNovoTime = zona === 'libertadores' ? setNovaLibTime : setNovaSulTime;
    const setNovoMotivo = zona === 'libertadores' ? setNovaLibMotivo : setNovaSulMotivo;

    return (
      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: `4px solid ${cor}` }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: cor }}>{emoji} {label}</h3>

        <div className="form-group" style={{ maxWidth: 320, marginBottom: '1.25rem' }}>
          <label>Vagas pela tabela (posições 1 a {config[zona].vagas_tabela})</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: '.4rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setVagas(zona, -1)}>−</button>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.5rem', color: cor, minWidth: 40, textAlign: 'center', lineHeight: 1 }}>
              {config[zona].vagas_tabela}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setVagas(zona, 1)}>+</button>
          </div>
        </div>

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
          Total {label}: <strong style={{ color: cor }}>{zona === 'libertadores' ? totalLib : totalSul}</strong>
          {' '}({config[zona].vagas_tabela} tabela + {config[zona].vagas_diretas.length} diretas)
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: 760 }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(400px); opacity: 0; }
        }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast.hide { animation: slideOut .3s ease-out forwards; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }
      `}</style>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>⚙️ Configurações</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Defina o número de vagas por zona e registre times com vagas diretas por títulos.
      </p>

      {msg && <div className="toast toast-success">{msg}</div>}
      {error && <div className="toast toast-error">{error}</div>}

      <ZonaSection zona="libertadores" cor="var(--libertadores)" emoji="🟢" label="Libertadores" />
      <ZonaSection zona="sulamericana" cor="var(--sulamericana)" emoji="🔵" label="Sul-Americana" />

      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--rebaixamento)' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--rebaixamento)' }}>🔴 Rebaixamento</h3>
        <div className="form-group" style={{ maxWidth: 320 }}>
          <label>Times rebaixados (últimas posições)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: '.4rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setVagasReb(-1)}>−</button>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.5rem', color: 'var(--rebaixamento)', minWidth: 40, textAlign: 'center', lineHeight: 1 }}>
              {config.rebaixamento.vagas}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setVagasReb(1)}>+</button>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
              ({totalTimes - config.rebaixamento.vagas + 1}º ao {totalTimes}º)
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface2)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '.75rem' }}>📊 Resumo</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.85rem' }}>
          {[
            { label: `🟢 Libertadores (tabela)`, pos: `1º ao ${config.libertadores.vagas_tabela}º`, cor: 'var(--libertadores)' },
            { label: `🔵 Sul-Americana (tabela)`, pos: `${config.libertadores.vagas_tabela + 1}º ao ${config.libertadores.vagas_tabela + config.sulamericana.vagas_tabela}º`, cor: 'var(--sulamericana)' },
            { label: `⚪ Neutro`, pos: `${config.libertadores.vagas_tabela + config.sulamericana.vagas_tabela + 1}º ao ${totalTimes - config.rebaixamento.vagas}º`, cor: 'var(--text-muted)' },
            { label: `🔴 Rebaixamento`, pos: `${totalTimes - config.rebaixamento.vagas + 1}º ao ${totalTimes}º`, cor: 'var(--rebaixamento)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem .5rem', borderRadius: 4, background: 'var(--surface)' }}>
              <span style={{ color: row.cor, fontWeight: 600 }}>{row.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{row.pos}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={() => save(config)} disabled={loading}
        style={{ fontSize: '1.1rem', padding: '.65rem 2rem' }}>
        {loading ? 'Salvando...' : '💾 Salvar configurações'}
      </button>
    </div>
  );
}
