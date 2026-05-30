'use client';
import { useState, useEffect } from 'react';
import { Jogador, Time, SubPosicao, Nacionalidade } from '@/lib/types';
import { clientGetJogadores, clientGetTimes, clientUpsertJogador, clientDeleteJogador, uid } from '@/lib/client';

const POSICOES = ['GOL','ZAG','LAT','VOL','MEI','ATA'];
const POS_LABEL: Record<string,string> = {GOL:'Goleiro',ZAG:'Zagueiro',LAT:'Lateral',VOL:'Volante',MEI:'Meia',ATA:'Atacante'};

// Sub-posições por posição principal
const SUB_POSICOES: Record<string, { value: SubPosicao; label: string }[]> = {
  GOL: [{ value: 'GOL', label: 'Goleiro' }],
  ZAG: [{ value: 'ZAG', label: 'Zagueiro' }],
  LAT: [
    { value: 'LD', label: 'Lateral Direito (LD)' },
    { value: 'LE', label: 'Lateral Esquerdo (LE)' },
  ],
  VOL: [{ value: 'VOL', label: 'Volante' }],
  MEI: [
    { value: 'MC', label: 'Meia Central (MC)' },
    { value: 'MO', label: 'Meia Ofensivo (MO)' },
  ],
  ATA: [
    { value: 'CA', label: 'Centroavante (CA)' },
    { value: 'PD', label: 'Ponta Direita (PD)' },
    { value: 'PE', label: 'Ponta Esquerda (PE)' },
  ],
};

const SUB_POS_LABEL: Record<string, string> = {
  GOL: 'GOL', ZAG: 'ZAG',
  LD: 'LD', LE: 'LE',
  VOL: 'VOL',
  MC: 'MC', MO: 'MO',
  CA: 'CA', PD: 'PD', PE: 'PE',
};

const NACIONALIDADES: { value: Nacionalidade; label: string; flag: string }[] = [
  { value: 'Brasileiro',    label: 'Brasileiro',    flag: '🇧🇷' },
  { value: 'Argentino',     label: 'Argentino',     flag: '🇦🇷' },
  { value: 'Uruguaio',      label: 'Uruguaio',      flag: '🇺🇾' },
  { value: 'Chileno',       label: 'Chileno',       flag: '🇨🇱' },
  { value: 'Paraguaio',     label: 'Paraguaio',     flag: '🇵🇾' },
  { value: 'Colombiano',    label: 'Colombiano',    flag: '🇨🇴' },
  { value: 'Outros Países', label: 'Outros Países', flag: '🌍' },
];

const NAC_FLAG: Record<string, string> = {
  Brasileiro:    '🇧🇷',
  Argentino:     '🇦🇷',
  Uruguaio:      '🇺🇾',
  Chileno:       '🇨🇱',
  Paraguaio:     '🇵🇾',
  Colombiano:    '🇨🇴',
  'Outros Países': '🌍',
};

const defaultSubPos = (posicao: string): SubPosicao => {
  const opts = SUB_POSICOES[posicao];
  return opts?.[0]?.value ?? (posicao as SubPosicao);
};

const emptyForm = () => ({
  nome: '', posicao: 'ATA', sub_posicao: 'CA' as SubPosicao,
  numero: '', idade: '', nacionalidade: 'Brasileiro' as Nacionalidade,
  time_atual: '', novoTime: '',
  dataTransferencia: new Date().toISOString().slice(0, 10),
  registro: '',
});

export default function AdminJogadores() {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [times, setTimes] = useState<Time[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string|null>(null);
  const [filtroTime, setFiltroTime] = useState('');
  const [filtroPosicao, setFiltroPosicao] = useState('');
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [j,t] = await Promise.all([clientGetJogadores(), clientGetTimes()]);
    setJogadores(j); setTimes(t);
  };
  useEffect(() => { load(); }, []);

  const flash = (ok: boolean, t: string) => {
    if (ok) setMsg(t); else setError(t);
    setTimeout(() => { setMsg(''); setError(''); }, 3500);
  };

  // Quando posição muda, resetar sub_posicao para o primeiro valor disponível
  const handlePosicaoChange = (novaPosicao: string) => {
    setForm(f => ({ ...f, posicao: novaPosicao, sub_posicao: defaultSubPos(novaPosicao) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.time_atual) return flash(false, 'Preencha nome e time atual.');

    if (form.registro) {
      const regNum = +form.registro;
      const duplicado = jogadores.find(j => j.registro === regNum && j.id !== editId);
      if (duplicado) return flash(false, `O registro ${regNum} já pertence ao jogador ${duplicado.nome}.`);
    }

    setLoading(true);
    try {
      const jogAtual = editId ? jogadores.find(j => j.id === editId) : null;
      let transferencias = jogAtual?.transferencias ?? [];
      const novoTimeId = (editId && form.novoTime) ? form.novoTime : form.time_atual;

      if (editId && form.novoTime && form.novoTime !== jogAtual?.time_atual) {
        transferencias = [...transferencias, { time_id: form.novoTime, data: form.dataTransferencia }];
      } else if (!editId) {
        transferencias = [{ time_id: form.time_atual, data: form.dataTransferencia }];
      }

      await clientUpsertJogador({
        id: editId || `j${uid()}`,
        nome: form.nome,
        idade: form.idade ? +form.idade : undefined,
        nacionalidade: form.nacionalidade,
        posicao: form.posicao as Jogador['posicao'],
        sub_posicao: form.sub_posicao,
        numero: form.numero ? +form.numero : undefined,
        time_atual: novoTimeId,
        transferencias,
        registro: form.registro ? +form.registro : undefined,
      });
      flash(true, editId ? 'Jogador atualizado!' : 'Jogador cadastrado!');
      setForm(emptyForm()); setEditId(null); load();
    } catch (e) { flash(false, 'Erro: ' + String(e)); }
    setLoading(false);
  };

  const edit = (j: Jogador) => {
    setForm({
      nome: j.nome,
      posicao: j.posicao,
      sub_posicao: j.sub_posicao ?? defaultSubPos(j.posicao),
      numero: j.numero?.toString() ?? '',
      idade: j.idade?.toString() ?? '',
      nacionalidade: (j.nacionalidade as Nacionalidade) ?? 'Brasileiro',
      time_atual: j.time_atual,
      novoTime: '',
      dataTransferencia: new Date().toISOString().slice(0, 10),
      registro: j.registro?.toString() ?? '',
    });
    setEditId(j.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    try { await clientDeleteJogador(id); flash(true, 'Removido.'); load(); }
    catch (e) { flash(false, 'Erro: ' + String(e)); }
  };

  const nomeTime = (id: string) => {
    if (id === 'outros') return 'Outros (Inativo/Transferido)';
    return times.find(t => t.id === id)?.nome ?? id;
  };

  const lista = jogadores.filter(j =>
    (!filtroTime || j.time_atual === filtroTime) &&
    (!filtroPosicao || j.posicao === filtroPosicao)
  );

  const subOpts = SUB_POSICOES[form.posicao] ?? [];
  const hasSubOpts = subOpts.length > 1;

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }
        .sub-pos-btn { display: inline-flex; align-items: center; justify-content: center; padding: .35rem .75rem; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-family: 'Bebas Neue', sans-serif; font-size: .95rem; letter-spacing: .06em; cursor: pointer; transition: all .15s; }
        .sub-pos-btn.active { background: var(--verde); border-color: var(--verde); color: #fff; }
        .sub-pos-btn:hover:not(.active) { border-color: #555; color: var(--text); }
      `}</style>
      <div className="container" style={{ paddingTop: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>👤 Jogadores</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Cadastre jogadores e registre transferências.</p>
        {msg && <div className="toast toast-success">{msg}</div>}
        {error && <div className="toast toast-error">{error}</div>}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', color: 'var(--amarelo)' }}>
            {editId ? '✏️ Editar Jogador' : '+ Novo Jogador'}
          </h2>
          <form onSubmit={submit}>
            <div className="grid-3">
              <div className="form-group">
                <label>Nome completo *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Registro (Código Único)</label>
                <input type="number" value={form.registro} onChange={e => setForm(f => ({ ...f, registro: e.target.value }))} placeholder="Ex: 123456" />
              </div>
              <div className="form-group">
                <label>Posição *</label>
                <select value={form.posicao} onChange={e => handlePosicaoChange(e.target.value)}>
                  {POSICOES.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}
                </select>
              </div>
            </div>

            {/* Sub-posição — só exibe quando há mais de uma opção */}
            {hasSubOpts && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '.5rem' }}>
                  Sub-posição
                </label>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {subOpts.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`sub-pos-btn${form.sub_posicao === opt.value ? ' active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, sub_posicao: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-3">
              <div className="form-group">
                <label>Número</label>
                <input type="number" min={1} max={99} value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Idade</label>
                <input type="number" min={14} max={50} value={form.idade} onChange={e => setForm(f => ({ ...f, idade: e.target.value }))} placeholder="Ex: 28" />
              </div>
              <div className="form-group">
                <label>Nacionalidade</label>
                <select value={form.nacionalidade} onChange={e => setForm(f => ({ ...f, nacionalidade: e.target.value as Nacionalidade }))}>
                  {NACIONALIDADES.map(n => (
                    <option key={n.value} value={n.value}>{n.flag} {n.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                {editId ? '🔄 Transferência' : '🏠 Time inicial'}
              </p>
              <div className="grid-3">
                {!editId && (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Time *</label>
                      <select value={form.time_atual} onChange={e => setForm(f => ({ ...f, time_atual: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        <option value="outros">Outros (Inativo/Transferido)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data de chegada</label>
                      <input type="date" value={form.dataTransferencia} onChange={e => setForm(f => ({ ...f, dataTransferencia: e.target.value }))} />
                    </div>
                  </>
                )}
                {editId && (
                  <>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Novo time</label>
                      <select value={form.novoTime} onChange={e => setForm(f => ({ ...f, novoTime: e.target.value }))}>
                        <option value="">Manter time atual</option>
                        {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        <option value="outros">Outros (Inativo/Transferido)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data da transferência</label>
                      <input type="date" value={form.dataTransferencia} onChange={e => setForm(f => ({ ...f, dataTransferencia: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Cadastrar jogador')}
              </button>
              {editId && (
                <button type="button" className="btn btn-ghost" onClick={() => { setForm(emptyForm()); setEditId(null); }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .7rem', fontSize: '.85rem' }}
            value={filtroTime} onChange={e => setFiltroTime(e.target.value)}
          >
            <option value="">Todos os times</option>
            {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            <option value="outros">Outros (Inativos)</option>
          </select>
          <select
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '.4rem .7rem', fontSize: '.85rem' }}
            value={filtroPosicao} onChange={e => setFiltroPosicao(e.target.value)}
          >
            <option value="">Todas as posições</option>
            {POSICOES.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}
          </select>
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>{lista.length} jogador(es)</span>
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {lista.map(j => (
            <div key={j.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                    {j.numero && (
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--verde)', minWidth: 28 }}>
                        #{j.numero}
                      </span>
                    )}
                    <strong>{j.nome}</strong>
                    {j.registro && (
                      <span style={{ fontSize: '.75rem', background: 'var(--surface2)', padding: '.1rem .4rem', borderRadius: 4, color: 'var(--amarelo)' }}>
                        REG: {j.registro}
                      </span>
                    )}
                    <span className="badge badge-cinza">{POS_LABEL[j.posicao]}</span>
                    {/* Badge de sub-posição */}
                    {j.sub_posicao && j.sub_posicao !== j.posicao && (
                      <span style={{
                        fontSize: '.7rem', padding: '.1rem .4rem', borderRadius: 4,
                        background: 'rgba(0,168,79,.12)', color: 'var(--verde)',
                        border: '1px solid rgba(0,168,79,.25)', fontWeight: 700, letterSpacing: '.04em',
                      }}>
                        {SUB_POS_LABEL[j.sub_posicao]}
                      </span>
                    )}
                    {/* Nacionalidade */}
                    {j.nacionalidade && j.nacionalidade !== 'Brasileiro' && (
                      <span className="badge badge-amarelo">
                        {NAC_FLAG[j.nacionalidade]} {j.nacionalidade}
                      </span>
                    )}
                    {j.idade && <span className="badge badge-cinza">{j.idade} anos</span>}
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>🏠 {nomeTime(j.time_atual)}</div>
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
          {lista.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum jogador encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
      }
