'use client';
import { useState, useEffect } from 'react';
import { Time, Estadio } from '@/lib/types';
import {
  clientGetTimes, clientUpsertTime, clientDeleteTime, clientGetEstadios,
  clientGetTemporadaTimes, clientSetDivisaoTime, clientTemporadaSelecionada, uid,
} from '@/lib/client';
import { DIVISOES, nomeDivisao } from '@/lib/utils';
import { EscudoTime } from '@/components/EscudoTime';

const empty = () => ({ nome: '', sigla: '', cor_primaria: '#006437', cor_secundaria: '#ffffff', estadio_id: '', api_football_id: '', divisao: '' });

export default function AdminTimes() {
  const [times, setTimes] = useState<Time[]>([]);
  const [estadios, setEstadios] = useState<Estadio[]>([]);
  const [temporada, setTemporada] = useState<number | null>(null);
  const [divPorTime, setDivPorTime] = useState<Record<string, number>>({});
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'sem' | number>('todos');
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const ano = await clientTemporadaSelecionada();
    setTemporada(ano);
    const [t, e, tt] = await Promise.all([clientGetTimes(), clientGetEstadios(), clientGetTemporadaTimes(ano)]);
    setTimes(t); setEstadios(e);
    setDivPorTime(Object.fromEntries(tt.map(r => [r.time_id, r.divisao])));
  };
  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, t: string) => { if (ok) setMsg(t); else setError(t); setTimeout(() => { setMsg(''); setError(''); }, 3500); };
  const f = (k: keyof ReturnType<typeof empty>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(v => ({ ...v, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const sigla = form.sigla.trim().toUpperCase();
    if (!form.nome.trim() || !sigla) return flash(false, 'Preencha nome e sigla.');
    if (times.some(t => t.sigla.toUpperCase() === sigla && t.id !== editId)) return flash(false, `A sigla ${sigla} já está em uso.`);
    if (temporada === null) return;
    setLoading(true);
    try {
      let id = editId;
      if (!id) {
        const base = sigla.toLowerCase();
        id = times.some(t => t.id === base) ? `${base}-${uid()}` : base;
      }
      await clientUpsertTime({
        id, nome: form.nome.trim(), sigla,
        cor_primaria: form.cor_primaria, cor_secundaria: form.cor_secundaria,
        estadio_id: form.estadio_id || undefined,
        api_football_id: form.api_football_id ? +form.api_football_id : null,
      } as Partial<Time> & { id: string });
      await clientSetDivisaoTime(temporada, id, form.divisao ? +form.divisao : null);
      flash(true, editId ? 'Time atualizado!' : 'Time cadastrado!');
      setForm(empty()); setEditId(null); load();
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
    setLoading(false);
  };

  const edit = (t: Time) => {
    setEditId(t.id);
    setForm({
      nome: t.nome, sigla: t.sigla, cor_primaria: t.cor_primaria, cor_secundaria: t.cor_secundaria ?? '#ffffff',
      estadio_id: t.estadio_id ?? '', api_football_id: t.api_football_id?.toString() ?? '',
      divisao: divPorTime[t.id]?.toString() ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const trocarDivisao = async (t: Time, valor: string) => {
    if (temporada === null) return;
    try {
      await clientSetDivisaoTime(temporada, t.id, valor ? +valor : null);
      setDivPorTime(m => { const n = { ...m }; if (valor) n[t.id] = +valor; else delete n[t.id]; return n; });
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
  };

  const del = async (t: Time) => {
    if (!confirm(`Remover o time "${t.nome}"? Só é possível se ele não tiver partidas, jogadores ou técnicos vinculados.`)) return;
    try { await clientDeleteTime(t.id); flash(true, 'Time removido.'); load(); }
    catch { flash(false, 'Não foi possível remover: o time tem partidas, jogadores ou técnicos vinculados. Para tirá-lo da temporada, use "Sem divisão".'); }
  };

  const contagem = (d: number) => times.filter(t => divPorTime[t.id] === d).length;
  const semDivisao = times.filter(t => divPorTime[t.id] === undefined).length;
  const visiveis = times.filter(t =>
    filtro === 'todos' ? true : filtro === 'sem' ? divPorTime[t.id] === undefined : divPorTime[t.id] === filtro);

  const chip = (ativo: boolean): React.CSSProperties => ({
    padding: '.3rem .8rem', borderRadius: 999, fontSize: '.8rem', cursor: 'pointer', border: '1px solid var(--border)',
    background: ativo ? 'rgba(255,223,0,.12)' : 'transparent', color: ativo ? 'var(--amarelo)' : 'var(--text-muted)',
  });

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }
      `}</style>
      <div className="container" style={{ paddingTop: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>🛡️ Times
          {temporada !== null && <span style={{ fontSize: '1.1rem', color: 'var(--amarelo)', marginLeft: '.75rem' }}>Temporada {temporada}</span>}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Cadastre os times e defina em qual divisão cada um joga na temporada selecionada no menu. Subidas e descidas de um ano para o outro são só mudar a divisão aqui.
        </p>
        {msg && <div className="toast toast-success">{msg}</div>}
        {error && <div className="toast toast-error">{error}</div>}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>{editId ? '✏️ Editar Time' : '+ Novo Time'}</h2>
          <form onSubmit={submit}>
            <div className="grid-2">
              <div className="form-group"><label>Nome *</label><input value={form.nome} onChange={f('nome')} placeholder="Ex: Sport Recife" /></div>
              <div className="form-group"><label>Sigla *</label><input value={form.sigla} onChange={f('sigla')} maxLength={4} placeholder="Ex: SPO" style={{ textTransform: 'uppercase' }} /></div>
              <div className="form-group"><label>Cor primária</label><input type="color" value={form.cor_primaria} onChange={f('cor_primaria')} /></div>
              <div className="form-group"><label>Cor secundária</label><input type="color" value={form.cor_secundaria} onChange={f('cor_secundaria')} /></div>
              <div className="form-group"><label>Estádio</label>
                <select value={form.estadio_id} onChange={f('estadio_id')}>
                  <option value="">Sem estádio</option>
                  {estadios.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.cidade}/{e.estado}</option>)}
                </select>
              </div>
              <div className="form-group"><label>ID API-Football (opcional)</label><input type="number" value={form.api_football_id} onChange={f('api_football_id')} /></div>
              <div className="form-group"><label>Divisão em {temporada ?? ''}</label>
                <select value={form.divisao} onChange={f('divisao')}>
                  <option value="">Sem divisão (fora da temporada)</option>
                  {DIVISOES.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Cadastrar time')}</button>
              {editId && <button type="button" className="btn btn-ghost" onClick={() => { setForm(empty()); setEditId(null); }}>Cancelar</button>}
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={chip(filtro === 'todos')} onClick={() => setFiltro('todos')}>Todos ({times.length})</span>
          {DIVISOES.map(d => <span key={d.id} style={chip(filtro === d.id)} onClick={() => setFiltro(d.id)}>{d.nome} ({contagem(d.id)})</span>)}
          <span style={chip(filtro === 'sem')} onClick={() => setFiltro('sem')}>Sem divisão ({semDivisao})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {visiveis.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum time nesta lista.</p>}
          {visiveis.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.8rem 1.25rem', flexWrap: 'wrap' }}>
              <EscudoTime time={t} size={34} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <strong>{t.nome}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>· {t.sigla}</span>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                  {divPorTime[t.id] !== undefined ? nomeDivisao(divPorTime[t.id]) : 'Fora da temporada'} em {temporada}
                </div>
              </div>
              <select value={divPorTime[t.id] ?? ''} onChange={e => trocarDivisao(t, e.target.value)} style={{ width: 'auto' }} aria-label={`Divisão de ${t.nome}`}>
                <option value="">Sem divisão</option>
                {DIVISOES.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => edit(t)}>✏️ Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(t)}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
