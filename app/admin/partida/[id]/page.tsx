'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Partida, Time, Jogador, Gol, Cartao, Substituicao, EscalacaoJogador } from '@/lib/types';
import { clientGetPartida, clientGetTimes, clientGetJogadores, clientUpsertPartida, uid } from '@/lib/client';

const POSICOES = ['GOL','ZAG','LAT','VOL','MEI','ATA'];
const TIPO_GOL = ['normal','penalti','falta','contra'];
const TIPO_GOL_LABEL:Record<string,string>={normal:'Gol',penalti:'Pênalti',falta:'Falta',contra:'Contra'};

export default function AdminPartidaEventos() {
  const {id} = useParams<{id:string}>();
  const [partida, setPartida] = useState<Partida|null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [tab, setTab] = useState<'escalacao'|'gols'|'cartoes'|'subs'>('escalacao');

  const flash=(ok:boolean,t:string)=>{if(ok)setMsg(t);else setError(t);setTimeout(()=>{setMsg('');setError('');},3500);};

  const load = useCallback(async () => {
    const [p,t,j] = await Promise.all([clientGetPartida(id), clientGetTimes(), clientGetJogadores()]);
    setPartida(p); setTimes(t); setJogadores(j);
  },[id]);
  useEffect(()=>{load();},[load]);

  const save = async (updated: Partida) => {
    try {
      await clientUpsertPartida(updated);
      flash(true,'Salvo!'); load();
    } catch(e) { flash(false,'Erro: '+String(e)); }
  };

  if(!partida) return <div className="container" style={{paddingTop:'3rem',color:'var(--text-muted)'}}>Carregando...</div>;

  const timeCasa=times.find(t=>t.id===partida.time_casa_id);
  const timeVis=times.find(t=>t.id===partida.time_visitante_id);
  const jogCasa=jogadores.filter(j=>j.time_atual===partida.time_casa_id);
  const jogVis=jogadores.filter(j=>j.time_atual===partida.time_visitante_id);
  const nomeJog=(jid:string)=>jogadores.find(j=>j.id===jid)?.nome??jid;
  const nomeTime=(tid:string)=>times.find(t=>t.id===tid)?.sigla??tid;

  // ── ESCALAÇÃO ──
  const EscalacaoTab=()=>{
    const addJog=(isCasa:boolean)=>{
      const lista=isCasa?jogCasa:jogVis;
      if(!lista.length) return flash(false,'Nenhum jogador cadastrado para este time.');
      const novo:EscalacaoJogador={jogador_id:lista[0].id,numero:1,posicao:'ATA',titular:true};
      const u={...partida};
      if(isCasa) u.escalacao_casa=[...u.escalacao_casa,novo];
      else u.escalacao_visitante=[...u.escalacao_visitante,novo];
      save(u as Partida);
    };
    const upd=(isCasa:boolean,idx:number,field:string,value:string|boolean)=>{
      const u={...partida};
      const esc=isCasa?[...u.escalacao_casa]:[...u.escalacao_visitante];
      esc[idx]={...esc[idx],[field]:field==='numero'?+value:value};
      if(isCasa) u.escalacao_casa=esc; else u.escalacao_visitante=esc;
      save(u as Partida);
    };
    const rem=(isCasa:boolean,idx:number)=>{
      const u={...partida};
      if(isCasa) u.escalacao_casa=u.escalacao_casa.filter((_,i)=>i!==idx);
      else u.escalacao_visitante=u.escalacao_visitante.filter((_,i)=>i!==idx);
      save(u as Partida);
    };
    const Block=({isCasa}:{isCasa:boolean})=>{
      const esc=isCasa?partida.escalacao_casa:partida.escalacao_visitante;
      const time=isCasa?timeCasa:timeVis;
      const lista=isCasa?jogCasa:jogVis;
      return (
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
            <h3 style={{fontSize:'1.2rem'}}>{time?.nome} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>{isCasa?'(Mandante)':'(Visitante)'}</span></h3>
            <button className="btn btn-primary btn-sm" onClick={()=>addJog(isCasa)}>+ Jogador</button>
          </div>
          {esc.length===0&&<p style={{color:'var(--text-muted)',fontSize:'.85rem'}}>Nenhum jogador adicionado.</p>}
          {esc.map((e,i)=>(
            <div key={i} style={{display:'flex',gap:'.5rem',marginBottom:'.4rem',background:'var(--surface2)',borderRadius:6,padding:'.5rem'}}>
              <input type="number" min={1} max={99} value={e.numero} onChange={ev=>upd(isCasa,i,'numero',ev.target.value)} style={{width:52,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem',textAlign:'center'}} />
              <select value={e.jogador_id} onChange={ev=>upd(isCasa,i,'jogador_id',ev.target.value)} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                {lista.map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
              <select value={e.posicao} onChange={ev=>upd(isCasa,i,'posicao',ev.target.value)} style={{width:60,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                {POSICOES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <label style={{display:'flex',alignItems:'center',gap:4,fontSize:'.8rem',color:'var(--text-muted)',cursor:'pointer',whiteSpace:'nowrap'}}>
                <input type="checkbox" checked={e.titular} onChange={ev=>upd(isCasa,i,'titular',ev.target.checked)} /> Titular
              </label>
              <button className="btn btn-danger btn-sm" onClick={()=>rem(isCasa,i)}>✕</button>
            </div>
          ))}
        </div>
      );
    };
    return <div style={{display:'flex',gap:'2rem',flexWrap:'wrap'}}><Block isCasa={true}/><Block isCasa={false}/></div>;
  };

  // ── GOLS ──
  const GolsTab=()=>{
    const [form,setForm]=useState({minuto:'',acrescimo:'0',time_id:partida.time_casa_id,jogador_id:'',assistencia_id:'',tipo:'normal',goleiro_id:'',descricao:''});
    const jogDoTime=(tid:string)=>jogadores.filter(j=>j.time_atual===tid);
    const goleiros=jogadores.filter(j=>j.posicao==='GOL');
    const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(v=>({...v,[k]:e.target.value}));
    const add=()=>{
      if(!form.minuto||!form.jogador_id) return flash(false,'Preencha o minuto e o jogador.');
      const novo:Gol={id:`g${uid()}`,minuto:+form.minuto,acrescimo:+form.acrescimo,time_id:form.time_id,jogador_id:form.jogador_id,assistencia_id:form.assistencia_id||null,tipo:form.tipo as Gol['tipo'],goleiro_id:form.goleiro_id,descricao:form.descricao};
      save({...partida,gols:[...partida.gols,novo].sort((a,b)=>a.minuto-b.minuto)});
      setForm({minuto:'',acrescimo:'0',time_id:partida.time_casa_id,jogador_id:'',assistencia_id:'',tipo:'normal',goleiro_id:'',descricao:''});
    };
    const del=(gid:string)=>save({...partida,gols:partida.gols.filter(g=>g.id!==gid)});
    return (
      <div>
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:'var(--amarelo)'}}>+ Registrar Gol</h3>
          <div className="grid-3">
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Acréscimo</label><input type="number" min={0} value={form.acrescimo} onChange={f('acrescimo')} /></div>
            <div className="form-group"><label>Tipo</label><select value={form.tipo} onChange={f('tipo')}>{TIPO_GOL.map(t=><option key={t} value={t}>{TIPO_GOL_LABEL[t]}</option>)}</select></div>
            <div className="form-group"><label>Time marcador</label>
              <select value={form.time_id} onChange={e=>{setForm(v=>({...v,time_id:e.target.value,jogador_id:'',assistencia_id:''}))}}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group"><label>Jogador *</label>
              <select value={form.jogador_id} onChange={f('jogador_id')}>
                <option value="">Selecione...</option>
                {jogDoTime(form.time_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Assistência</label>
              <select value={form.assistencia_id} onChange={f('assistencia_id')}>
                <option value="">Sem assistência</option>
                {jogDoTime(form.time_id).filter(j=>j.id!==form.jogador_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Goleiro adversário</label>
              <select value={form.goleiro_id} onChange={f('goleiro_id')}>
                <option value="">Selecione...</option>
                {goleiros.filter(j=>j.time_atual!==form.time_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}><label>Descrição</label><input value={form.descricao} onChange={f('descricao')} /></div>
          </div>
          <button className="btn btn-primary" onClick={add}>⚽ Adicionar Gol</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
          {partida.gols.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhum gol registrado.</p>}
          {partida.gols.map(g=>(
            <div key={g.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',borderLeft:`3px solid ${g.time_id===partida.time_casa_id?'var(--verde)':'var(--amarelo)'}`}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--verde)',minWidth:40}}>{g.minuto}{g.acrescimo>0?`+${g.acrescimo}`:''}&apos;</span>
              <span>⚽</span>
              <div style={{flex:1}}>
                <strong>{nomeJog(g.jogador_id)}</strong>
                {g.assistencia_id&&<span style={{color:'var(--text-muted)',fontSize:'.85rem'}}> · assist. {nomeJog(g.assistencia_id)}</span>}
                <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{TIPO_GOL_LABEL[g.tipo]} · {nomeTime(g.time_id)}{g.goleiro_id?' · Goleiro: '+nomeJog(g.goleiro_id):''}</div>
                {g.descricao&&<div style={{fontSize:'.75rem',color:'var(--text-muted)',fontStyle:'italic'}}>{g.descricao}</div>}
              </div>
              <button className="btn btn-danger btn-sm" onClick={()=>del(g.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── CARTÕES ──
  const CartoesTab=()=>{
    const [form,setForm]=useState({minuto:'',tipo:'amarelo',jogador_id:'',time_id:partida.time_casa_id,motivo:''});
    const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(v=>({...v,[k]:e.target.value}));
    const jogDoTime=(tid:string)=>jogadores.filter(j=>j.time_atual===tid);
    const add=()=>{
      if(!form.minuto||!form.jogador_id) return flash(false,'Preencha minuto e jogador.');
      const novo:Cartao={id:`c${uid()}`,minuto:+form.minuto,tipo:form.tipo as Cartao['tipo'],jogador_id:form.jogador_id,time_id:form.time_id,motivo:form.motivo};
      save({...partida,cartoes:[...partida.cartoes,novo].sort((a,b)=>a.minuto-b.minuto)});
      setForm({minuto:'',tipo:'amarelo',jogador_id:'',time_id:partida.time_casa_id,motivo:''});
    };
    const del=(cid:string)=>save({...partida,cartoes:partida.cartoes.filter(c=>c.id!==cid)});
    return (
      <div>
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:'var(--amarelo)'}}>+ Registrar Cartão</h3>
          <div className="grid-2" style={{maxWidth:600}}>
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Tipo</label><select value={form.tipo} onChange={f('tipo')}><option value="amarelo">🟨 Amarelo</option><option value="vermelho">🟥 Vermelho</option></select></div>
            <div className="form-group"><label>Time</label>
              <select value={form.time_id} onChange={e=>setForm(v=>({...v,time_id:e.target.value,jogador_id:''}))}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group"><label>Jogador *</label>
              <select value={form.jogador_id} onChange={f('jogador_id')}>
                <option value="">Selecione...</option>
                {jogDoTime(form.time_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}><label>Motivo</label><input value={form.motivo} onChange={f('motivo')} /></div>
          </div>
          <button className="btn btn-primary" onClick={add}>+ Adicionar Cartão</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
          {partida.cartoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhum cartão registrado.</p>}
          {partida.cartoes.map(c=>(
            <div key={c.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
              <span style={{width:14,height:20,borderRadius:2,background:c.tipo==='vermelho'?'var(--rebaixamento)':'var(--amarelo)',flexShrink:0,display:'inline-block'}} />
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--verde)',minWidth:36}}>{c.minuto}&apos;</span>
              <strong style={{flex:1}}>{nomeJog(c.jogador_id)}</strong>
              <span style={{fontSize:'.8rem',color:'var(--text-muted)'}}>{nomeTime(c.time_id)}</span>
              {c.motivo&&<span style={{fontSize:'.8rem',color:'var(--text-muted)'}}>{c.motivo}</span>}
              <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── SUBSTITUIÇÕES ──
  const SubsTab=()=>{
    const [form,setForm]=useState({minuto:'',time_id:partida.time_casa_id,sai_id:'',entra_id:''});
    const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(v=>({...v,[k]:e.target.value}));
    const jogDoTime=(tid:string)=>jogadores.filter(j=>j.time_atual===tid);
    const add=()=>{
      if(!form.minuto||!form.sai_id||!form.entra_id) return flash(false,'Preencha todos os campos.');
      if(form.sai_id===form.entra_id) return flash(false,'Jogadores devem ser diferentes.');
      const novo={id:`s${uid()}`,minuto:+form.minuto,time_id:form.time_id,sai_id:form.sai_id,entra_id:form.entra_id};
      save({...partida,substituicoes:[...partida.substituicoes,novo].sort((a,b)=>a.minuto-b.minuto)});
      setForm({minuto:'',time_id:partida.time_casa_id,sai_id:'',entra_id:''});
    };
    const del=(sid:string)=>save({...partida,substituicoes:partida.substituicoes.filter(s=>s.id!==sid)});
    return (
      <div>
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:'var(--amarelo)'}}>+ Registrar Substituição</h3>
          <div className="grid-2" style={{maxWidth:600}}>
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Time</label>
              <select value={form.time_id} onChange={e=>setForm(v=>({...v,time_id:e.target.value,sai_id:'',entra_id:''}))}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group"><label>↓ Sai</label>
              <select value={form.sai_id} onChange={f('sai_id')}>
                <option value="">Selecione...</option>
                {jogDoTime(form.time_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div className="form-group"><label>↑ Entra</label>
              <select value={form.entra_id} onChange={f('entra_id')}>
                <option value="">Selecione...</option>
                {jogDoTime(form.time_id).filter(j=>j.id!==form.sai_id).map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={add}>🔄 Adicionar Substituição</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
          {partida.substituicoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhuma substituição registrada.</p>}
          {partida.substituicoes.map(s=>(
            <div key={s.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'.75rem'}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--verde)',minWidth:36}}>{s.minuto}&apos;</span>
              <span style={{fontSize:'.85rem',color:'var(--text-muted)',minWidth:40}}>{nomeTime(s.time_id)}</span>
              <span style={{color:'var(--libertadores)'}}>↑ {nomeJog(s.entra_id)}</span>
              <span style={{color:'var(--rebaixamento)'}}>↓ {nomeJog(s.sai_id)}</span>
              <button className="btn btn-danger btn-sm" style={{marginLeft:'auto'}} onClick={()=>del(s.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs=[{key:'escalacao',label:`👕 Escalação`},{key:'gols',label:`⚽ Gols (${partida.gols.length})`},{key:'cartoes',label:`🟨 Cartões (${partida.cartoes.length})`},{key:'subs',label:`🔄 Subs (${partida.substituicoes.length})`}];

  return (
    <div className="container" style={{paddingTop:'2rem'}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'1.25rem',marginBottom:'1.5rem',textAlign:'center'}}>
        <div style={{fontSize:'.75rem',color:'var(--text-muted)',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.1em'}}>
          {partida.data.split('-').reverse().join('/')} · {partida.hora} · Rodada {partida.rodada}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'1.5rem'}}>
          <strong style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem'}}>{timeCasa?.nome}</strong>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2.5rem',color:'var(--verde)'}}>{partida.placar_casa} × {partida.placar_visitante}</span>
          <strong style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem'}}>{timeVis?.nome}</strong>
        </div>
        <div style={{fontSize:'.75rem',color:'var(--text-muted)',marginTop:'.3rem'}}>+{partida.acrescimo_primeiro}min / +{partida.acrescimo_segundo}min</div>
      </div>

      {msg&&<div className="alert alert-success">{msg}</div>}
      {error&&<div className="alert alert-error">{error}</div>}

      <div style={{display:'flex',gap:'.25rem',marginBottom:'1.5rem',borderBottom:'1px solid var(--border)',paddingBottom:'.5rem',flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key as typeof tab)}
            style={{padding:'.4rem 1rem',fontFamily:"'Bebas Neue',sans-serif",fontSize:'.95rem',letterSpacing:'.05em',border:'none',borderRadius:6,cursor:'pointer',transition:'all .15s',background:tab===t.key?'var(--verde)':'transparent',color:tab===t.key?'#fff':'var(--text-muted)'}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='escalacao'&&<EscalacaoTab/>}
      {tab==='gols'&&<GolsTab/>}
      {tab==='cartoes'&&<CartoesTab/>}
      {tab==='subs'&&<SubsTab/>}
    </div>
  );
}
