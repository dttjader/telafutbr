'use client';
import { useState, useEffect } from 'react';
import { Estadio } from '@/lib/types';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const empty = (): Partial<Estadio> => ({ nome: '', cidade: '', estado: 'SP', capacidade: undefined });

export default function AdminEstadios() {
  const [estadios, setEstadios] = useState<Estadio[]>([]);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => fetch('/api/estadios').then(r => r.json()).then(setEstadios);
  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, text: string) => {
    if (ok) setMsg(text); else setError(text);
    setTimeout(() => { setMsg(''); setError(''); }, 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cidade || !form.estado) return flash(false, 'Preencha nome, cidade e estado.');
    const method = editId ? 'PUT' : 'POST';
    const body = editId ? { ...form, id: editId } : form;
    const r = await fetch('/api/estadios', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) { flash(true, editId ? 'Estádio atualizado!' : 'Estádio cadastrado!'); setForm(empty()); setEditId(null); load(); }
    else flash(false, 'Erro ao salvar.');
  };

  const edit = (e: Estadio) => { setForm(e); setEditId(e.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    const r = await fetch('/api/estadios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) { flash(true, 'Removido.'); load(); } else flash(false, 'Erro ao remover.');
  };

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>🏟️ Estádios</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Cadastre e gerencie os estádios utilizados nas partidas.</p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>
          {editId ? '✏️ Editar Estádio' : '+ Novo Estádio'}
        </h2>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Nome do Estádio *</label>
              <input value={form.nome ?? ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Maracanã" />
            </div>
            <div className="form-group">
              <label>Capacidade</label>
              <input type="number" value={form.capacidade ?? ''} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value ? +e.target.value : undefined }))} placeholder="Ex: 78838" />
            </div>
            <div className="form-group">
              <label>Cidade *</label>
              <input value={form.cidade ?? ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Ex: Rio de Janeiro" />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <select value={form.estado ?? 'SP'} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
            <button type="submit" className="btn btn-primary">{editId ? 'Salvar alterações' : 'Cadastrar estádio'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={() => { setForm(empty()); setEditId(null); }}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {estadios.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum estádio cadastrado.</p>}
        {estadios.map(e => (
          <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div>
              <strong style={{ fontSize: '1rem' }}>{e.nome}</strong>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>
                {e.cidade} · {e.estado}
                {e.capacidade ? ` · ${e.capacidade.toLocaleString('pt-BR')} lugares` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => edit(e)}>✏️ Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(e.id, e.nome)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
