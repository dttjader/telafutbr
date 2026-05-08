'use client';
import { useState, useEffect } from 'react';
import { Jogador, Time } from '@/lib/types';

const POSICOES = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
const POSICAO_LABEL: Record<string, string> = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };

const emptyForm = () => ({
  nome: '', posicao: 'ATA', numero: '', time_atual: '',
  novoTime: '', dataTransferencia: new Date().toISOString().slice(0, 10),
});

export default function AdminJogadores() {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [times, setTimes] = useState<Time[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [filtroTime, setFiltroTime] = useState('');
  const [filtroPosicao, setFiltroPosicao] = useState('');
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');

  const load = () => {
    fetch('/api/jogadores').then(r => r.json()).then(setJogadores);
    fetch('/api/times').then(r => r.json()).then(setTimes);
  };
  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, t: string) => { if (ok) setMsg(t); else setError(t); setTimeout(() => { setMsg(''); setError(''); }, 3000); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.time_atual) return flash(false, 'Preencha nome e time atual.');
    const jogadorAtual = editId ? jogadores.find(j => j.id === editId) : null;
    let transferencias = jogadorAtual?.transferencias ?? [];

    if (editId && form.novoTime && form.novoTime !== jogadorAtual?.time_atual) {
      transferencias = [...transferencias, { time_id: form.novoTime, data: form.dataTransferencia }];
    } else if (!editId) {
      transferencias = [{ time_id: form.time_atual, data: form.dataTransferencia }];
    }

    const body = {
      ...(editId ? { id: editId } : {}),
      nome: form.nome, posicao: form.posicao,
      numero: form.numero ? +form.numero : undefined,
      time_atual: form.novoTime && editId ? form.novoTime : form.time_atual,
      transferencias,
    };

    const r = await fetch('/api/jogadores', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) { flash(true, editId ? 'Jogador atualizado!' : 'Jogador cadastrado!'); setForm(emptyForm()); setEditId(null); load(); }
    else flash(false, 'Erro ao salvar.');
  };

  const edit = (j: Jogador) => {
    setForm({ nome: j.nome, posicao: j.posicao, numero: j.numero?.toString() ?? '', time_atual: j.time_atual, novoTime: '', dataTransferencia: new Date().toISOString().slice(0, 10) });
    setEditId(j.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    const r = await fetch('/api/jogadores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) { flash(true, 'Removido.'); load(); } else flash(false, 'Erro.');
  };

  const nomeTime = (id: string) => times.find(t => t.id === id)?.nome ?? id;

  const lista = jogadores.filter(j =>
    (!filtroTime || j.time_atual === filtroTime) &&
    (!filtroPosicao || j.posicao === filtroPosicao)
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>👤 Jogadores</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Cadastre jogadores, posições e registre transferências entre times.</p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* FORM */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>
          {editId ? '✏️ Editar Jogador' : '+ Novo Jogador'}
        </h2>
        <form onSubmit={submit}>
          <div className="grid-3">
            <div className="form-group">
              <label>Nome completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Pedro Guilherme" />
            </div>
            <div className="form-group">
              <label>Posição *</label>
              <select value={form.posicao} onChange={e => setForm(f => ({ ...f, posicao: e.target.value }))}>
                {POSICOES.map(p => <option key={p} value={p}>{POSICAO_LABEL[p]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Número da camisa</label>
              <input type="number" min={1} max={99} value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ex: 9" />
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              {editId ? '🔄 Transferência / Time atual' : '🏠 Time inicial'}
            </p>
            <div className="grid-3">
              {!editId && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Time *</label>
                  <select value={form.time_atual} onChange={e => setForm(f => ({ ...f, time_atual: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}
              {editId && (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Novo time (transferência)</label>
                    <select value={form.novoTime} onChange={e => setForm(f => ({ ...f, novoTime: e.target.value }))}>
                      <option value="">Manter time atual</option>
                      {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Data da transferência</label>
                    <input type="date" value={form.dataTransferencia} onChange={e => setForm(f => ({ ...f, dataTransferencia: e.target.value }))} />
                  </div>
                </>
              )}
              {!editId && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Data de chegada ao clube</label>
                  <input type="date" value={form.dataTransferencia} onChange={e => setForm(f => ({ ...f, dataTransferencia: e.target.value }))} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button type="submit" className="btn btn-primary">{editId ? 'Salvar alterações' : 'Cadastrar jogador'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={() => { setForm(emptyForm()); setEditId(null); }}>Cancelar</button>}
          </div>
        </form>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .7rem', fontSize: '.85rem' }}
          value={filtroTime} onChange={e => setFiltroTime(e.target.value)}>
          <option value="">Todos os times</option>
          {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .7rem', fontSize: '.85rem' }}
          value={filtroPosicao} onChange={e => setFiltroPosicao(e.target.value)}>
          <option value="">Todas as posições</option>
          {POSICOES.map(p => <option key={p} value={p}>{POSICAO_LABEL[p]}</option>)}
        </select>
        <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>{lista.length} jogador(es)</span>
      </div>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {lista.map(j => (
          <div key={j.id} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem' }}>
                  {j.numero && <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: 'var(--verde)', minWidth: 28 }}>#{j.numero}</span>}
                  <strong style={{ fontSize: '1rem' }}>{j.nome}</strong>
                  <span className="badge badge-cinza">{POSICAO_LABEL[j.posicao]}</span>
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  🏠 {nomeTime(j.time_atual)}
                </div>
                {j.transferencias.length > 1 && (
                  <div style={{ marginTop: '.4rem', display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                    {j.transferencias.map((tr, i) => (
                      <span key={i} style={{ fontSize: '.7rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '.1rem .4rem', color: 'var(--text-muted)' }}>
                        {nomeTime(tr.time_id)} · {tr.data}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => edit(j)}>✏️ Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(j.id, j.nome)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum jogador encontrado.</p>}
      </div>
    </div>
  );
}
