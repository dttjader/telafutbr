'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Partida, Time, Estadio, Tecnico } from '@/lib/types';
import { clientGetPartidas, clientGetTimes, clientUpsertPartida, clientDeletePartida, clientGetEstadios, clientGetTecnicos, uid } from '@/lib/client';

const STATUS_OPTS = [{value:'agendada',label:'Agendada'},{value:'ao_vivo',label:'Ao Vivo'},{value:'encerrada',label:'Encerrada'},{value:'adiada',label:'Adiada'}];
const emptyForm = () => ({rodada:'',data:'',hora:'16:00',status:'agendada',time_casa_id:'',time_visitante_id:'',estadio_id:'',placar_casa:'0',placar_visitante:'0',publico:'',acrescimo_primeiro:'0',acrescimo_segundo:'0',arb_principal:'',arb_ass1:'',arb_ass2:'',arb_quarto:'',arb_var:'',tecnico_casa_id:'',tecnico_visitante_id:'',link_transfermarkt:'',link_cbf:'',link_opta:''});

const PSEUDO_IDS = new Set(['outros']);
const filtrarTimesReais = (times: Time[]) => times.filter(t => !PSEUDO_IDS.has(t.id));

// Rodada completa = 10 partidas com status ENCERRADA (agendada/ao_vivo não contam)
const PARTIDAS_POR_RODADA = 10;
const TOTAL_RODADAS = 38;

export default function AdminPartidas() {
  const router = useRouter();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [times, setTimes] = useState<Time[]>([]);
  const [estadios, setEstadios] = useState<Estadio[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [p,t,e,tc] = await Promise.all([clientGetPartidas(),clientGetTimes(),clientGetEstadios(),clientGetTecnicos()]);
    setTecnicos(tc);
    setPartidas([...p].sort((a,b)=>b.rodada-a.rodada||a.data.localeCompare(b.data)));
    setTimes(filtrarTimesReais(t));
    setEstadios(e);
  };
  useEffect(()=>{load();},[]);

  const flash=(ok:boolean,t:string)=>{if(ok)setMsg(t);else setError(t);setTimeout(()=>{setMsg('');setError('');},3500);};
  const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(v=>({...v,[k]:e.target.value}));

  // Lista de rodadas (1 a 38) disponíveis para escolher no cadastro/edição de partida.
  // Uma rodada só some da lista quando já tem 10 partidas registradas (com qualquer
  // status) — exceto a rodada que já está selecionada na partida em edição, que
  // continua aparecendo mesmo estando "cheia".
  const rodadasDisponiveis = Array.from({length: TOTAL_RODADAS}, (_, i) => i + 1).filter(r => {
    const totalNaRodada = partidas.filter(p => p.rodada === r && p.id !== editId).length;
    return totalNaRodada < PARTIDAS_POR_RODADA;
  });

  const submit = async (ev:React.FormEvent) => {
    ev.preventDefault();
    if(!form.rodada||!form.time_casa_id||!form.time_visitante_id||!form.estadio_id) return flash(false,'Preencha rodada, times e estádio.');
    if(form.time_casa_id===form.time_visitante_id) return flash(false,'Times não podem ser iguais.');
    setLoading(true);
    try {
      const existente = editId ? partidas.find(p=>p.id===editId) : null;
      await clientUpsertPartida({
        id: editId||`p${uid()}`,
        rodada:+form.rodada, data:form.data || '', hora:form.hora, status:form.status as Partida['status'],
        time_casa_id:form.time_casa_id, time_visitante_id:form.time_visitante_id,
        estadio_id:form.estadio_id, publico:+form.publico||0,
        placar_casa:+form.placar_casa, placar_visitante:+form.placar_visitante,
        acrescimo_primeiro:+form.acrescimo_primeiro, acrescimo_segundo:+form.acrescimo_segundo,
        tecnico_casa_id: form.tecnico_casa_id || null,
        tecnico_visitante_id: form.tecnico_visitante_id || null,
        arbitragem:{principal:form.arb_principal,assistente1:form.arb_ass1,assistente2:form.arb_ass2,quarto:form.arb_quarto,var:form.arb_var},
        link_transfermarkt: form.link_transfermarkt.trim() || undefined,
        link_cbf: form.link_cbf.trim() || undefined,
        link_opta: form.link_opta.trim() || undefined,
        escalacao_casa: existente?.escalacao_casa ?? [],
        escalacao_visitante: existente?.escalacao_visitante ?? [],
        gols: existente?.gols ?? [],
        cartoes: existente?.cartoes ?? [],
        substituicoes: existente?.substituicoes ?? [],
        stats_jogadores: existente?.stats_jogadores ?? [],
      });
      flash(true, editId?'Partida atualizada!':'Partida cadastrada!');
      setForm(emptyForm()); setEditId(null); setShowForm(false); load();
    } catch(e) { flash(false,'Erro: '+String(e)); }
    setLoading(false);
  };

  const edit=(p:Partida)=>{
    setForm({rodada:p.rodada.toString(),data:p.data,hora:p.hora,status:p.status,time_casa_id:p.time_casa_id,time_visitante_id:p.time_visitante_id,estadio_id:p.estadio_id,publico:p.publico.toString(),placar_casa:p.placar_casa.toString(),placar_visitante:p.placar_visitante.toString(),acrescimo_primeiro:p.acrescimo_primeiro.toString(),acrescimo_segundo:p.acrescimo_segundo.toString(),arb_principal:p.arbitragem.principal,arb_ass1:p.arbitragem.assistente1,arb_ass2:p.arbitragem.assistente2,arb_quarto:p.arbitragem.quarto,arb_var:p.arbitragem.var,tecnico_casa_id:p.tecnico_casa_id??'',tecnico_visitante_id:p.tecnico_visitante_id??'',link_transfermarkt:p.link_transfermarkt??'',link_cbf:p.link_cbf??'',link_opta:p.link_opta??''});
    setEditId(p.id); setShowForm(true); window.scrollTo({top:0,behavior:'smooth'});
  };

  const del=async(id:string)=>{
    if(!confirm('Remover esta partida?')) return;
    try { await clientDeletePartida(id); flash(true,'Removida.'); load(); }
    catch(e) { flash(false,'Erro: '+String(e)); }
  };

  const nomeTime=(id:string)=>times.find(t=>t.id===id)?.sigla??id;
  const nomeEstadio=(id:string)=>estadios.find(e=>e.id===id)?.nome??id;
  const statusBadge:Record<string,string>={agendada:'badge-cinza',ao_vivo:'badge-vermelho',encerrada:'badge-verde',adiada:'badge-amarelo'};
  const statusLabel:Record<string,string>={agendada:'Agendada',ao_vivo:'🔴 Ao Vivo',encerrada:'Encerrada',adiada:'Adiada'};
  const rodadas=[...new Set(partidas.map(p=>p.rodada))].sort((a,b)=>b-a);

  const [openRodadas, setOpenRodadas] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (partidas.length > 0 && Object.keys(openRodadas).length === 0) {
      const init: Record<number, boolean> = {};
      rodadas.forEach(rod => {
        // Só considera COMPLETA quando há 10 partidas de fato ENCERRADAS
        const count = partidas.filter(p => p.rodada === rod && p.status === 'encerrada').length;
        init[rod] = count < PARTIDAS_POR_RODADA;
      });
      setOpenRodadas(init);
    }
  }, [partidas, rodadas]);

  const toggleRodada = (rod: number) => setOpenRodadas(o => ({ ...o, [rod]: !o[rod] }));

  return (
    <div className="container" style={{paddingTop:'2rem'}}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }
      `}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'2.5rem',marginBottom:'.25rem'}}>⚽ Partidas</h1>
          <p style={{color:'var(--text-muted)'}}>Cadastre partidas e gerencie seus eventos.</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setForm(emptyForm());setEditId(null);setShowForm(s=>!s);}}>
          {showForm?'✕ Fechar':'+ Nova Partida'}
        </button>
      </div>
      {msg&&<div className="toast toast-success">{msg}</div>}
      {error&&<div className="toast toast-error">{error}</div>}

      {showForm&&(
        <div className="card" style={{marginBottom:'2rem'}}>
          <h2 style={{fontSize:'1.3rem',marginBottom:'1.25rem',color:'var(--amarelo)'}}>{editId?'✏️ Editar Partida':'+ Nova Partida'}</h2>
          <form onSubmit={submit}>

            {/* Rodada (lista 1-38, ocultando as já completas), Data e Hora — campos reduzidos a ~30% do tamanho original */}
            <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',marginBottom:'1rem'}}>
              <div className="form-group" style={{width:90,margin:0}}><label>Rodada *</label>
                <select value={form.rodada} onChange={f('rodada')}>
                  <option value="">Sel.</option>
                  {rodadasDisponiveis.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group" style={{width:135,margin:0}}><label>Data</label><input type="date" value={form.data} onChange={f('data')} /></div>
              <div className="form-group" style={{width:100,margin:0}}><label>Hora</label><input type="time" value={form.hora} onChange={f('hora')} /></div>
            </div>

            {/* Estádio, Mandante, Visitante — nova ordem */}
            <div className="grid-3">
              <div className="form-group"><label>Estádio *</label>
                <select value={form.estadio_id} onChange={f('estadio_id')}>
                  <option value="">Selecione...</option>
                  {estadios.map(e=><option key={e.id} value={e.id}>{e.nome} — {e.cidade}/{e.estado}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Mandante *</label>
                <select value={form.time_casa_id} onChange={f('time_casa_id')}>
                  <option value="">Selecione...</option>
                  {times.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Visitante *</label>
                <select value={form.time_visitante_id} onChange={f('time_visitante_id')}>
                  <option value="">Selecione...</option>
                  {times.filter(t=>t.id!==form.time_casa_id).map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Status e Público — campos reduzidos a ~30% do tamanho original */}
            <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',marginBottom:'1rem'}}>
              <div className="form-group" style={{width:130,margin:0}}><label>Status</label>
                <select value={form.status} onChange={f('status')}>
                  {STATUS_OPTS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{width:100,margin:0}}><label>Público</label><input type="number" min={0} value={form.publico} onChange={f('publico')} /></div>
            </div>

            <div className="grid-2">
              <div className="form-group"><label>Técnico mandante</label><select value={form.tecnico_casa_id} onChange={f('tecnico_casa_id')}><option value="">Não informado</option>{tecnicos.filter(t=>t.ativo).map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <div className="form-group"><label>Técnico visitante</label><select value={form.tecnico_visitante_id} onChange={f('tecnico_visitante_id')}><option value="">Não informado</option>{tecnicos.filter(t=>t.ativo).map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
            </div>

            <div style={{background:'var(--surface2)',borderRadius:8,padding:'1rem',marginBottom:'1rem'}}>
              <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'.75rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Acréscimos</p>
              {/* Gols Casa/Visitante ocultos: o placar agora é atualizado automaticamente pelo registro de gols em "Eventos da Partida" */}
              <div className="grid-2">
                <div className="form-group" style={{margin:0}}><label>Acrésc. 1º tempo</label><input type="number" min={0} value={form.acrescimo_primeiro} onChange={f('acrescimo_primeiro')} /></div>
                <div className="form-group" style={{margin:0}}><label>Acrésc. 2º tempo</label><input type="number" min={0} value={form.acrescimo_segundo} onChange={f('acrescimo_segundo')} /></div>
              </div>
            </div>

            <div style={{background:'var(--surface2)',borderRadius:8,padding:'1rem',marginBottom:'1rem'}}>
              <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'.75rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Arbitragem</p>
              <div className="grid-2">
                {[['arb_principal','Árbitro principal'],['arb_ass1','Assistente 1'],['arb_ass2','Assistente 2'],['arb_quarto','4º árbitro'],['arb_var','VAR']].map(([key,label])=>(
                  <div key={key} className="form-group" style={{margin:0}}><label>{label}</label><input value={(form as Record<string,string>)[key]} onChange={f(key)} /></div>
                ))}
              </div>
            </div>

            <div style={{background:'var(--surface2)',borderRadius:8,padding:'1rem',marginBottom:'1rem'}}>
              <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'.75rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Links Externos</p>
              <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginBottom:'.75rem'}}>Opcional. Cole o link da página desta partida em cada site, se disponível.</p>
              <div className="grid-3">
                <div className="form-group" style={{margin:0}}><label>Link Transfermarkt</label><input type="url" placeholder="https://www.transfermarkt.com.br/..." value={form.link_transfermarkt} onChange={f('link_transfermarkt')} /></div>
                <div className="form-group" style={{margin:0}}><label>Link CBF</label><input type="url" placeholder="https://www.cbf.com.br/..." value={form.link_cbf} onChange={f('link_cbf')} /></div>
                <div className="form-group" style={{margin:0}}><label>Link Opta</label><input type="url" placeholder="https://opta.com/..." value={form.link_opta} onChange={f('link_opta')} /></div>
              </div>
            </div>

            <div style={{display:'flex',gap:'.75rem'}}>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Salvando...':(editId?'Salvar alterações':'Cadastrar partida')}</button>
              <button type="button" className="btn btn-ghost" onClick={()=>{setForm(emptyForm());setEditId(null);setShowForm(false);}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {rodadas.map(rod=>{
        const ps=partidas.filter(p=>p.rodada===rod);
        // Só considera COMPLETA quando há 10 partidas de fato ENCERRADAS
        const countEncerradas = ps.filter(p => p.status === 'encerrada').length;
        const completa = countEncerradas >= PARTIDAS_POR_RODADA;
        const isOpen=openRodadas[rod]??false;
        return (
          <section key={rod} style={{marginBottom:'1rem'}}>
            <button onClick={()=>toggleRodada(rod)} style={{width:'100%',display:'flex',alignItems:'center',gap:'1rem',background:isOpen?'var(--surface)':'var(--surface2)',border:'1px solid var(--border)',borderRadius:isOpen?'10px 10px 0 0':10,padding:'.8rem 1.25rem',cursor:'pointer',textAlign:'left'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',color:'var(--text)'}}>{rod}ª Rodada</span>
              <span style={{fontSize:'.75rem',color:'var(--text-muted)',flex:1}}>{ps.length} partida(s) · {countEncerradas} encerrada(s)</span>
              {completa&&<span style={{fontSize:'.68rem',background:'rgba(0,168,79,.12)',color:'var(--verde)',border:'1px solid rgba(0,168,79,.25)',borderRadius:4,padding:'.15rem .5rem',fontWeight:700}}>COMPLETA</span>}
              <span style={{color:'var(--text-muted)',fontSize:'1.1rem',transform:isOpen?'rotate(180deg)':'none',transition:'transform .2s'}}>▾</span>
            </button>
            {isOpen&&(
              <div style={{border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 10px 10px',padding:'1rem',background:'var(--surface)',display:'flex',flexDirection:'column',gap:'.5rem'}}>
                {ps.map(p=>(
                  <div key={p.id} className="card" style={{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem 1.25rem',flexWrap:'wrap'}}>
                    <span className={`badge ${statusBadge[p.status]}`}>{statusLabel[p.status]}</span>
                    <div style={{flex:1,fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',letterSpacing:'.05em'}}>
                      {nomeTime(p.time_casa_id)}<span style={{color:'var(--verde)',margin:'0 .5rem'}}>{p.placar_casa} × {p.placar_visitante}</span>{nomeTime(p.time_visitante_id)}
                    </div>
                    <div style={{display:'flex',gap:'.8rem',alignItems:'center'}}>
                      <div style={{fontSize:'.75rem',background:'var(--surface2)',padding:'.2rem .5rem',borderRadius:6,color:'var(--text-muted)',display:'flex',gap:'.5rem'}}>
                        <span>G: <strong>{p.gols.length}</strong></span>
                        <span>C: <strong>{p.cartoes.length}</strong></span>
                        <span>S: <strong>{p.substituicoes.length}</strong></span>
                      </div>
                      <div style={{fontSize:'.78rem',color:'var(--text-muted)'}}>{p.data ? p.data.split('-').reverse().join('/') : 'A definir'} · {p.hora} · {nomeEstadio(p.estadio_id)}</div>
                    </div>
                    {(p.link_transfermarkt||p.link_cbf||p.link_opta) && (
                      <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                        {p.link_transfermarkt&&<a href={p.link_transfermarkt} target="_blank" rel="noopener noreferrer" style={{fontSize:'.68rem',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'.15rem .45rem',color:'var(--text-muted)',textDecoration:'none'}}>🔗 Transfermarkt</a>}
                        {p.link_cbf&&<a href={p.link_cbf} target="_blank" rel="noopener noreferrer" style={{fontSize:'.68rem',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'.15rem .45rem',color:'var(--text-muted)',textDecoration:'none'}}>🔗 CBF</a>}
                        {p.link_opta&&<a href={p.link_opta} target="_blank" rel="noopener noreferrer" style={{fontSize:'.68rem',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:4,padding:'.15rem .45rem',color:'var(--text-muted)',textDecoration:'none'}}>🔗 Opta</a>}
                      </div>
                    )}
                    <div style={{display:'flex',gap:'.5rem'}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>router.push(`/admin/partida/${p.id}`)}>📋 Eventos</button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>edit(p)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>del(p.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {partidas.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'3rem'}}>Nenhuma partida cadastrada.</p>}
    </div>
  );
}
