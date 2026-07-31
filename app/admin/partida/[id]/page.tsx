'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Partida, Time, Jogador, Tecnico, Gol, Cartao, Substituicao, EscalacaoJogador, StatsJogador } from '@/lib/types';
import { clientGetPartida, clientGetTimes, clientGetJogadores, clientUpsertPartida, clientGetTecnicos, uid } from '@/lib/client';

const POSICOES = ['GOL','ZAG','LAT','VOL','MEI','ATA'];
const TIPO_GOL = ['normal','penalti','falta','contra','penalti_perdido','penalti_defendido'];
const TIPO_GOL_LABEL:Record<string,string>={normal:'Gol',penalti:'Pênalti',falta:'Falta',contra:'Contra',penalti_perdido:'Pênalti Perdido',penalti_defendido:'Pênalti Defendido'};

const DESCRICOES_GOL: Record<string, string[]> = {
  normal: ['Chute com o pé esquerdo','Chute com o pé direito','Cabeceio após cruzamento','Cabeceio em escanteio','Chute de primeira','Chute de fora da área','Finalização em velocidade','Toque na saída do goleiro','Rebote após defesa','Contra-ataque rápido'],
  penalti: ['Convertido — canto esquerdo','Convertido — canto direito','Convertido — centro','Convertido — colocado','Pênalti cavado'],
  falta: ['Falta cobrada diretamente','Falta cobrada sobre a barreira','Falta cobrada no canto esquerdo','Falta cobrada no canto direito','Cobrança de falta em curva'],
  contra: ['Gol contra ao tentar cortar cruzamento','Gol contra ao tentar bloquear chute','Desvio infeliz na própria meta','Gol contra ao tentar afastar escanteio'],
  penalti_perdido: ['Pênalti na trave','Pênalti para fora'],
  penalti_defendido: ['Defesa no canto direito','Defesa no canto esquerdo','Defesa no centro','Dois toques na cobrança — invalidado'],
};

const MOTIVOS_CARTAO: Record<string, string[]> = {
  amarelo: ['Falta tática','Reclamação com o árbitro','Retardar o jogo','Falta violenta','Simulação','Comemoração excessiva','Atitude antidesportiva','Desrespeito ao jogo','Agressão física','Agressão verbal','Mão na bola'],
  vermelho: ['Segundo cartão amarelo','Falta violenta grave','Agressão física','Cuspida','Linguagem ofensiva ou abusiva','Negação de gol com falta (DOGSO)','Negação de gol com mão','Conduta violenta'],
  amarelo_tecnico: ['Reclamação excessiva','Conduta antidesportiva','Entrada na área técnica indevida','Protesto veemente','Desrespeito ao árbitro'],
  vermelho_tecnico: ['Expulsão por reclamação reiterada','Conduta violenta','Insulto ao árbitro','Segunda advertência (técnico)','Agressão a membro da comissão'],
};

function ordenarPorMinuto<T extends { minuto: number; acrescimo?: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const ma = a.minuto + (a.acrescimo ?? 0) * 0.01;
    const mb = b.minuto + (b.acrescimo ?? 0) * 0.01;
    return ma - mb;
  });
}

type CartaoEx = Cartao & { acrescimo?: number; tecnico_id?: string };

// Estilo base dos campos de Gols/Cartões/Subs. O foco visual (borda + halo verde)
// vem da classe "evt-field" definida no <style> do componente principal — assim
// funciona tanto para clique quanto para navegação via Tab.
const selectSt: React.CSSProperties = {background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.35rem .5rem',fontSize:'.88rem',width:'100%'};
const inputSt: React.CSSProperties = {...selectSt};

// Componente de chips de sugestão
function Chips({opcoes, valor, onSelect, corAtivo='var(--verde)', bgAtivo='rgba(0,168,79,.15)', borderAtivo='var(--verde)'}:{
  opcoes:string[]; valor:string; onSelect:(v:string)=>void;
  corAtivo?:string; bgAtivo?:string; borderAtivo?:string;
}) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem',marginBottom:'.45rem'}}>
      {opcoes.map(s=>(
        <button key={s} type="button" onClick={()=>onSelect(s)} style={{
          fontSize:'.72rem', padding:'.2rem .55rem', borderRadius:20,
          border:`1px solid ${valor===s?borderAtivo:'var(--border)'}`,
          background:valor===s?bgAtivo:'var(--surface2)',
          color:valor===s?corAtivo:'var(--text-muted)',
          cursor:'pointer', transition:'all .12s', whiteSpace:'nowrap',
        }}>{s}</button>
      ))}
    </div>
  );
}

// Componente de seleção de time — dois botões lado a lado
// `compact` reduz o tamanho dos botões e faz a largura se ajustar ao conteúdo
// (usado quando o TimePicker precisa ficar ao lado de outros campos, na mesma linha)
function TimePicker({
  value, onChange, timeCasaId, timeVisId, timeCasaNome, timeVisNome, compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  timeCasaId: string;
  timeVisId: string;
  timeCasaNome: string;
  timeVisNome: string;
  compact?: boolean;
}) {
  const btnBase: React.CSSProperties = compact
    ? {
        padding: '.32rem .6rem', borderRadius: 6, border: '1px solid var(--border)',
        fontFamily: "'Bebas Neue', sans-serif", fontSize: '.82rem', letterSpacing: '.04em',
        cursor: 'pointer', transition: 'all .15s', textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
      }
    : {
        flex: 1, padding: '.45rem .75rem', borderRadius: 6, border: '1px solid var(--border)',
        fontFamily: "'Bebas Neue', sans-serif", fontSize: '.95rem', letterSpacing: '.05em',
        cursor: 'pointer', transition: 'all .15s', textAlign: 'center' as const,
      };
  const btnAtivo: React.CSSProperties = {
    ...btnBase,
    background: 'var(--verde)', borderColor: 'var(--verde)', color: '#fff',
  };
  const btnInativo: React.CSSProperties = {
    ...btnBase,
    background: 'var(--surface2)', color: 'var(--text-muted)',
  };
  return (
    <div style={{ display: 'flex', gap: compact ? '.35rem' : '.5rem' }}>
      <button type="button" style={value === timeCasaId ? btnAtivo : btnInativo} onClick={() => onChange(timeCasaId)}>
        {timeCasaNome}
      </button>
      <button type="button" style={value === timeVisId ? btnAtivo : btnInativo} onClick={() => onChange(timeVisId)}>
        {timeVisNome}
      </button>
    </div>
  );
}

// ── GOLS ────────────────────────────────────────────────────────────────────
// Componente hoisted (fora do componente pai) para não ser recriado a cada
// re-render — isso evita que o React desmonte/remonte o formulário inteiro
// toda vez que a partida é recarregada após salvar, o que fazia o campo
// perder o foco e o formulário "reiniciar" visualmente.
function GolsTab({
  partida, timeCasa, timeVis, timeCasaNome, timeVisNome, nomeJog, save, flash,
}: {
  partida: Partida;
  timeCasa: Time | undefined;
  timeVis: Time | undefined;
  timeCasaNome: string;
  timeVisNome: string;
  nomeJog: (jid: string) => string;
  save: (updated: Partida) => Promise<void> | void;
  flash: (ok: boolean, t: string) => void;
}) {
  const emptyGol = () => ({minuto:'',acrescimo:'0',time_id:partida.time_casa_id,jogador_id:'',assistencia_id:'',tipo:'normal',goleiro_id:'',descricao:''});
  const [form, setForm] = useState(emptyGol());
  const [editId, setEditId] = useState<string|null>(null);
  const minutoRef = useRef<HTMLInputElement>(null);
  const f = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(v=>({...v,[k]:e.target.value}));

  const isContra = form.tipo === 'contra';
  const escCasa = partida.escalacao_casa;
  const escVis  = partida.escalacao_visitante;
  const escMarcadora  = form.time_id===partida.time_casa_id ? escCasa : escVis;
  const escAdversaria = form.time_id===partida.time_casa_id ? escVis  : escCasa;
  const goleirosAdv = escAdversaria.filter(e=>e.posicao==='GOL');
  const primeiroGoleiroAdv = goleirosAdv[0]?.jogador_id ?? '';

  useEffect(()=>{
    if(primeiroGoleiroAdv) setForm(v=>({...v, goleiro_id:primeiroGoleiroAdv}));
  }, [form.time_id, form.tipo, primeiroGoleiroAdv]);

  const handleTipoChange=(novoTipo:string)=>{setForm(v=>({...v,tipo:novoTipo,jogador_id:'',assistencia_id:'',goleiro_id:'',descricao:''}));};
  const handleTimeChange=(novoTime:string)=>{setForm(v=>({...v,time_id:novoTime,jogador_id:'',assistencia_id:'',goleiro_id:''}));};

  const iniciarEdicao=(g:Gol)=>{
    setForm({
      minuto:g.minuto.toString(), acrescimo:(g.acrescimo??0).toString(),
      time_id:g.time_id, jogador_id:g.jogador_id,
      assistencia_id:g.assistencia_id??'', tipo:g.tipo,
      goleiro_id:g.goleiro_id??'', descricao:g.descricao??'',
    });
    setEditId(g.id);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const cancelarEdicao=()=>{setForm(emptyGol());setEditId(null);};

  const salvar=()=>{
    if(!form.minuto||!form.jogador_id) return flash(false,'Preencha o minuto e o jogador.');
    const novoGol:Gol={
      id:editId??`g${uid()}`, minuto:+form.minuto, acrescimo:+form.acrescimo,
      time_id:form.time_id, jogador_id:form.jogador_id,
      assistencia_id:form.assistencia_id||null, tipo:form.tipo as Gol['tipo'],
      goleiro_id:form.goleiro_id, descricao:form.descricao,
    };
    const listaAtualizada = editId
      ? partida.gols.map(g=>g.id===editId?novoGol:g)
      : [...partida.gols, novoGol];
    save({...partida, gols:ordenarPorMinuto(listaAtualizada)});
    cancelarEdicao();
    // Volta o foco para o Minuto, já que é sempre o primeiro campo a preencher
    minutoRef.current?.focus();
  };
  const del=(gid:string)=>save({...partida, gols:partida.gols.filter(g=>g.id!==gid)});

  const sugestoes = DESCRICOES_GOL[form.tipo] ?? DESCRICOES_GOL['normal'];
  const isEditing = editId !== null;

  return (
    <div>
      <div className="card" style={{marginBottom:'1.5rem',borderLeft:isEditing?'4px solid var(--amarelo)':'4px solid var(--verde)'}}>
        <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:isEditing?'var(--amarelo)':'var(--verde)'}}>
          {isEditing?'✏️ Editando Gol':'+ Registrar Evento de Gol/Pênalti'}
        </h3>

        {/* Minuto, Acréscimo, Tipo, seletor de time e demais campos na mesma linha (igual ao padrão de Subs) */}
        <div style={{display:'flex',gap:'.6rem',alignItems:'flex-end',flexWrap:'wrap',marginBottom:'1rem'}}>
          <div className="form-group" style={{width:70,margin:0}}><label>Minuto *</label><input ref={minutoRef} className="evt-field" style={inputSt} type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
          <div className="form-group" style={{width:70,margin:0}}><label>Acréscimo</label><input className="evt-field" style={inputSt} type="number" min={0} value={form.acrescimo} onChange={f('acrescimo')} /></div>
          <div className="form-group" style={{width:150,margin:0}}><label>Tipo</label>
            <select className="evt-field" style={selectSt} value={form.tipo} onChange={e=>handleTipoChange(e.target.value)}>
              {TIPO_GOL.map(t=><option key={t} value={t}>{TIPO_GOL_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Time que ataca</label>
            <TimePicker
              compact
              value={form.time_id}
              onChange={handleTimeChange}
              timeCasaId={partida.time_casa_id}
              timeVisId={partida.time_visitante_id}
              timeCasaNome={timeCasaNome}
              timeVisNome={timeVisNome}
            />
          </div>
          <div className="form-group" style={{width:190,margin:0}}>
            <label>{isContra?'Jogador que marcou contra *':'Jogador *'}</label>
            <select className="evt-field" style={selectSt} value={form.jogador_id} onChange={f('jogador_id')}>
              <option value="">Selecione...</option>
              {(isContra?escAdversaria:escMarcadora).map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
            </select>
          </div>
          {!isContra&&!form.tipo.includes('perdido')&&!form.tipo.includes('defendido')&&(
            <div className="form-group" style={{width:190,margin:0}}><label>Assistência</label>
              <select className="evt-field" style={selectSt} value={form.assistencia_id} onChange={f('assistencia_id')}>
                <option value="">Sem assistência</option>
                {escMarcadora.filter(e=>e.jogador_id!==form.jogador_id).map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{width:190,margin:0}}>
            <label>Goleiro adversário</label>
            <select className="evt-field" style={selectSt} value={form.goleiro_id} onChange={f('goleiro_id')}>
              <option value="">Selecione...</option>
              {goleirosAdv.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Descrição</label>
          <Chips opcoes={sugestoes} valor={form.descricao} onSelect={s=>setForm(v=>({...v,descricao:s}))} />
          <input className="evt-field" style={inputSt} value={form.descricao} onChange={f('descricao')} placeholder="Ou digite uma descrição personalizada..." />
        </div>
        <div style={{display:'flex',gap:'.6rem'}}>
          <button className="btn btn-primary" onClick={salvar}>{isEditing?'💾 Salvar alterações':'Registrar Evento'}</button>
          {isEditing&&<button className="btn btn-ghost" onClick={cancelarEdicao}>Cancelar</button>}
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
        {partida.gols.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhum evento registrado.</p>}
        {partida.gols.map(g=>(
          <div key={g.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'flex-start',gap:'1rem',borderLeft:`3px solid ${g.time_id===partida.time_casa_id?'var(--verde)':'var(--amarelo)'}`, opacity: editId===g.id?.toString()?0.5:1}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--verde)',minWidth:52,flexShrink:0}}>
              {g.minuto}{(g.acrescimo??0)>0?`+${g.acrescimo}`:''}&apos;
            </span>
            <span style={{fontSize:'1.1rem',flexShrink:0}}>{g.tipo==='contra'?'🔴':g.tipo.includes('perdido')||g.tipo.includes('defendido')?'❌':'⚽'}</span>
            <div style={{flex:1,minWidth:0}}>
              <div>
                <strong>{nomeJog(g.jogador_id)}</strong>
                <span style={{fontSize:'.78rem',color:'var(--text-muted)',marginLeft:'.4rem'}}>({TIPO_GOL_LABEL[g.tipo]})</span>
                {g.assistencia_id&&<span style={{color:'var(--text-muted)',fontSize:'.85rem'}}> · assist. {nomeJog(g.assistencia_id)}</span>}
              </div>
              <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{g.time_id===partida.time_casa_id?timeCasaNome:timeVisNome} · Goleiro: {nomeJog(g.goleiro_id)}</div>
              {g.descricao&&<div style={{fontSize:'.75rem',color:'var(--text-muted)',fontStyle:'italic',marginTop:'.2rem',background:'var(--surface2)',borderRadius:4,padding:'.15rem .4rem',display:'inline-block'}}>{g.descricao}</div>}
            </div>
            <div style={{display:'flex',gap:'.4rem',flexShrink:0}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>iniciarEdicao(g)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={()=>del(g.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CARTÕES ─────────────────────────────────────────────────────────────────
function CartoesTab({
  partida, timeCasa, timeVis, timeCasaNome, timeVisNome, tecnicosDaPartida, nomeJog, nomeTec, save, flash,
}: {
  partida: Partida;
  timeCasa: Time | undefined;
  timeVis: Time | undefined;
  timeCasaNome: string;
  timeVisNome: string;
  tecnicosDaPartida: Tecnico[];
  nomeJog: (jid: string) => string;
  nomeTec: (tid: string | undefined) => string;
  save: (updated: Partida) => Promise<void> | void;
  flash: (ok: boolean, t: string) => void;
}) {
  const emptyCartao = () => ({minuto:'',acrescimo:'0',tipo:'amarelo',jogador_id:'',tecnico_id:'',time_id:partida.time_casa_id,motivo:''});
  const [form, setForm] = useState(emptyCartao());
  const [editId, setEditId] = useState<string|null>(null);
  const minutoRef = useRef<HTMLInputElement>(null);
  const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(v=>({...v,[k]:e.target.value}));

  const escCasa=partida.escalacao_casa;
  const escVis=partida.escalacao_visitante;

  const isTecnico = form.tipo==='amarelo_tecnico'||form.tipo==='vermelho_tecnico';
  const sugestoes = MOTIVOS_CARTAO[form.tipo] ?? MOTIVOS_CARTAO['amarelo'];

  const handleTipoCartaoChange=(novoTipo:string)=>{setForm(v=>({...v,tipo:novoTipo,motivo:'',jogador_id:'',tecnico_id:''}));};
  const handleTimeChange=(novoTime:string)=>{setForm(v=>({...v,time_id:novoTime,jogador_id:'',tecnico_id:''}));};

  const iniciarEdicao=(c:CartaoEx)=>{
    setForm({
      minuto:c.minuto.toString(), acrescimo:(c.acrescimo??0).toString(),
      tipo:c.tipo, jogador_id:c.tecnico_id?'':(c.jogador_id??''),
      tecnico_id:c.tecnico_id??'', time_id:c.time_id, motivo:c.motivo??'',
    });
    setEditId(c.id);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const cancelarEdicao=()=>{setForm(emptyCartao());setEditId(null);};

  const salvar=()=>{
    if(!form.minuto) return flash(false,'Preencha o minuto.');
    if(isTecnico&&!form.tecnico_id) return flash(false,'Selecione o técnico.');
    if(!isTecnico&&!form.jogador_id) return flash(false,'Selecione o jogador.');
    const novoCartao:CartaoEx={
      id:editId??`c${uid()}`, minuto:+form.minuto, acrescimo:+form.acrescimo,
      tipo:form.tipo as Cartao['tipo'], time_id:form.time_id,
      jogador_id:isTecnico?'__tecnico__':form.jogador_id,
      tecnico_id:isTecnico?form.tecnico_id:undefined,
      motivo:form.motivo,
    };
    const lista = editId
      ? (partida.cartoes as CartaoEx[]).map(c=>c.id===editId?novoCartao:c)
      : [...(partida.cartoes as CartaoEx[]), novoCartao];
    save({...partida, cartoes:ordenarPorMinuto(lista) as unknown as Cartao[]});
    cancelarEdicao();
    minutoRef.current?.focus();
  };
  const del=(cid:string)=>save({...partida, cartoes:partida.cartoes.filter(c=>c.id!==cid)});

  const corChip  = form.tipo.includes('vermelho') ? 'var(--rebaixamento)' : 'var(--amarelo-card)';
  const bgChip   = form.tipo.includes('vermelho') ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.15)';
  const bordChip = form.tipo.includes('vermelho') ? 'var(--rebaixamento)' : 'var(--amarelo-card)';
  const isEditing = editId !== null;

  const tipoIcone=(tipo:string)=>{
    if(tipo==='amarelo'||tipo==='amarelo_tecnico') return '🟨';
    if(tipo==='vermelho'||tipo==='vermelho_tecnico') return '🟥';
    return '🟨';
  };
  const tipoLabel=(tipo:string)=>{
    const map:Record<string,string>={amarelo:'Amarelo',vermelho:'Vermelho',amarelo_tecnico:'Amarelo (Técnico)',vermelho_tecnico:'Vermelho (Técnico)'};
    return map[tipo]??tipo;
  };

  return (
    <div>
      <div className="card" style={{marginBottom:'1.5rem',borderLeft:isEditing?'4px solid var(--amarelo)':'4px solid var(--verde)'}}>
        <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:isEditing?'var(--amarelo)':'var(--verde)'}}>
          {isEditing?'✏️ Editando Cartão':'+ Registrar Cartão'}
        </h3>

        {/* Minuto, Acréscimo, Tipo, seletor de time e demais campos na mesma linha (igual ao padrão de Subs) */}
        <div style={{display:'flex',gap:'.6rem',alignItems:'flex-end',flexWrap:'wrap',marginBottom:'1rem'}}>
          <div className="form-group" style={{width:70,margin:0}}><label>Minuto *</label><input ref={minutoRef} className="evt-field" style={inputSt} type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
          <div className="form-group" style={{width:70,margin:0}}><label>Acréscimo</label><input className="evt-field" style={inputSt} type="number" min={0} value={form.acrescimo} onChange={f('acrescimo')} /></div>
          <div className="form-group" style={{width:170,margin:0}}><label>Tipo</label>
            <select className="evt-field" style={selectSt} value={form.tipo} onChange={e=>handleTipoCartaoChange(e.target.value)}>
              <option value="amarelo">🟨 Amarelo</option>
              <option value="vermelho">🟥 Vermelho</option>
              <option value="amarelo_tecnico">🟨 Amarelo — Técnico</option>
              <option value="vermelho_tecnico">🟥 Vermelho — Técnico</option>
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Time</label>
            <TimePicker
              compact
              value={form.time_id}
              onChange={handleTimeChange}
              timeCasaId={partida.time_casa_id}
              timeVisId={partida.time_visitante_id}
              timeCasaNome={timeCasaNome}
              timeVisNome={timeVisNome}
            />
          </div>
          {isTecnico ? (
            <div className="form-group" style={{width:220,margin:0}}><label>Técnico *</label>
              <select className="evt-field" style={selectSt} value={form.tecnico_id} onChange={f('tecnico_id')}>
                <option value="">Selecione...</option>
                {tecnicosDaPartida.map(t=><option key={t.id} value={t.id}>{t.nome} ({t.id===partida.tecnico_casa_id?timeCasa?.sigla:timeVis?.sigla})</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group" style={{width:220,margin:0}}><label>Jogador *</label>
              <select className="evt-field" style={selectSt} value={form.jogador_id} onChange={f('jogador_id')}>
                <option value="">Selecione...</option>
                {(form.time_id===partida.time_casa_id?escCasa:escVis).map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Motivo</label>
          <Chips opcoes={sugestoes} valor={form.motivo} onSelect={s=>setForm(v=>({...v,motivo:s}))} corAtivo={corChip} bgAtivo={bgChip} borderAtivo={bordChip} />
          <input className="evt-field" style={inputSt} value={form.motivo} onChange={f('motivo')} placeholder="Ou descreva o motivo..." />
        </div>
        <div style={{display:'flex',gap:'.6rem'}}>
          <button className="btn btn-primary" onClick={salvar}>{isEditing?'💾 Salvar alterações':'Adicionar Cartão'}</button>
          {isEditing&&<button className="btn btn-ghost" onClick={cancelarEdicao}>Cancelar</button>}
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
        {partida.cartoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhum cartão registrado.</p>}
        {(partida.cartoes as CartaoEx[]).map(c=>(
          <div key={c.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',borderLeft:`3px solid ${c.tipo.includes('vermelho')?'var(--rebaixamento)':'var(--amarelo)'}`,opacity:editId===c.id?0.5:1}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--verde)',minWidth:52,flexShrink:0}}>
              {c.minuto}{(c.acrescimo??0)>0?`+${c.acrescimo}`:''}&apos;
            </span>
            <span style={{fontSize:'1.2rem',flexShrink:0}}>{tipoIcone(c.tipo)}</span>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                <strong>{c.tecnico_id ? `${nomeTec(c.tecnico_id)}` : nomeJog(c.jogador_id)}</strong>
                <span style={{fontSize:'.7rem',background:'var(--surface2)',borderRadius:4,padding:'.1rem .35rem',color:'var(--text-muted)'}}>{tipoLabel(c.tipo)}</span>
              </div>
              <div style={{fontSize:'.75rem',color:'var(--text-muted)',marginTop:'.1rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
                <span>{c.time_id===partida.time_casa_id?timeCasaNome:timeVisNome}</span>
                {c.motivo&&<span style={{background:'var(--surface2)',borderRadius:4,padding:'.1rem .35rem',fontStyle:'italic'}}>{c.motivo}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:'.4rem',flexShrink:0}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>iniciarEdicao(c)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUBSTITUIÇÕES ────────────────────────────────────────────────────────────
function SubsTab({
  partida, timeCasaNome, timeVisNome, nomeJog, save, flash,
}: {
  partida: Partida;
  timeCasaNome: string;
  timeVisNome: string;
  nomeJog: (jid: string) => string;
  save: (updated: Partida) => Promise<void> | void;
  flash: (ok: boolean, t: string) => void;
}) {
  const emptySub = () => ({minuto:'',time_id:partida.time_casa_id,sai_id:'',entra_id:''});
  const [form, setForm] = useState(emptySub());
  const [editId, setEditId] = useState<string|null>(null);
  const minutoRef = useRef<HTMLInputElement>(null);
  const f=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(v=>({...v,[k]:e.target.value}));

  const escCasa=partida.escalacao_casa;
  const escVis=partida.escalacao_visitante;
  const escAtual=form.time_id===partida.time_casa_id?escCasa:escVis;

  const subsOutras = editId
    ? partida.substituicoes.filter(s=>s.time_id===form.time_id&&s.id!==editId)
    : partida.substituicoes.filter(s=>s.time_id===form.time_id);

  const jaSairam   = new Set(subsOutras.map(s=>s.sai_id));
  const jaEntraram = new Set(subsOutras.map(s=>s.entra_id));
  const quemPodeSair   = escAtual.filter(e=>e.titular||jaEntraram.has(e.jogador_id)).filter(e=>!jaSairam.has(e.jogador_id));
  const quemPodeEntrar = escAtual.filter(e=>!e.titular&&!jaEntraram.has(e.jogador_id));

  const handleTimeChange=(novoTime:string)=>{setForm(v=>({...v,time_id:novoTime,sai_id:'',entra_id:''}));};

  const iniciarEdicao=(s:Substituicao)=>{
    setForm({minuto:s.minuto.toString(),time_id:s.time_id,sai_id:s.sai_id,entra_id:s.entra_id});
    setEditId(s.id);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const cancelarEdicao=()=>{setForm(emptySub());setEditId(null);};

  const salvar=()=>{
    if(!form.minuto||!form.sai_id||!form.entra_id) return flash(false,'Preencha minuto e jogadores.');
    const novaSub:Substituicao={id:editId??`s${uid()}`,minuto:+form.minuto,time_id:form.time_id,sai_id:form.sai_id,entra_id:form.entra_id};
    const lista = editId
      ? partida.substituicoes.map(s=>s.id===editId?novaSub:s)
      : [...partida.substituicoes, novaSub];
    save({...partida, substituicoes:lista.sort((a,b)=>a.minuto-b.minuto)});
    cancelarEdicao();
    minutoRef.current?.focus();
  };
  const del=(sid:string)=>save({...partida, substituicoes:partida.substituicoes.filter(s=>s.id!==sid)});

  const isEditing = editId !== null;

  return (
    <div>
      <div className="card" style={{marginBottom:'1.5rem',borderLeft:isEditing?'4px solid var(--amarelo)':'4px solid var(--verde)'}}>
        <h3 style={{fontSize:'1.1rem',marginBottom:'1rem',color:isEditing?'var(--amarelo)':'var(--verde)'}}>
          {isEditing?'✏️ Editando Substituição':'+ Registrar Substituição'}
        </h3>

        {/* Minuto, seletor de time, Entra e Sai — tudo na mesma linha */}
        <div style={{display:'flex',gap:'.6rem',alignItems:'flex-end',flexWrap:'wrap',marginBottom:'1rem'}}>
          <div className="form-group" style={{width:70,margin:0}}><label>Minuto *</label><input ref={minutoRef} className="evt-field" style={inputSt} type="number" min={1} max={120} value={form.minuto} onChange={f('minuto')} /></div>
          <div className="form-group" style={{margin:0}}>
            <label>Time</label>
            <TimePicker
              compact
              value={form.time_id}
              onChange={handleTimeChange}
              timeCasaId={partida.time_casa_id}
              timeVisId={partida.time_visitante_id}
              timeCasaNome={timeCasaNome}
              timeVisNome={timeVisNome}
            />
          </div>
          <div className="form-group" style={{width:190,margin:0}}><label>↑ Entra *</label>
            <select className="evt-field" style={selectSt} value={form.entra_id} onChange={f('entra_id')}>
              <option value="">Selecione...</option>
              {quemPodeEntrar.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{width:190,margin:0}}><label>↓ Sai *</label>
            <select className="evt-field" style={selectSt} value={form.sai_id} onChange={f('sai_id')}>
              <option value="">Selecione...</option>
              {quemPodeSair.map(e=><option key={e.jogador_id} value={e.jogador_id}>{nomeJog(e.jogador_id)}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:'flex',gap:'.6rem'}}>
          <button className="btn btn-primary" onClick={salvar}>{isEditing?'💾 Salvar alterações':'🔄 Adicionar Substituição'}</button>
          {isEditing&&<button className="btn btn-ghost" onClick={cancelarEdicao}>Cancelar</button>}
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
        {partida.substituicoes.length===0&&<p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Nenhuma substituição registrada.</p>}
        {partida.substituicoes.map(s=>(
          <div key={s.id} className="card" style={{padding:'.75rem 1rem',display:'flex',alignItems:'center',gap:'1rem',borderLeft:'3px solid var(--border)',opacity:editId===s.id?0.5:1}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--verde)',minWidth:40,flexShrink:0}}>{s.minuto}&apos;</span>
            <span style={{fontSize:'1.2rem',flexShrink:0}}>🔄</span>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
              <span style={{display:'flex',alignItems:'center',gap:'.3rem',color:'#22c55e',fontWeight:600}}>
                <span style={{fontSize:'1rem'}}>↑</span>{nomeJog(s.entra_id)}
              </span>
              <span style={{color:'var(--border)',fontWeight:300}}>/</span>
              <span style={{display:'flex',alignItems:'center',gap:'.3rem',color:'#ef4444',fontWeight:600}}>
                <span style={{fontSize:'1rem'}}>↓</span>{nomeJog(s.sai_id)}
              </span>
              <span style={{fontSize:'.72rem',color:'var(--text-muted)',marginLeft:'auto'}}>{s.time_id===partida.time_casa_id?timeCasaNome:timeVisNome}</span>
            </div>
            <div style={{display:'flex',gap:'.4rem',flexShrink:0}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>iniciarEdicao(s)}>✏️</button>
              <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STATS (Opta) ─────────────────────────────────────────────────────────────
// Aba somente-leitura para escalação e alias, com campos numéricos (0-30)
// editáveis para cada estatística individual do jogador na partida.
const STAT_COLS: { key: keyof Omit<StatsJogador, 'jogador_id' | 'validado'>; label: string; title: string; max: number }[] = [
  { key: 'S',   label: 'S',   title: 'Finalizações',              max: 20 },
  { key: 'SoT', label: 'SoT', title: 'Finalizações no Alvo',       max: 20 },
  { key: 'SB',  label: 'SB',  title: 'Finalizações Bloqueadas',    max: 20 },
  { key: 'P',   label: 'P',   title: 'Passes',                     max: 100 },
  { key: 'C',   label: 'C',   title: 'Cruzamentos',                max: 20 },
  { key: 'Crn', label: 'Crn', title: 'Escanteios a favor',         max: 20 },
  { key: 'Tk',  label: 'Tk',  title: 'Desarmes',                   max: 20 },
  { key: 'Off', label: 'Off', title: 'Impedimentos',               max: 20 },
  { key: 'FC',  label: 'FC',  title: 'Faltas Cometidas',           max: 20 },
  { key: 'FS',  label: 'FS',  title: 'Faltas Sofridas',            max: 20 },
  { key: 'Sav', label: 'Sav', title: 'Defesas',                    max: 20 },
];

const opcoesAte = (max: number) => Array.from({ length: max + 1 }, (_, i) => i);

const statsVazio = (jogador_id: string): StatsJogador => ({
  jogador_id, validado: false, S: 0, SoT: 0, SB: 0, P: 0, C: 0, Crn: 0, Tk: 0, Off: 0, FC: 0, FS: 0, Sav: 0,
});

function StatsTab({
  partida, timeCasa, timeVis, timeCasaNome, timeVisNome, jogadores, save,
}: {
  partida: Partida;
  timeCasa: Time | undefined;
  timeVis: Time | undefined;
  timeCasaNome: string;
  timeVisNome: string;
  jogadores: Jogador[];
  save: (updated: Partida) => Promise<void> | void;
}) {
  const statsAtuais = partida.stats_jogadores ?? [];

  const getStats = (jogador_id: string): StatsJogador =>
    statsAtuais.find(s => s.jogador_id === jogador_id) ?? statsVazio(jogador_id);

  const updStat = (jogador_id: string, campo: keyof Omit<StatsJogador, 'jogador_id' | 'validado'>, valor: number) => {
    const existente = getStats(jogador_id);
    if (existente.validado) return; // trava: jogador validado não pode ter os números editados
    const atualizado: StatsJogador = { ...existente, [campo]: valor };
    const semEste = statsAtuais.filter(s => s.jogador_id !== jogador_id);
    save({ ...partida, stats_jogadores: [...semEste, atualizado] });
  };

  const updValidado = (jogador_id: string, valor: boolean) => {
    const existente = getStats(jogador_id);
    const atualizado: StatsJogador = { ...existente, validado: valor };
    const semEste = statsAtuais.filter(s => s.jogador_id !== jogador_id);
    save({ ...partida, stats_jogadores: [...semEste, atualizado] });
  };

  const nomeJog = (jid: string) => jogadores.find(j => j.id === jid)?.nome ?? jid;
  const aliasOpta = (jid: string) => jogadores.find(j => j.id === jid)?.alias_opta ?? '';

  if (partida.escalacao_casa.length === 0 && partida.escalacao_visitante.length === 0) {
    return <p style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>Cadastre a escalação primeiro na aba Escalação.</p>;
  }

  // Larguras fixas das colunas iniciais — necessárias para calcular o
  // deslocamento (left) de cada coluna fixa e para as células não
  // encolherem/esticarem conforme o conteúdo durante o scroll.
  const COL1_WIDTH = 110; // Jogador
  const COL2_WIDTH = 84;  // Alias Opta
  const COL3_WIDTH = 72;  // Validado

  const stickyCol1: React.CSSProperties = {
    position: 'sticky', left: 0, zIndex: 2,
    width: COL1_WIDTH, minWidth: COL1_WIDTH, maxWidth: COL1_WIDTH,
  };
  const stickyCol2: React.CSSProperties = {
    position: 'sticky', left: COL1_WIDTH, zIndex: 2,
    width: COL2_WIDTH, minWidth: COL2_WIDTH, maxWidth: COL2_WIDTH,
  };
  const stickyCol3: React.CSSProperties = {
    position: 'sticky', left: COL1_WIDTH + COL2_WIDTH, zIndex: 2,
    width: COL3_WIDTH, minWidth: COL3_WIDTH, maxWidth: COL3_WIDTH,
    boxShadow: '2px 0 4px rgba(0,0,0,.35)',
  };

  const TabelaTime = ({ esc, cor }: { esc: EscalacaoJogador[]; cor: string }) => {
    if (esc.length === 0) {
      return <p style={{color:'var(--text-muted)',fontSize:'.85rem',padding:'.5rem 0'}}>Nenhum jogador escalado.</p>;
    }
    return (
      <div style={{overflowX:'auto',borderRadius:10,border:'1px solid var(--border)'}}>
        <table style={{borderCollapse:'collapse',fontSize:'.85rem',width:'100%'}}>
          <thead style={{background:'var(--surface2)',borderBottom:`2px solid ${cor}`}}>
            <tr>
              <th style={{...stickyCol1,zIndex:3,background:'var(--surface2)',padding:'.6rem .4rem',textAlign:'left',fontFamily:"'Bebas Neue',sans-serif",fontSize:'.85rem'}}>Jogador</th>
              <th style={{...stickyCol2,zIndex:3,background:'var(--surface2)',padding:'.6rem .4rem',textAlign:'left',fontFamily:"'Bebas Neue',sans-serif",fontSize:'.85rem'}}>Alias</th>
              <th style={{...stickyCol3,zIndex:3,background:'var(--surface2)',padding:'.6rem .3rem',textAlign:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:'.78rem'}}>Validado</th>
              {STAT_COLS.map(col=>(
                <th key={col.key} title={col.title} style={{padding:'.6rem .3rem',textAlign:'center',fontFamily:"'Bebas Neue',sans-serif",cursor:'help'}}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {esc.map((e,i)=>{
              const s = getStats(e.jogador_id);
              const rowBg = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';
              const travado = s.validado;
              return (
                <tr key={e.jogador_id} style={{borderBottom:'1px solid #1a1a1a'}}>
                  <td style={{...stickyCol1,background:rowBg,padding:'.5rem .4rem',borderLeft:`3px solid ${cor}`}}>
                    <div style={{fontWeight:600,fontSize:'.78rem',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis'}} title={nomeJog(e.jogador_id)}>
                      {nomeJog(e.jogador_id)}
                    </div>
                    <div style={{fontSize:'.62rem',color:'var(--text-muted)',lineHeight:1.2}}>
                      #{e.numero} · {e.posicao}
                    </div>
                  </td>
                  <td style={{...stickyCol2,background:rowBg,padding:'.5rem .4rem',fontSize:'.72rem',color:aliasOpta(e.jogador_id)?'var(--text)':'#555',overflow:'hidden',textOverflow:'ellipsis'}} title={aliasOpta(e.jogador_id)||undefined}>
                    {aliasOpta(e.jogador_id) || '—'}
                  </td>
                  <td style={{...stickyCol3,background:rowBg,padding:'.4rem .3rem',textAlign:'center'}}>
                    <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3,fontSize:'.68rem',color:travado?'var(--verde)':'var(--text-muted)',cursor:'pointer',fontWeight:travado?700:400}}>
                      <input type="checkbox" checked={travado} onChange={ev=>updValidado(e.jogador_id, ev.target.checked)} />
                      {travado ? '✔' : ''}
                    </label>
                  </td>
                  {STAT_COLS.map(col=>(
                    <td key={col.key} style={{padding:'.3rem .3rem',textAlign:'center',background:rowBg}}>
                      <select
                        value={s[col.key]}
                        disabled={travado}
                        onChange={ev=>updStat(e.jogador_id,col.key,+ev.target.value)}
                        style={{
                          width:54, background: travado ? 'var(--surface)' : 'var(--surface2)',
                          border:'1px solid var(--border)', borderRadius:4,
                          color: travado ? 'var(--text-muted)' : 'var(--text)',
                          padding:'.3rem .2rem', textAlign:'center', fontSize:'.85rem',
                          cursor: travado ? 'not-allowed' : 'pointer',
                          opacity: travado ? .7 : 1,
                        }}
                      >
                        {opcoesAte(col.max).map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <p style={{fontSize:'.78rem',color:'var(--text-muted)',marginBottom:'1rem'}}>
        Estatísticas por jogador (fonte: Opta). Escalação e alias não são editáveis aqui — para alterá-los, use a aba Escalação e o cadastro de Jogadores.
        Ao marcar <strong>Validado</strong>, os números daquele jogador ficam bloqueados para edição.
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
        <div>
          <h3 style={{fontSize:'1.1rem',marginBottom:'.6rem',color:'var(--verde)'}}>{timeCasa?.nome ?? timeCasaNome} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>(Mandante)</span></h3>
          <TabelaTime esc={partida.escalacao_casa} cor="var(--verde)" />
        </div>
        <div>
          <h3 style={{fontSize:'1.1rem',marginBottom:'.6rem',color:'var(--amarelo)'}}>{timeVis?.nome ?? timeVisNome} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>(Visitante)</span></h3>
          <TabelaTime esc={partida.escalacao_visitante} cor="var(--amarelo)" />
        </div>
      </div>
    </div>
  );
}

export default function AdminPartidaEventos() {
  const {id} = useParams<{id:string}>();
  const [partida, setPartida] = useState<Partida|null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const [tab, setTab] = useState<'escalacao'|'gols'|'cartoes'|'subs'|'stats'>('escalacao');

  const flash=(ok:boolean,t:string)=>{if(ok)setMsg(t);else setError(t);setTimeout(()=>{setMsg('');setError('');},3500);};

  const load = useCallback(async () => {
    const [p,t,j,tc] = await Promise.all([clientGetPartida(id), clientGetTimes(), clientGetJogadores(), clientGetTecnicos()]);
    setPartida(p); setTimes(t); setJogadores(j); setTecnicos(tc);
  },[id]);
  useEffect(()=>{load();},[load]);

  const save = async (updated: Partida) => {
    try {
      const golsValidos = updated.gols.filter(g => !['penalti_perdido','penalti_defendido'].includes(g.tipo));
      const placarCasa = golsValidos.filter(g => g.time_id === updated.time_casa_id).length;
      const placarVis  = golsValidos.filter(g => g.time_id === updated.time_visitante_id).length;
      await clientUpsertPartida({...updated, placar_casa:placarCasa, placar_visitante:placarVis});
      flash(true,'Salvo!'); load();
    } catch(e) { flash(false,'Erro: '+String(e)); }
  };

  if(!partida) return <div className="container" style={{paddingTop:'3rem',color:'var(--text-muted)'}}>Carregando...</div>;

  const timeCasa = times.find(t=>t.id===partida.time_casa_id);
  const timeVis  = times.find(t=>t.id===partida.time_visitante_id);
  const jogCasa  = jogadores.filter(j=>j.time_atual===partida.time_casa_id);
  const jogVis   = jogadores.filter(j=>j.time_atual===partida.time_visitante_id);
  const nomeJog  = (jid:string) => jogadores.find(j=>j.id===jid)?.nome ?? jid;
  const nomeTec  = (tid:string|undefined) => tid ? (tecnicos.find(t=>t.id===tid)?.nome ?? tid) : '—';

  const tecnicosDaPartida = tecnicos.filter(t =>
    t.id === partida.tecnico_casa_id || t.id === partida.tecnico_visitante_id
  );

  const timeCasaNome = timeCasa?.sigla ?? 'Mandante';
  const timeVisNome  = timeVis?.sigla  ?? 'Visitante';

  // ── ESCALAÇÃO ───────────────────────────────────────────────────────────────
  const EscalacaoTab = () => {
    const addJog=(isCasa:boolean)=>{
      const lista=isCasa?jogCasa:jogVis;
      const esc=isCasa?partida.escalacao_casa:partida.escalacao_visitante;
      if(!lista.length) return flash(false,'Nenhum jogador cadastrado para este time.');
      const jaAdicionados=new Set(esc.map(e=>e.jogador_id));
      let disponivel = esc.length===0 ? lista.find(j=>j.posicao==='GOL'&&!jaAdicionados.has(j.id)) : undefined;
      if(!disponivel) disponivel=lista.find(j=>!jaAdicionados.has(j.id));
      if(!disponivel) return flash(false,'Todos os jogadores já foram adicionados.');
      const titularesAtuais=esc.filter(e=>e.titular).length;
      const temGoleiroTitular=esc.some(e=>e.titular&&e.posicao==='GOL');
      let deveSerTitular=titularesAtuais<11;
      if(disponivel.posicao==='GOL'&&temGoleiroTitular) deveSerTitular=false;
      const novo:EscalacaoJogador={jogador_id:disponivel.id,numero:disponivel.numero??0,posicao:disponivel.posicao??'ATA',titular:deveSerTitular};
      const u={...partida};
      if(isCasa) u.escalacao_casa=[...u.escalacao_casa,novo]; else u.escalacao_visitante=[...u.escalacao_visitante,novo];
      save(u as Partida);
    };

    // "Completar": adiciona automaticamente jogadores disponíveis como titulares
    // até atingir 11 titulares para o time selecionado.
    const completarEscalacao=(isCasa:boolean)=>{
      const lista=isCasa?jogCasa:jogVis;
      const esc=isCasa?partida.escalacao_casa:partida.escalacao_visitante;
      const titularesAtuais=esc.filter(e=>e.titular).length;
      const faltam=11-titularesAtuais;
      if(faltam<=0) return flash(false,'Este time já tem 11 titulares.');

      const jaAdicionados=new Set(esc.map(e=>e.jogador_id));
      let temGoleiroTitular=esc.some(e=>e.titular&&e.posicao==='GOL');
      const disponiveis=lista.filter(j=>!jaAdicionados.has(j.id));
      if(disponiveis.length===0) return flash(false,'Não há mais jogadores disponíveis para adicionar.');

      const novos:EscalacaoJogador[]=[];

      if(!temGoleiroTitular){
        const gol=disponiveis.find(j=>j.posicao==='GOL');
        if(gol){
          novos.push({jogador_id:gol.id,numero:gol.numero??0,posicao:gol.posicao??'GOL',titular:true});
          temGoleiroTitular=true;
        }
      }

      for(const j of disponiveis){
        if(novos.length>=faltam) break;
        if(novos.some(n=>n.jogador_id===j.id)) continue;
        if(j.posicao==='GOL'&&temGoleiroTitular) continue;
        novos.push({jogador_id:j.id,numero:j.numero??0,posicao:j.posicao??'ATA',titular:true});
      }

      if(novos.length===0) return flash(false,'Não foi possível completar automaticamente (faltam jogadores de linha).');

      const u={...partida};
      if(isCasa) u.escalacao_casa=[...u.escalacao_casa,...novos];
      else u.escalacao_visitante=[...u.escalacao_visitante,...novos];
      save(u as Partida);

      if(novos.length<faltam) flash(true,`${novos.length} jogador(es) adicionado(s). Não há jogadores suficientes para completar 11 titulares.`);
      else flash(true,`${novos.length} jogador(es) adicionado(s) como titulares!`);
    };

    const updJogador=(isCasa:boolean,idx:number,novoJogadorId:string)=>{
      const jog=jogadores.find(j=>j.id===novoJogadorId);
      const u={...partida};
      const esc=isCasa?[...u.escalacao_casa]:[...u.escalacao_visitante];
      esc[idx]={...esc[idx],jogador_id:novoJogadorId,numero:jog?.numero??esc[idx].numero,posicao:jog?.posicao??esc[idx].posicao};
      if(isCasa) u.escalacao_casa=esc; else u.escalacao_visitante=esc;
      save(u as Partida);
    };
    const upd=(isCasa:boolean,idx:number,field:string,value:string|boolean)=>{
      const u={...partida};
      const esc=isCasa?[...u.escalacao_casa]:[...u.escalacao_visitante];
      if(field==='titular'&&value===true){
        if(esc.filter((e,i)=>e.titular&&i!==idx).length>=11){flash(false,'Limite de 11 titulares atingido.');return;}
        if(esc[idx].posicao==='GOL'&&esc.some((e,i)=>e.titular&&e.posicao==='GOL'&&i!==idx)){flash(false,'Já existe um goleiro titular.');return;}
      }
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
      const titularesCount=esc.filter(e=>e.titular).length;
      return (
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
            <div>
              <h3 style={{fontSize:'1.2rem'}}>{time?.nome} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>{isCasa?'(Mandante)':'(Visitante)'}</span></h3>
              <div style={{fontSize:'.7rem',color:titularesCount===11?'var(--verde)':'var(--text-muted)',fontWeight:titularesCount===11?700:400}}>
                {titularesCount}/11 Titulares · {esc.length}/23 Total
              </div>
            </div>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>completarEscalacao(isCasa)} title="Preenche automaticamente os titulares que faltam">⚡ Completar</button>
              <button className="btn btn-primary btn-sm" onClick={()=>addJog(isCasa)}>+ Jogador</button>
            </div>
          </div>
          {esc.length===0&&<p style={{color:'var(--text-muted)',fontSize:'.85rem'}}>Nenhum jogador adicionado.</p>}
          {esc.map((e,i)=>{
            const opcoes=lista.filter(j=>j.id===e.jogador_id||!jaAdicionados.has(j.id));
            return (
              <div key={i} style={{display:'flex',gap:'.5rem',marginBottom:'.4rem',background:'var(--surface2)',borderRadius:6,padding:'.5rem',borderLeft:e.titular?'3px solid var(--verde)':'3px solid transparent'}}>
                <input type="number" min={0} max={99} value={e.numero} onChange={ev=>upd(isCasa,i,'numero',ev.target.value)} style={{width:52,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem',textAlign:'center'}} />
                <select value={e.jogador_id} onChange={ev=>updJogador(isCasa,i,ev.target.value)} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                  {opcoes.map(j=><option key={j.id} value={j.id}>{j.nome}</option>)}
                </select>
                <select value={e.posicao} onChange={ev=>upd(isCasa,i,'posicao',ev.target.value)} style={{width:60,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'.3rem .4rem'}}>
                  {POSICOES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <label style={{display:'flex',alignItems:'center',gap:4,fontSize:'.8rem',color:e.titular?'var(--verde)':'var(--text-muted)',cursor:'pointer',whiteSpace:'nowrap',fontWeight:e.titular?700:400}}>
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

  return (
    <div className="container" style={{paddingTop:'2rem'}}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; border-radius: 8px; font-size: .9rem; z-index: 9999; animation: slideIn .3s ease-out; }
        .toast-success { background: rgba(0,168,79,.15); border: 1px solid rgba(0,168,79,.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; }

        /* Foco visível (clique ou Tab) nos campos de Gols/Cartões/Subs.
           Precisa de classe própria porque o estilo inline de borda sempre
           vence uma regra ":focus" do CSS externo, então sem isso o Tab
           não dava nenhum feedback visual. */
        .evt-field { transition: border-color .15s, box-shadow .15s; }
        .evt-field:focus {
          outline: none;
          border-color: var(--verde) !important;
          box-shadow: 0 0 0 2px rgba(0,168,79,.25);
        }
      `}</style>
      <div style={{marginBottom:'2rem'}}>
        <h1 style={{fontSize:'2.2rem',marginBottom:'.5rem'}}>📋 Eventos da Partida</h1>
        <div style={{display:'flex',alignItems:'center',gap:'1rem',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem'}}>
          <span>{timeCasa?.nome}</span>
          <span style={{color:'var(--verde)'}}>{partida.placar_casa} × {partida.placar_visitante}</span>
          <span>{timeVis?.nome}</span>
          <span className="badge badge-cinza" style={{fontSize:'.8rem',fontFamily:'sans-serif'}}>{partida.rodada}ª Rodada</span>
        </div>
      </div>
      {msg&&<div className="toast toast-success">{msg}</div>}
      {error&&<div className="toast toast-error">{error}</div>}

      <div style={{display:'flex',gap:'.5rem',marginBottom:'1.5rem',borderBottom:'1px solid var(--border)',paddingBottom:'1rem',flexWrap:'wrap'}}>
        <button className={`btn ${tab==='escalacao'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('escalacao')}>📋 Escalação</button>
        <button className={`btn ${tab==='gols'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('gols')}>⚽ Gols ({partida.gols.length})</button>
        <button className={`btn ${tab==='cartoes'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('cartoes')}>🟨 Cartões ({partida.cartoes.length})</button>
        <button className={`btn ${tab==='subs'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('subs')}>🔄 Subs ({partida.substituicoes.length})</button>
        <button className={`btn ${tab==='stats'?'btn-primary':'btn-ghost'}`} onClick={()=>setTab('stats')}>📈 Stats</button>
      </div>

      {tab==='escalacao'&&<EscalacaoTab/>}
      {tab==='gols'&&(
        <GolsTab
          partida={partida} timeCasa={timeCasa} timeVis={timeVis}
          timeCasaNome={timeCasaNome} timeVisNome={timeVisNome}
          nomeJog={nomeJog} save={save} flash={flash}
        />
      )}
      {tab==='cartoes'&&(
        <CartoesTab
          partida={partida} timeCasa={timeCasa} timeVis={timeVis}
          timeCasaNome={timeCasaNome} timeVisNome={timeVisNome}
          tecnicosDaPartida={tecnicosDaPartida}
          nomeJog={nomeJog} nomeTec={nomeTec} save={save} flash={flash}
        />
      )}
      {tab==='subs'&&(
        <SubsTab
          partida={partida}
          timeCasaNome={timeCasaNome} timeVisNome={timeVisNome}
          nomeJog={nomeJog} save={save} flash={flash}
        />
      )}
      {tab==='stats'&&(
        <StatsTab
          partida={partida} timeCasa={timeCasa} timeVis={timeVis}
          timeCasaNome={timeCasaNome} timeVisNome={timeVisNome}
          jogadores={jogadores} save={save}
        />
      )}
    </div>
  );
}
