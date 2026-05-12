import { notFound } from 'next/navigation';
import { getPartida, getTimes, getJogadores, getEstadios, getTecnicos, formatDate } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

const TIPO_GOL: Record<string,string> = {normal:'Gol',penalti:'Pênalti',falta:'Falta',contra:'Contra'};

export default async function PartidaPage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  const [partida, times, jogadores, estadios, tecnicos] = await Promise.all([
    getPartida(id), getTimes(), getJogadores(), getEstadios(), (await import('@/lib/data')).getTecnicos()
  ]);
  if(!partida) notFound();

  const tc=times.find(t=>t.id===partida.time_casa_id);
  const tv=times.find(t=>t.id===partida.time_visitante_id);
  const estadio=estadios.find(e=>e.id===partida.estadio_id);
  const nomeJog=(jid:string)=>jogadores.find(j=>j.id===jid)?.nome??jid;
  const enc=partida.status==='encerrada';
  const nomeTecnico=(tid:string|null)=>tid?(tecnicos.find(t=>t.id===tid)?.nome??tid):'Não informado';

  const sS={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'1.5rem',marginBottom:'1rem'};
  const sT={fontSize:'1.1rem',color:'var(--amarelo)',marginBottom:'1rem',paddingBottom:'.75rem',borderBottom:'1px solid var(--border)'};

  return (
    <div style={{paddingBottom:'4rem'}}>
      <div style={{background:'linear-gradient(160deg,#0a0a0a 0%,#0d1f0d 60%,#0a0a0a 100%)',borderBottom:'1px solid var(--border)',padding:'2.5rem 0',marginBottom:'1.5rem'}}>
        <div className="container">
          <p style={{textAlign:'center',fontSize:'.75rem',color:'var(--text-muted)',marginBottom:'1rem',letterSpacing:'.05em'}}>
            Rodada {partida.rodada} · {formatDate(partida.data)} · {partida.hora} · {estadio?.nome}, {estadio?.cidade}/{estadio?.estado}
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1.5rem',maxWidth:660,margin:'0 auto'}}>
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'.5rem'}}>
              <EscudoTime time={tc} size={72} />
              <h2 style={{fontSize:'1.4rem'}}>{tc?.nome}</h2>
              <span style={{fontSize:'.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>Mandante</span>
            </div>
            <div style={{textAlign:'center'}}>
              {enc
                ? <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'4rem',display:'flex',alignItems:'center',gap:'.5rem'}}><span>{partida.placar_casa}</span><span style={{color:'var(--verde)',fontSize:'2.5rem'}}>×</span><span>{partida.placar_visitante}</span></div>
                : <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2.5rem',color:'var(--verde)'}}>VS</div>}
              <div style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:'.3rem'}}>+{partida.acrescimo_primeiro}&apos; · +{partida.acrescimo_segundo}&apos;</div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.5rem'}}>
              <EscudoTime time={tv} size={72} />
              <h2 style={{fontSize:'1.4rem',textAlign:'right'}}>{tv?.nome}</h2>
              <span style={{fontSize:'.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>Visitante</span>
            </div>
          </div>
          {enc&&partida.publico>0&&<p style={{textAlign:'center',fontSize:'.8rem',color:'var(--text-muted)',marginTop:'1rem'}}>👥 {partida.publico.toLocaleString('pt-BR')} presentes</p>}
        </div>
      </div>

      <div className="container">
        {partida.gols.length>0&&(
          <div style={sS}><h3 style={sT}>⚽ Gols</h3>
            {partida.gols.map((g:any)=>{
              const tg=times.find(t=>t.id===g.time_id);
              return (
                <div key={g.id} style={{display:'flex',alignItems:'flex-start',gap:'.75rem',padding:'.6rem .75rem',background:'var(--surface2)',borderRadius:8,marginBottom:'.4rem',borderLeft:`3px solid ${g.time_id===partida.time_casa_id?'var(--verde)':'var(--amarelo)'}`}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--verde)',minWidth:40}}>{g.minuto}{g.acrescimo>0?`+${g.acrescimo}`:''}&apos;</span>
                  <span>⚽</span>
                  <div style={{flex:1}}>
                    <strong>{nomeJog(g.jogador_id)}</strong>
                    {g.assistencia_id&&<span style={{color:'var(--text-muted)',fontSize:'.85rem'}}> · Assist. {nomeJog(g.assistencia_id)}</span>}
                    <div style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.1rem'}}>{TIPO_GOL[g.tipo]}{g.goleiro_id?` · Goleiro: ${nomeJog(g.goleiro_id)}`:''}</div>
                    {g.descricao&&<div style={{fontSize:'.73rem',color:'var(--text-muted)',fontStyle:'italic'}}>{g.descricao}</div>}
                  </div>
                  <EscudoTime time={tg} size={28} />
                </div>
              );
            })}
          </div>
        )}

        {partida.cartoes.length>0&&(
          <div style={sS}><h3 style={sT}>🟨 Cartões</h3>
            {partida.cartoes.map((c:any)=>{
              const tc2=times.find(t=>t.id===c.time_id);
              return (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.5rem .75rem',background:'var(--surface2)',borderRadius:8,marginBottom:'.4rem',fontSize:'.875rem'}}>
                  <span style={{width:12,height:18,borderRadius:2,background:c.tipo==='vermelho'?'var(--rebaixamento)':'var(--amarelo)',flexShrink:0,display:'inline-block'}} />
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--verde)',minWidth:32}}>{c.minuto}&apos;</span>
                  <strong style={{flex:1}}>{nomeJog(c.jogador_id)}</strong>
                  <EscudoTime time={tc2} size={24} />
                  {c.motivo&&<span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{c.motivo}</span>}
                </div>
              );
            })}
          </div>
        )}

        {partida.substituicoes.length>0&&(
          <div style={sS}><h3 style={sT}>🔄 Substituições</h3>
            {partida.substituicoes.map((s:any)=>{
              const ts=times.find(t=>t.id===s.time_id);
              return (
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.5rem .75rem',background:'var(--surface2)',borderRadius:8,marginBottom:'.4rem',fontSize:'.875rem'}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--verde)',minWidth:32}}>{s.minuto}&apos;</span>
                  <EscudoTime time={ts} size={24} />
                  <span style={{color:'#22c55e'}}>↑ {nomeJog(s.entra_id)}</span>
                  <span style={{color:'#ef4444'}}>↓ {nomeJog(s.sai_id)}</span>
                </div>
              );
            })}
          </div>
        )}

        {(partida.escalacao_casa.length>0||partida.escalacao_visitante.length>0)&&(
          <div style={sS}><h3 style={sT}>👕 Escalações</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              {[{time:tc,esc:partida.escalacao_casa},{time:tv,esc:partida.escalacao_visitante}].map(({time,esc})=>(
                <div key={time?.id}>
                  <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'.75rem'}}>
                    <EscudoTime time={time} size={32} />
                    <strong style={{fontSize:'.95rem'}}>{time?.nome}</strong>
                  </div>
                  {['Titulares','Reservas'].map(grupo=>{
                    const lista=(esc as any[]).filter(e=>grupo==='Titulares'?e.titular:!e.titular);
                    if(lista.length===0) return null;
                    return (
                      <div key={grupo} style={{marginBottom:'.75rem'}}>
                        <p style={{fontSize:'.65rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-muted)',marginBottom:'.3rem',fontWeight:700}}>{grupo}</p>
                        {lista.map((e:any,i:number)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.3rem .5rem',background:'var(--surface2)',borderRadius:4,marginBottom:'.2rem',fontSize:'.82rem'}}>
                            <span style={{fontFamily:"'Bebas Neue',sans-serif",color:'var(--verde)',minWidth:26}}>#{e.numero}</span>
                            <span style={{flex:1}}>{nomeJog(e.jogador_id)}</span>
                            <span style={{fontSize:'.68rem',background:'var(--surface)',color:'var(--text-muted)',padding:'.1rem .3rem',borderRadius:3}}>{e.posicao}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={sS}><h3 style={sT}>🧑‍💼 Técnicos</h3>
          {[['Mandante',partida.tecnico_casa_id],['Visitante',partida.tecnico_visitante_id]].map(([lado,tid]:any)=>(
            <div key={lado} style={{display:'flex',justifyContent:'space-between',padding:'.45rem .75rem',background:'var(--surface2)',borderRadius:6,marginBottom:'.3rem',fontSize:'.875rem'}}>
              <span style={{color:'var(--text-muted)'}}>{lado}</span><strong>{nomeTecnico(tid)}</strong>
            </div>
          ))}
        </div>
        <div style={sS}><h3 style={sT}>🟢 Arbitragem</h3>
          {[['Árbitro principal',partida.arbitragem.principal],['Assistente 1',partida.arbitragem.assistente1],['Assistente 2',partida.arbitragem.assistente2],['4º árbitro',partida.arbitragem.quarto],['VAR',partida.arbitragem.var]].map(([label,nome]:any)=>nome?(
            <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'.45rem .75rem',background:'var(--surface2)',borderRadius:6,marginBottom:'.3rem',fontSize:'.875rem'}}>
              <span style={{color:'var(--text-muted)'}}>{label}</span><strong>{nome}</strong>
            </div>
          ):null)}
        </div>
      </div>
    </div>
  );
}
