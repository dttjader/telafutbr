import { getPartidas, getTimes } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ConfrontosPage() {
  const [partidas, times] = await Promise.all([getPartidas(), getTimes()]);
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  const n = times.length;
  const idx: Record<string, number> = {};
  times.forEach((t, i) => { idx[t.id] = i; });

  const placar: ({ gc: number; gv: number } | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  let totPart=0,totManVit=0,totEmp=0,totVisVit=0,totGols=0,totGolsMan=0,totGolsVis=0;

  for (const p of encerradas) {
    const i=idx[p.time_casa_id],j=idx[p.time_visitante_id];
    if(i===undefined||j===undefined) continue;
    placar[i][j]={gc:p.placar_casa,gv:p.placar_visitante};
    totPart++;totGols+=p.placar_casa+p.placar_visitante;totGolsMan+=p.placar_casa;totGolsVis+=p.placar_visitante;
    if(p.placar_casa>p.placar_visitante)totManVit++;else if(p.placar_casa<p.placar_visitante)totVisVit++;else totEmp++;
  }

  const resumo = times.map((_,i)=>{
    let j2=0,v=0,e=0,d=0,gm=0,gs=0;
    for(let j=0;j<n;j++){
      const cm=placar[i][j];
      if(cm){j2++;gm+=cm.gc;gs+=cm.gv;if(cm.gc>cm.gv)v++;else if(cm.gc<cm.gv)d++;else e++;}
      const cv=placar[j][i];
      if(cv){j2++;gm+=cv.gv;gs+=cv.gc;if(cv.gv>cv.gc)v++;else if(cv.gv<cv.gc)d++;else e++;}
    }
    return {j:j2,v,e,d,gm,gs,pts:v*3+e};
  });

  const stats=[
    {l:'Partidas',v:totPart},
    {l:'Vit. mandante',v:totManVit,cor:'#1a7a40'},
    {l:'Empates',v:totEmp},
    {l:'Vit. visitante',v:totVisVit,cor:'#a81a1a'},
    {l:'Total de gols',v:totGols},
    {l:'Gols mandante',v:totGolsMan},
    {l:'Gols visitante',v:totGolsVis},
  ];

  const cellStyle=(gc:number,gv:number):React.CSSProperties=>{
    if(gc>gv) return {color:'#1a5fa8',fontWeight:600};
    if(gc<gv) return {color:'#a81a1a',fontWeight:600};
    return {color:'var(--text-muted)'};
  };

  const th:React.CSSProperties={border:'1px solid #2a2a2a',textAlign:'center',padding:'2px 1px',fontSize:9,background:'var(--surface2)',color:'var(--text-muted)',whiteSpace:'nowrap',fontFamily:"'Bebas Neue',sans-serif",letterSpacing:'.05em'};
  const td:React.CSSProperties={border:'1px solid #222',textAlign:'center',padding:'2px 0',fontSize:10,lineHeight:1.3};

  return (
    <div style={{paddingBottom:'4rem'}}>
      <div style={{background:'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)',borderBottom:'1px solid var(--border)',padding:'2rem 0 1.5rem',marginBottom:'1.5rem'}}>
        <div className="container">
          <p style={{fontSize:'.75rem',color:'var(--verde)',textTransform:'uppercase',letterSpacing:'.2em',fontWeight:700,marginBottom:'.3rem'}}>Quadro de Jogos</p>
          <h1 style={{fontSize:'clamp(2rem,5vw,3.5rem)'}}>Confrontos Diretos</h1>
        </div>
      </div>
      <div className="container">
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginBottom:'1.5rem'}}>
          {stats.map(s=>(
            <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
              <div style={{fontSize:'.68rem',color:'var(--text-muted)',marginBottom:3,lineHeight:1.2}}>{s.l}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:s.cor??'var(--amarelo)',lineHeight:1}}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:16,marginBottom:10,fontSize:'.72rem',color:'var(--text-muted)',flexWrap:'wrap'}}>
          <span><span style={{color:'#1a5fa8',fontWeight:700}}>2×0</span> Vitória mandante</span>
          <span><span style={{color:'#a81a1a',fontWeight:700}}>0×2</span> Vitória visitante</span>
          <span><span style={{color:'var(--text-muted)'}}>1×1</span> Empate</span>
          <span style={{marginLeft:'auto'}}>Leitura: Mandante (linha) × Visitante (coluna)</span>
        </div>

        <div style={{overflowX:'auto',borderRadius:8,border:'1px solid var(--border)'}}>
          <table style={{borderCollapse:'collapse',tableLayout:'fixed',minWidth:900}}>
            <colgroup>
              <col style={{width:36}} />
              {times.map(t=><col key={t.id} style={{width:36}} />)}
              {['P','V','E','D','GM','GS','Pts'].map(h=><col key={h} style={{width:30}} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{...th,fontSize:8}}>↓Casa / Vis→</th>
                {times.map(t=>(
                  <th key={t.id} style={{...th,writingMode:'vertical-rl',transform:'rotate(180deg)',height:56,verticalAlign:'bottom',padding:'4px 1px',fontSize:9}}>{t.id}</th>
                ))}
                {['P','V','E','D','GM','GS','Pts'].map(h=>(
                  <th key={h} style={{...th,background:'#1a2a1a',color:'var(--verde)',writingMode:'vertical-rl',transform:'rotate(180deg)',height:56,verticalAlign:'bottom',padding:'4px 1px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time,i)=>{
                const r=resumo[i];
                return (
                  <tr key={time.id} style={{background:i%2===0?'var(--surface)':'var(--surface2)'}}>
                    <td style={{...td,background:'var(--surface2)',fontFamily:"'Bebas Neue',sans-serif",fontSize:10,fontWeight:600,letterSpacing:'.04em',position:'sticky',left:0,zIndex:1,color:'var(--text)'}}>{time.id}</td>
                    {times.map((_,j)=>{
                      if(i===j) return <td key={j} style={{...td,background:'#1a1a1a'}}>—</td>;
                      const p=placar[i][j];
                      if(!p) return <td key={j} style={{...td,color:'#333'}}></td>;
                      return <td key={j} style={{...td,...cellStyle(p.gc,p.gv)}}>{p.gc}×{p.gv}</td>;
                    })}
                    <td style={{...td,background:'#111',color:'var(--text-muted)'}}>{r.j}</td>
                    <td style={{...td,background:'#111',color:'#22c55e',fontWeight:600}}>{r.v}</td>
                    <td style={{...td,background:'#111',color:'var(--text-muted)'}}>{r.e}</td>
                    <td style={{...td,background:'#111',color:'#ef4444',fontWeight:600}}>{r.d}</td>
                    <td style={{...td,background:'#111',color:'var(--text-muted)'}}>{r.gm}</td>
                    <td style={{...td,background:'#111',color:'var(--text-muted)'}}>{r.gs}</td>
                    <td style={{...td,background:'#0d1a0d',color:'var(--amarelo)',fontFamily:"'Bebas Neue',sans-serif",fontSize:12}}>{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{marginTop:'1.5rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          {[{titulo:'📋 Resumo como Mandante',isCasa:true},{titulo:'✈️ Resumo como Visitante',isCasa:false}].map(({titulo,isCasa})=>(
            <div key={titulo} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'10px 14px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1rem',color:'var(--amarelo)'}}>{titulo}</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
                <thead>
                  <tr style={{background:'var(--surface2)'}}>
                    {['Time','J','V','E','D','GM','GS','Pts'].map(h=>(
                      <th key={h} style={{padding:'4px 6px',textAlign:h==='Time'?'left':'center',color:'var(--text-muted)',fontWeight:600,fontSize:'.72rem',borderBottom:'1px solid var(--border)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time,i)=>{
                    let j2=0,v=0,e=0,d=0,gm=0,gs=0;
                    for(let j=0;j<n;j++){
                      const p=isCasa?placar[i][j]:placar[j][i];
                      if(!p) continue;
                      j2++;
                      const gcT=isCasa?p.gc:p.gv,gvT=isCasa?p.gv:p.gc;
                      gm+=gcT;gs+=gvT;
                      if(gcT>gvT)v++;else if(gcT<gvT)d++;else e++;
                    }
                    if(j2===0) return null;
                    return (
                      <tr key={time.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                        <td style={{padding:'4px 6px',fontFamily:"'Bebas Neue',sans-serif",letterSpacing:'.04em',color:'var(--text)'}}>{time.id}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'var(--text-muted)'}}>{j2}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'#22c55e',fontWeight:600}}>{v}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'var(--text-muted)'}}>{e}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'#ef4444',fontWeight:600}}>{d}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'var(--text-muted)'}}>{gm}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',color:'var(--text-muted)'}}>{gs}</td>
                        <td style={{textAlign:'center',padding:'4px 4px',fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:'var(--amarelo)'}}>{v*3+e}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
