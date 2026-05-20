'use client';
import { useState, useEffect } from 'react';
import { Tecnico, Time } from '@/lib/types';
import { clientGetTecnicos, clientGetTimes, clientUpsertTecnico, clientDeleteTecnico, uid } from '@/lib/client';

const emptyForm = () => ({
  nome: '', nacionalidade: '', time_atual: '',
  novoTime: '', dataInicio: new Date().toISOString().slice(0, 10),
  dataFim: '', inativar: false, dataInativacao: new Date().toISOString().slice(0, 10),
});

export default function AdminTecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [times, setTimes] = useState<Time[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [t, tm] = await Promise.all([clientGetTecnicos(), clientGetTimes()]);
    setTecnicos(t); setTimes(tm);
  };
  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, t: string) => {
    if (ok) setMsg(t); else setError(t);
    setTimeout(() => { setMsg(''); setError(''); }, 3500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return flash(false, 'Preencha o nome do técnico.');
    setLoading(true);
    try {
      const atual = editId ? tecnicos.find(t => t.id === editId) : null;
      let historico = atual?.historico ?? [];
      let timeAtual = form.time_atual || null;
      let ativo = true;

      if (!editId) {
        // Novo técnico
        if (form.time_atual) {
          historico = [{ time_id: form.time_atual, data_inicio: form.dataInicio, data_fim: null, inativo: false }];
        }
      } else {
        // Editando — transferência para novo time
        if (form.novoTime && form.novoTime !== atual?.time_atual) {
          // Fechar entrada anterior
          historico = historico.map((h, i) =>
            i === historico.length - 1 && !h.data_fim
              ? { ...h, data_fim: form.dataInicio }
              : h
          );
          historico = [...historico, { time_id: form.novoTime, data_inicio: form.dataInicio, data_fim: null, inativo: false }];
          timeAtual = form.novoTime;
        }
        // Inativar (ficou desempregado)
        if (form.inativar) {
          historico = historico.map((h, i) =>
            i === historico.length - 1 && !h.data_fim
              ? { ...h, data_fim: form.dataInativacao }
              : h
          );
          historico = [...historico, { time_id: null, data_inicio: form.dataInativacao, data_fim: null, inativo: true }];
          timeAtual = null;
          ativo = false;
        }
        // Reativar
        if (!form.inativar && atual && !atual.ativo && form.novoTime) {
          ativo = true;
        }
      }

      await clientUpsertTecnico({
        id: editId || `tc${uid()}`,
        nome: form.nome,
        nacionalidade: form.nacionalidade || undefined,
        time_atual: timeAtual,
        ativo,
        historico,
      });

      flash(true, editId ? 'Técnico atualizado!' : 'Técnico cadastrado!');
      setForm(emptyForm()); setEditId(null); load();
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
    setLoading(false);
  };

  const edit = (t: Tecnico) => {
    setForm({ ...emptyForm(), nome: t.nome, nacionalidade: t.nacionalidade ?? '', time_atual: t.time_atual ?? '' });
    setEditId(t.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    try { await clientDeleteTecnico(id); flash(true, 'Removido.'); load(); }
    catch (e) { flash(false, 'Erro: ' + String(e)); }
  };

  const nomeTime = (id: string | null) => id ? (times.find(t => t.id === id)?.nome ?? id) : '—';
  const editando = editId ? tecnicos.find(t => t.id === editId) : null;

  const lista = tecnicos.filter(t =>
    filtroAtivo === 'todos' ? true :
    filtroAtivo === 'ativos' ? t.ativo :
    !t.ativo
  );

  return (
    <div style={{position: 'relative'}}>
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
    <div className="container" style={{ paddingTop: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>🧑‍💼 Técnicos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Cadastre técnicos, registre transferências e períodos de inatividade.
      </p>

      {msg && <div className="toast toast-success">{msg}</div>}
      {error && <div className="toast toast-error">{error}</div>}

      {/* FORMULÁRIO */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>
          {editId ? '✏️ Editar Técnico' : '+ Novo Técnico'}
        </h2>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Nome completo *</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Filipe Luís" />
            </div>
            <div className="form-group">
              <label>Nacionalidade</label>
              <input value={form.nacionalidade} onChange={e => setForm(f => ({ ...f, nacionalidade: e.target.value }))} placeholder="Ex: Brasileiro" />
            </div>
          </div>

          {/* Novo técnico: time inicial */}
          {!editId && (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                🏠 Time inicial
              </p>
              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Time atual</label>
                  <select value={form.time_atual} onChange={e => setForm(f => ({ ...f, time_atual: e.target.value }))}>
                    <option value="">Desempregado</option>
                    {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                {form.time_atual && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Data de início</label>
                    <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editando: transferência ou inativação */}
          {editId && (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                🔄 Movimentação
              </p>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                Time atual: <strong style={{ color: 'var(--text)' }}>{nomeTime(editando?.time_atual ?? null)}</strong>
                {!editando?.ativo && <span style={{ marginLeft: '.5rem', color: 'var(--rebaixamento)' }}>· Inativo</span>}
              </div>

              {/* Transferência */}
              {!form.inativar && (
                <div className="grid-2" style={{ marginBottom: '.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Transferir para</label>
                    <select value={form.novoTime} onChange={e => setForm(f => ({ ...f, novoTime: e.target.value }))}>
                      <option value="">Manter time atual</option>
                      {times.filter(t => t.id !== editando?.time_atual).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  {form.novoTime && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data de início no novo time</label>
                      <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
                    </div>
                  )}
                </div>
              )}

              {/* Inativação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                  <input type="checkbox" checked={form.inativar}
                    onChange={e => setForm(f => ({ ...f, inativar: e.target.checked, novoTime: '' }))} />
                  Marcar como inativo (desempregado)
                </label>
                {form.inativar && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Data de saída</label>
                    <input type="date" value={form.dataInativacao} onChange={e => setForm(f => ({ ...f, dataInativacao: e.target.value }))} />
                  </div>
                )}
              </div>

              {/* Reativar */}
              {editando && !editando.ativo && (
                <div style={{ marginTop: '.75rem', padding: '.6rem .75rem', background: 'rgba(0,168,79,.08)', borderRadius: 6, fontSize: '.82rem', color: 'var(--verde)' }}>
                  ℹ️ Para reativar, selecione um novo time acima.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Cadastrar técnico')}
            </button>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={() => { setForm(emptyForm()); setEditId(null); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {(['todos', 'ativos', 'inativos'] as const).map(f => (
          <button key={f} onClick={() => setFiltroAtivo(f)}
            className={`btn btn-sm ${filtroAtivo === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }}>
            {f === 'todos' ? 'Todos' : f === 'ativos' ? '✅ Ativos' : '⏸️ Inativos'}
          </button>
        ))}
        <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '.25rem' }}>
          {lista.length} técnico(s)
        </span>
      </div>

      {/* LISTA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {lista.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum técnico encontrado.</p>}
        {lista.map(t => (
          <div key={t.id} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `3px solid ${t.ativo ? 'var(--verde)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1rem' }}>{t.nome}</strong>
                  {t.nacionalidade && <span className="badge badge-cinza">{t.nacionalidade}</span>}
                  {!t.ativo && <span className="badge badge-vermelho">Inativo</span>}
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                  {t.ativo
                    ? (t.time_atual ? `🏠 ${nomeTime(t.time_atual)}` : '🔍 Disponível')
                    : '⏸️ Desempregado'}
                </div>
                {/* Histórico */}
                {t.historico.length > 0 && (
                  <div style={{ marginTop: '.5rem', display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                    {t.historico.map((h, i) => (
                      <span key={i} style={{
                        fontSize: '.7rem', padding: '.1rem .45rem', borderRadius: 4,
                        background: h.inativo ? 'rgba(239,68,68,.1)' : 'var(--surface2)',
                        border: '1px solid var(--border)', color: h.inativo ? 'var(--rebaixamento)' : 'var(--text-muted)'
                      }}>
                        {h.inativo ? '⏸️ Inativo' : nomeTime(h.time_id)}
                        {' · '}{h.data_inicio}{h.data_fim ? ` → ${h.data_fim}` : ' → atual'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => edit(t)}>✏️ Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(t.id, t.nome)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
