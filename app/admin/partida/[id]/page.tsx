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
      const esc=isCasa?partida.escalacao_casa:partida.escalacao_visitante;
      if(!lista.length) return flash(false,'Nenhum jogador cadastrado para este time.');
      const jaAdicionados=new Set(esc.map(e=>e.jogador_id));
      const disponivel=lista.find(j=>!jaAdicionados.has(j.id));
      if(!disponivel) return flash(false,'Todos os jogadores deste time já foram adicionados.');
      const novo:EscalacaoJogador={
        jogador_id: disponivel.id,
        numero: disponivel.numero ?? 0,
        posicao: disponivel.posicao ?? 'ATA',
        titular: true,
      };
      const u={...partida};
      if(isCasa) u.escalacao_casa=[...u.escalacao_casa,novo];
      else u.escalacao_visitante=[...u.escalacao_visitante,novo];
      save(u as Partida);
    };
    const updJogador=(isCasa:boolean,idx:number,novoJogadorId:string)=>{
      const jog=jogadores.find(j=>j.id===novoJogadorId);
      const u={...partida};
      const esc=isCasa?[...u.escalacao_casa]:[...u.escalacao_visitante];
      esc[idx]={
        ...esc[idx],
        jogador_id: novoJogadorId,
        numero: jog?.numero ?? esc[idx].numero,
        posicao: jog?.posicao ?? esc[idx].posicao,
      };
      if(isCasa) u.escalacao_casa=esc; else u.escalacao_visitante=esc;
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
      const jaAdicionados=new Set(esc.map(e=>e.jogador_id));
      return (
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
            <h3 style={{fontSize:'1.2rem'}}>{time?.nome} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>{isCasa?'(Mandante)':'(Visitante)'}</span></h3>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
              <span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{esc.length}/23</span>
              <button className="btn btn-primary btn-sm" onClick={()=>addJog(isCasa)}>+ Jogador</button>
            </div>
          </div>
          {esc.length===0&&<p style={{color:'var(--text-muted)',fontSize:'.85rem'}}>Nenhum jogador adicionado.</p>}
          {esc.map((e,i)=>{
            const opcoes=lista.filter(j=>j.id===e.jogador_id||!jaAdicionados.has(j.id));
            return (
              <div key={i} style={{display:'flex',gap:'.5rem',marginBottom:'.4rem',background:'var(--surface2)',borderRadius:6,padding:'.5rem'}}>
                <input type="number" min={0} max={99} value={e.numero} onChange={ev=>upd(isCasa,i,'numero',ev.target.value)} style={{width:52,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem',textAlign:'center'}} />
                <select value={e.jogador_id} onChange={ev=>updJogador(isCasa,i,ev.target.value)} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                  {opcoes.map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
                </select>
                <select value={e.posicao} onChange={ev=>upd(isCasa,i,'posicao',ev.target.value)} style={{width:60,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                  {POSICOES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <label style={{display:'flex',alignItems:'center',gap:4,fontSize:'.8rem',color:'var(--text-muted)',cursor:'pointer',whiteSpace:'nowrap'}}>
                  <input type="checkbox" checked={e.titular} onChange={ev=>upd(isCasa,i,'titular',ev.target.checked)} /> Titular
                </label>
                <button className="btn btn-danger btn-sm" onClick={()=>rem(isCasa,i)}>✕</button>
              </div>
            );
          })}
        </div>
      );
    };
    return <div style={{display:'flex',gap:'2rem',flexWrap:'wrap'}}><Block isCasa={true}/><Block isCasa={false}/></div>;
  };

  // ── GOLS ──
  const GolsTab=()=>{
    const [form,setForm]=useState({minuto:'',acrescimo:'0',time_id:partida.time_casa_id,jogador_id:'',assistencia_id:'',tipo:'normal',goleiro_id:'',descricao:''});
    const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(v=>({...v,[k]:e.target.value}));
    
    const isContra = form.tipo === 'contra';
    const timeMarcador = form.time_id;
    const timeAdversario = timeMarcador === partida.time_casa_id ? partida.time_visitante_id : partida.time_casa_id;
    
    // Listas baseadas na escalação da partida
    const escCasa = partida.escalacao_casa;
    const escVis = partida.escalacao_visitante;
    const escMarcadora = timeMarcador === partida.time_casa_id ? escCasa : escVis;
    const escAdversaria = timeMarcador === partida.time_casa_id ? escVis : escCasa;

    // Goleiros adversários automáticos
    const goleirosAdversarios = escAdversaria.filter(e => e.posicao === 'GOL');

    useEffect(() => {
      if (goleirosAdversarios.length > 0 && !form.goleiro_id) {
        setForm(v => ({ ...v, goleiro_id: goleirosAdversarios[0].jogador_id }));
      }
    }, [timeMarcador, goleirosAdversarios.length]);

    const handleTipoChange = (novoTipo: string) => {
      setForm(v => ({ ...v, tipo: novoTipo, jogador_id: '', assistencia_id: '', goleiro_id: '' }));
    };
    const handleTimeMarcadorChange = (novoTime: string) => {
      setForm(v => ({ ...v, time_id: novoTime, jogador_id: '', assistencia_id: '', goleiro_id: '' }));
    };
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
          {isContra && (
            <div style={{padding:'.6rem .9rem',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:6,marginBottom:'1rem',fontSize:'.82rem',color:'#f87171'}}>
              ⚠️ <strong>Gol Contra:</strong> o jogador que marcou contra e o goleiro são ambos do time adversário.
            </div>
          )}
          <div className="grid-3">
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Acréscimo</label><input type="number" min={0} value={form.acrescimo} onChange={f('acrescimo')} /></div>
            <div className="form-group"><label>Tipo</label>
              <select value={form.tipo} onChange={e => handleTipoChange(e.target.value)}>
                {TIPO_GOL.map(t=><option key={t} value={t}>{TIPO_GOL_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Time que marca o gol</label>
              <select value={form.time_id} onChange={e => handleTimeMarcadorChange(e.target.value)}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{isContra ? 'Jogador que marcou contra (adversário) *' : 'Jogador *'}</label>
              <select value={form.jogador_id} onChange={f('jogador_id')}>
                <option value="">Selecione...</option>
                {(isContra ? escAdversaria : escMarcadora).map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
            {!isContra && (
              <div className="form-group"><label>Assistência</label>
                <select value={form.assistencia_id} onChange={f('assistencia_id')}>
                  <option value="">Sem assistência</option>
                  {escMarcadora.filter(e=>e.jogador_id!==form.jogador_id).map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>{isContra ? 'Goleiro do time adversário' : 'Goleiro adversário'}</label>
              <select value={form.goleiro_id} onChange={f('goleiro_id')}>
                <option value="">Selecione...</option>
                {goleirosAdversarios.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
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
              <span>{g.tipo==='contra'?'🔴':'⚽'}</span>
              <div style={{flex:1}}>
                <strong>{nomeJog(g.jogador_id)}</strong>
                {g.tipo==='contra'&&<span style={{fontSize:'.78rem',color:'var(--rebaixamento)',marginLeft:'.4rem'}}>(contra)</span>}
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
    
    const escCasa = partida.escalacao_casa;
    const escVis = partida.escalacao_visitante;
    const escTime = form.time_id === partida.time_casa_id ? escCasa : escVis;

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
          <div className="grid-3">
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Tipo</label>
              <select value={form.tipo} onChange={f('tipo')}>
                <option value="amarelo">Amarelo</option>
                <option value="vermelho">Vermelho</option>
              </select>
            </div>
            <div className="form-group"><label>Time</label>
              <select value={form.time_id} onChange={f('time_id')}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group"><label>Jogador *</label>
              <select value={form.jogador_id} onChange={f('jogador_id')}>
                <option value="">Selecione...</option>
                {escTime.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label>Motivo</label><input value={form.motivo} onChange={f('motivo')} /></div>
          </div>
          <button className="btn btn-primary" onClick={add}>🟨 Adicionar Cartão</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
          {partida.cartoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhum cartão registrado.</p>}
          {partida.cartoes.map(c=>(
            <div key={c.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',borderLeft:`3px solid ${c.tipo==='amarelo'?'#facc15':'#ef4444'}`}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:c.tipo==='amarelo'?'#facc15':'#ef4444',minWidth:40}}>{c.minuto}&apos;</span>
              <span style={{fontSize:'1.2rem'}}>{c.tipo==='amarelo'?'🟨':'🟥'}</span>
              <div style={{flex:1}}>
                <strong>{nomeJog(c.jogador_id)}</strong>
                <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{c.tipo==='amarelo'?'Amarelo':'Vermelho'} · {nomeTime(c.time_id)}{c.motivo?' · '+c.motivo:''}</div>
              </div>
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

    const min = +form.minuto || 0;
    const esc = form.time_id === partida.time_casa_id ? partida.escalacao_casa : partida.escalacao_visitante;
    const subs = partida.substituicoes.filter(s => s.time_id === form.time_id);

    const quemPodeSair = esc.filter(e => {
      const entrou = subs.find(s => s.entra_id === e.jogador_id);
      const saiu = subs.find(s => s.sai_id === e.jogador_id);
      if (saiu && saiu.minuto <= min) return false;
      if (e.titular) return true;
      if (entrou && entrou.minuto <= min) return true;
      return false;
    });

    const quemPodeEntrar = esc.filter(e => {
      if (e.titular) return false;
      const entrou = subs.find(s => s.entra_id === e.jogador_id);
      return !entrou;
    });

    const add=()=>{
      if(!form.minuto||!form.sai_id||!form.entra_id) return flash(false,'Preencha minuto e jogadores.');
      const novo:Substituicao={id:`s${uid()}`,minuto:+form.minuto,time_id:form.time_id,sai_id:form.sai_id,entra_id:form.entra_id};
      save({...partida,substituicoes:[...partida.substituicoes,novo].sort((a,b)=>a.minuto-b.minuto)});
      setForm({minuto:'',time_id:partida.time_casa_id,sai_id:'',entra_id:''});
    };
    const del=(sid:string)=>save({...partida,substituicoes:partida.substituicoes.filter(s=>s.id!==sid)});
    return (
      <div>
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:'var(--amarelo)'}}>+ Registrar Substituição</h3>
          <div className="grid-3">
            <div className="form-group"><label>Minuto *</label><input type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
            <div className="form-group"><label>Time</label>
              <select value={form.time_id} onChange={f('time_id')}>
                <option value={partida.time_casa_id}>{timeCasa?.nome}</option>
                <option value={partida.time_visitante_id}>{timeVis?.nome}</option>
              </select>
            </div>
            <div className="form-group"><label>Sai *</label>
              <select value={form.sai_id} onChange={f('sai_id')}>
                <option value="">Selecione...</option>
                {quemPodeSair.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Entra *</label>
              <select value={form.entra_id} onChange={f('entra_id')}>
                <option value="">Selecione...</option>
                {quemPodeEntrar.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={add}>🔄 Adicionar Substituição</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
          {partida.substituicoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhuma substituição registrada.</p>}
          {partida.substituicoes.map(s=>(
            <div key={s.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',borderLeft:`3px solid var(--text-muted)`}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--text-muted)',minWidth:40}}>{s.minuto}&apos;</span>
              <span style={{fontSize:'1.2rem'}}>🔄</span>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <span style={{color:'#ef4444'}}>▼ {nomeJog(s.sai_id)}</span>
                  <span style={{color:'var(--text-muted)'}}>·</span>
                  <span style={{color:'#22c55e'}}>▲ {nomeJog(s.entra_id)}</span>
                </div>
                <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{nomeTime(s.time_id)}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{paddingTop:'2rem',paddingBottom:'4rem'}}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }
      `}</style>

      <div style={{marginBottom:'2rem'}}>
        <a href="/admin/partidas" style={{color:'var(--verde)',fontSize:'.85rem',textDecoration:'none',display:'flex',alignItems:'center',gap:4,marginBottom:'.5rem'}}>← Voltar para Partidas</a>
        <h1 style={{fontSize:'2rem'}}>{timeCasa?.sigla} <span style={{color:'var(--verde)'}}>{partida.placar_casa} × {partida.placar_visitante}</span> {timeVis?.sigla}</h1>
        <p style={{color:'var(--text-muted)',fontSize:'.9rem'}}>{partida.rodada}ª Rodada · {partida.data.split('-').reverse().join('/')} · {partida.hora}</p>
      </div>

      {msg&&<div className="toast toast-success">{msg}</div>}
      {error&&<div className="toast toast-error">{error}</div>}

      <div style={{display:'flex',gap:'.5rem',marginBottom:'1.5rem',borderBottom:'1px solid var(--border)',paddingBottom:'1rem',overflowX:'auto'}}>
        {[
          {id:'escalacao',label:`📋 Escalação (${partida.escalacao_casa.length + partida.escalacao_visitante.length})`},
          {id:'gols',label:`⚽ Gols (${partida.gols.length})`},
          {id:'cartoes',label:`🟨 Cartões (${partida.cartoes.length})`},
          {id:'subs',label:`🔄 Subs (${partida.substituicoes.length})`}
        ].map(t=>(
          <button key={t.id} className={`btn ${tab===t.id?'btn-primary':'btn-ghost'}`} onClick={()=>setTab(t.id as any)} style={{whiteSpace:'nowrap'}}>{t.label}</button>
        ))}
      </div>

      {tab==='escalacao'&&<EscalacaoTab/>}
      {tab==='gols'&&<GolsTab/>}
      {tab==='cartoes'&&<CartoesTab/>}
      {tab==='subs'&&<SubsTab/>}
    </div>
  );
}
