import { notFound } from 'next/navigation';
import { getPartida, getTimes, getJogadores, getEstadios, getTecnicos, formatDate } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

const TIPO_GOL: Record<string,string> = {normal:'Gol',penalti:'Pênalti',falta:'Falta',contra:'Contra'};

interface EventoLinha {
  minuto: number;
  acrescimo: number;
  tipo: 'gol' | 'gol_contra' | 'penalti_perdido' | 'penalti_defendido' | 'cartao_amarelo' | 'cartao_vermelho' | 'substituicao';
  isCasa: boolean;
  icone: string;
  cor: string;
  texto: string;
}

export default async function PartidaPage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  const [partida, times, jogadores, estadios, tecnicos] = await Promise.all([
    getPartida(id), getTimes(), getJogadores(), getEstadios(), getTecnicos()
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

  // ── Linha do Tempo: combina gols, cartões e substituições em uma única
  // lista cronológica, com marcadores empilhados quando há mais de um
  // registro no mesmo minuto (ex: dupla substituição).
  const acr1 = partida.acrescimo_primeiro ?? 0;
  const acr2 = partida.acrescimo_segundo ?? 0;
  const totalPartidaMin = 45 + acr1 + 45 + acr2;

  const eventosLinha: EventoLinha[] = [];

  for (const g of partida.gols as any[]) {
    const tipoStr = g.tipo as string;
    const isCasa = g.time_id === partida.time_casa_id;

    if (tipoStr === 'penalti_defendido') {
      eventosLinha.push({
        minuto: g.minuto,
        acrescimo: g.acrescimo ?? 0,
        tipo: 'penalti_defendido',
        isCasa,
        icone: '🧤',
        cor: '#60a5fa',
        texto: `${nomeJog(g.jogador_id)} cobrou · defendido por ${nomeJog(g.goleiro_id)}`,
      });
      continue;
    }
    if (tipoStr === 'penalti_perdido') {
      eventosLinha.push({
        minuto: g.minuto,
        acrescimo: g.acrescimo ?? 0,
        tipo: 'penalti_perdido',
        isCasa,
        icone: '❌',
        cor: '#f97316',
        texto: `${nomeJog(g.jogador_id)} perdeu o pênalti${g.descricao ? ` · ${g.descricao}` : ''}`,
      });
      continue;
    }

    const isContra = tipoStr === 'contra';
    eventosLinha.push({
      minuto: g.minuto,
      acrescimo: g.acrescimo ?? 0,
      tipo: isContra ? 'gol_contra' : 'gol',
      isCasa,
      icone: isContra ? '🔴' : '⚽',
      cor: isContra ? 'var(--rebaixamento)' : '#fbbf24',
      texto: `${nomeJog(g.jogador_id)}${!isContra && g.assistencia_id ? ` · assist. ${nomeJog(g.assistencia_id)}` : ''} (${TIPO_GOL[tipoStr] ?? tipoStr})`,
    });
  }

  for (const c of partida.cartoes as any[]) {
    const isCasa = c.time_id === partida.time_casa_id;
    const isVermelho = c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico';
    const isTecnico = c.tipo === 'amarelo_tecnico' || c.tipo === 'vermelho_tecnico';
    const nomePunido = isTecnico && c.tecnico_id ? nomeTecnico(c.tecnico_id) : nomeJog(c.jogador_id);
    eventosLinha.push({
      minuto: c.minuto,
      acrescimo: c.acrescimo ?? 0,
      tipo: isVermelho ? 'cartao_vermelho' : 'cartao_amarelo',
      isCasa,
      icone: isVermelho ? '🟥' : '🟨',
      cor: isVermelho ? 'var(--rebaixamento)' : '#f59e0b',
      texto: `${nomePunido}${c.motivo ? ` · ${c.motivo}` : ''}${isTecnico ? ' (Técnico)' : ''}`,
    });
  }

  for (const s of partida.substituicoes as any[]) {
    const isCasa = s.time_id === partida.time_casa_id;
    eventosLinha.push({
      minuto: s.minuto,
      acrescimo: 0,
      tipo: 'substituicao',
      isCasa,
      icone: '🔄',
      cor: '#94a3b8',
      texto: `${nomeJog(s.entra_id)} ↑ / ${nomeJog(s.sai_id)} ↓`,
    });
  }

  eventosLinha.sort((a, b) => (a.minuto + a.acrescimo * 0.01) - (b.minuto + b.acrescimo * 0.01));

  // Empilhamento: quando dois ou mais eventos caem exatamente no mesmo minuto
  // (+acréscimo), cada um recebe um índice para ser desenhado um abaixo do outro.
  const contagemPorMinuto: Record<string, number> = {};
  const eventosComOffset = eventosLinha.map(ev => {
    const chave = `${ev.minuto}-${ev.acrescimo}`;
    const indice = contagemPorMinuto[chave] ?? 0;
    contagemPorMinuto[chave] = indice + 1;
    return { ...ev, offsetIndice: indice };
  });
  const maiorEmpilhamento = Math.max(1, ...Object.values(contagemPorMinuto));

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

        {partida.gols.length>0&&(
          <div style={sS}><h3 style={sT}>⚽ Gols</h3>
            {partida.gols.map((g:any)=>{
              const tg=times.find(t=>t.id===g.time_id);
              return (
                <div key={g.id} style={{display:'flex',alignItems:'flex-start',gap:'.75rem',padding:'.6rem .75rem',background:'var(--surface2)',borderRadius:8,marginBottom:'.4rem',borderLeft:`3px solid ${g.time_id===partida.time_casa_id?'var(--verde)':'var(--amarelo)'}`}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem',color:'var(--verde)',minWidth:48,flexShrink:0}}>
                    {g.minuto}{(g.acrescimo??0)>0?`+${g.acrescimo}`:''}&apos;
                  </span>
                  <span>⚽</span>
                  <div style={{flex:1}}>
                    <strong>{nomeJog(g.jogador_id)}</strong>
                    {g.assistencia_id&&<span style={{color:'var(--text-muted)',fontSize:'.85rem'}}> · Assist. {nomeJog(g.assistencia_id)}</span>}
                    <div style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.1rem'}}>{TIPO_GOL[g.tipo]??g.tipo}{g.goleiro_id?` · Goleiro: ${nomeJog(g.goleiro_id)}`:''}</div>
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
              const corBorda=c.tipo==='vermelho'||c.tipo==='vermelho_tecnico'?'var(--rebaixamento)':'var(--amarelo)';
              const icone=c.tipo==='vermelho'||c.tipo==='vermelho_tecnico'?'🟥':'🟨';
              const nomePunido=c.tecnico_id
                ? (tecnicos.find(t=>t.id===c.tecnico_id)?.nome??c.tecnico_id)
                : nomeJog(c.jogador_id);
              const labelTipo:Record<string,string>={amarelo:'Amarelo',vermelho:'Vermelho',amarelo_tecnico:'Amarelo (Técnico)',vermelho_tecnico:'Vermelho (Técnico)'};
              return (
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.5rem .75rem',background:'var(--surface2)',borderRadius:8,marginBottom:'.4rem',fontSize:'.875rem',borderLeft:`3px solid ${corBorda}`}}>
                  <span style={{fontSize:'1.1rem'}}>{icone}</span>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--verde)',minWidth:48,flexShrink:0}}>
                    {c.minuto}{(c.acrescimo??0)>0?`+${c.acrescimo}`:''}&apos;
                  </span>
                  <div style={{flex:1}}>
                    <strong>{nomePunido}</strong>
                    {c.tipo&&c.tipo!=='amarelo'&&c.tipo!=='vermelho'&&(
                      <span style={{fontSize:'.7rem',background:'var(--surface)',borderRadius:3,padding:'.1rem .3rem',marginLeft:'.4rem',color:'var(--text-muted)'}}>{labelTipo[c.tipo]??c.tipo}</span>
                    )}
                    {c.motivo&&<div style={{fontSize:'.75rem',color:'var(--text-muted)',marginTop:'.1rem',fontStyle:'italic'}}>{c.motivo}</div>}
                  </div>
                  <EscudoTime time={tc2} size={24} />
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
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--verde)',minWidth:40,flexShrink:0}}>{s.minuto}&apos;</span>
                  <EscudoTime time={ts} size={24} />
                  <span style={{color:'#22c55e',fontWeight:600}}>↑ {nomeJog(s.entra_id)}</span>
                  <span style={{color:'var(--border)'}}>·</span>
                  <span style={{color:'#ef4444',fontWeight:600}}>↓ {nomeJog(s.sai_id)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 🕒 Linha do Tempo — gols, cartões e substituições em ordem cronológica */}
        {eventosComOffset.length>0&&(
          <div style={sS}><h3 style={sT}>🕒 Linha do Tempo</h3>

            <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'var(--text-muted)',marginBottom:'.4rem'}}>
              <span>0&apos;</span>
              <span>45+{acr1}&apos;</span>
              <span>90+{acr2}&apos;</span>
            </div>

            <div style={{
              position:'relative', height:8, background:'#222', borderRadius:4,
              marginBottom: 12 + (maiorEmpilhamento - 1) * 20,
            }}>
              <div style={{position:'absolute',left:'45.45%',top:-2,width:1,height:12,background:'#444',zIndex:1}} />
              {eventosComOffset.map((ev,i)=>{
                const pos = Math.min((ev.minuto / totalPartidaMin) * 100, 98);
                const topOffset = ev.offsetIndice * 20;
                const timeSigla = ev.isCasa ? tc?.sigla : tv?.sigla;
                return (
                  <div
                    key={i}
                    title={`${ev.minuto}${ev.acrescimo>0?`+${ev.acrescimo}`:''}' · ${timeSigla} · ${ev.texto}`}
                    style={{
                      position:'absolute',
                      left:`${pos}%`,
                      top:`calc(50% + ${topOffset}px)`,
                      transform:'translate(-50%, -50%)',
                      width:16, height:16,
                      borderRadius:'50%',
                      background:ev.cor,
                      border:`2px solid ${ev.isCasa?'var(--verde)':'var(--amarelo)'}`,
                      zIndex:2,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:8,
                      cursor:'default',
                    }}
                  >
                    {ev.icone}
                  </div>
                );
              })}
            </div>

            <div style={{display:'flex',gap:'1rem',fontSize:'.7rem',color:'var(--text-muted)',marginBottom:'1rem',flexWrap:'wrap'}}>
              <span style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
                <span style={{width:10,height:10,borderRadius:'50%',border:'2px solid var(--verde)',display:'inline-block'}} /> {tc?.sigla} (mandante)
              </span>
              <span style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
                <span style={{width:10,height:10,borderRadius:'50%',border:'2px solid var(--amarelo)',display:'inline-block'}} /> {tv?.sigla} (visitante)
              </span>
            </div>

            <div style={{display:'flex',flexWrap:'wrap',gap:'.5rem'}}>
              {eventosComOffset.map((ev,i)=>{
                const timeSigla = ev.isCasa ? tc?.sigla : tv?.sigla;
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:'.4rem',
                    background:'var(--surface2)', border:`1px solid ${ev.cor}33`,
                    borderRadius:6, padding:'.3rem .65rem', fontSize:'.8rem',
                  }}>
                    <span>{ev.icone}</span>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",color:ev.cor,fontSize:'.95rem'}}>
                      {ev.minuto}{ev.acrescimo>0?`+${ev.acrescimo}`:''}&apos;
                    </span>
                    <span style={{fontSize:'.68rem',color:ev.isCasa?'var(--verde)':'var(--amarelo)',fontWeight:700}}>
                      {timeSigla}
                    </span>
                    <span style={{color:'var(--text-muted)'}}>{ev.texto}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
