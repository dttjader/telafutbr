import { getPartidas, getTimes, getEstadios, formatDate } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  const partidas = getPartidas().sort((a,b)=>a.rodada-b.rodada||a.data.localeCompare(b.data));
  const times = getTimes();
  const estadios = getEstadios();
  const rodadas = [...new Set(partidas.map(p=>p.rodada))].sort((a,b)=>a-b);

  const nomeEstadio = (id:string) => estadios.find(e=>e.id===id)?.nome ?? id;
  const statusLabel: Record<string,string> = { agendada:'Agendada', ao_vivo:'🔴 Ao Vivo', encerrada:'Encerrada', adiada:'Adiada' };
  const statusColor: Record<string,string> = { agendada:'#6b7280', ao_vivo:'#ef4444', encerrada:'var(--libertadores)', adiada:'var(--amarelo-card)' };

  return (
    <div style={{paddingBottom:'3rem'}}>
      <div style={{background:'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)',borderBottom:'1px solid var(--border)',padding:'2.5rem 0 2rem',marginBottom:'2rem'}}>
        <div className="container">
          <p style={{fontSize:'.75rem',color:'var(--verde)',textTransform:'uppercase',letterSpacing:'.2em',fontWeight:700,marginBottom:'.4rem'}}>Resultados & Jogos</p>
          <h1 style={{fontSize:'clamp(2.5rem,6vw,4rem)',color:'var(--text)'}}>Rodadas</h1>
        </div>
      </div>
      <div className="container">
        {rodadas.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center',padding:'3rem'}}>Nenhuma partida cadastrada ainda.</p>}
        {rodadas.map(rod=>(
          <section key={rod} style={{marginBottom:'2.5rem'}}>
            <h2 style={{fontSize:'1.8rem',marginBottom:'.75rem',paddingBottom:'.5rem',borderBottom:'1px solid var(--border)'}}>{rod}ª Rodada</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'1rem'}}>
              {partidas.filter(p=>p.rodada===rod).map(p=>{
                const tc=times.find(t=>t.id===p.time_casa_id);
                const tv=times.find(t=>t.id===p.time_visitante_id);
                const enc=p.status==='encerrada'||p.status==='ao_vivo';
                return (
                  <Link key={p.id} href={`/partida/${p.id}`} style={{display:'block',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'1.25rem',transition:'all .2s',textDecoration:'none',position:'relative',overflow:'hidden'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#444';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.transform='none';}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'1rem'}}>
                      <span style={{fontSize:'.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:statusColor[p.status]}}>{statusLabel[p.status]}</span>
                      <span style={{fontSize:'.72rem',color:'var(--text-muted)'}}>{formatDate(p.data)} · {p.hora}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.3rem',flex:1}}>
                        <EscudoTime timeId={p.time_casa_id} size={48} />
                        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'.95rem'}}>{tc?.sigla}</span>
                      </div>
                      <div style={{textAlign:'center',flex:'0 0 auto'}}>
                        {enc
                          ? <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'2.2rem',display:'flex',alignItems:'center',gap:'.3rem'}}><span>{p.placar_casa}</span><span style={{color:'var(--verde)',fontSize:'1.4rem'}}>×</span><span>{p.placar_visitante}</span></div>
                          : <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.5rem',color:'var(--text-muted)'}}>VS</div>
                        }
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.3rem',flex:1}}>
                        <EscudoTime timeId={p.time_visitante_id} size={48} />
                        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'.95rem'}}>{tv?.sigla}</span>
                      </div>
                    </div>
                    {enc && p.gols.length>0 && (
                      <div style={{display:'flex',justifyContent:'space-between',padding:'.5rem 0',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',marginBottom:'.6rem',fontSize:'.72rem',color:'var(--text-muted)'}}>
                        <div style={{flex:1}}>{p.gols.filter(g=>g.time_id===p.time_casa_id).map(g=>{const j=g.jogador_id;return`⚽ ${g.minuto}'`;}).join(' ')}</div>
                        <div style={{flex:1,textAlign:'right'}}>{p.gols.filter(g=>g.time_id===p.time_visitante_id).map(g=>`${g.minuto}' ⚽`).join(' ')}</div>
                      </div>
                    )}
                    <div style={{fontSize:'.7rem',color:'#555',display:'flex',justifyContent:'space-between'}}>
                      <span>{nomeEstadio(p.estadio_id)}</span>
                      {enc&&p.publico>0&&<span>{p.publico.toLocaleString('pt-BR')} presentes</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
