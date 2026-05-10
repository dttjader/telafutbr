import { calcularTabela, getTimes } from '@/lib/data';
import { EscudoTime } from '@/components/EscudoTime';

export const dynamic = 'force-dynamic';

export default async function TabelaPage() {
  const [tabela, times] = await Promise.all([calcularTabela(), getTimes()]);

  const zonaColor: Record<string,string> = { libertadores:'var(--libertadores)', sulamericana:'var(--sulamericana)', rebaixamento:'var(--rebaixamento)', neutro:'transparent' };
  const zona = (pos: number) => pos<=5?'libertadores':pos<=11?'sulamericana':pos>=17?'rebaixamento':'neutro';

  return (
    <div style={{paddingBottom:'4rem'}}>
      <div style={{background:'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)',borderBottom:'1px solid var(--border)',padding:'2.5rem 0 2rem',marginBottom:'2rem'}}>
        <div className="container">
          <p style={{fontSize:'.75rem',color:'var(--verde)',textTransform:'uppercase',letterSpacing:'.2em',fontWeight:700,marginBottom:'.4rem'}}>Classificação Geral</p>
          <h1 style={{fontSize:'clamp(2.5rem,6vw,4rem)'}}>Tabela</h1>
        </div>
      </div>
      <div className="container">
        <div style={{display:'flex',gap:'1.25rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
          {[['libertadores','Libertadores (Top 5)'],['sulamericana','Sul-Americana (6º–11º)'],['rebaixamento','Rebaixamento (17º–20º)']].map(([z,l])=>(
            <span key={z} style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'.75rem',color:'var(--text-muted)'}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:zonaColor[z],display:'inline-block'}} />{l}
            </span>
          ))}
        </div>
        <div style={{overflowX:'auto',borderRadius:12,border:'1px solid var(--border)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.875rem'}}>
            <thead style={{background:'var(--surface2)',borderBottom:'2px solid var(--verde)'}}>
              <tr>
                {['#','Time','P','J','V','E','D','GP','GC','SG'].map(h=>(
                  <th key={h} style={{padding:'.7rem .9rem',textAlign:h==='Time'?'left':'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:'.9rem',letterSpacing:'.08em',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map(row=>{
                const z=zona(row.posicao);
                const t=times.find(t=>t.id===row.time_id);
                return (
                  <tr key={row.time_id} style={{borderBottom:'1px solid #1e1e1e'}}>
                    <td style={{padding:'.6rem .9rem'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
                        <span style={{width:3,height:22,borderRadius:2,background:zonaColor[z],display:'inline-block'}} />
                        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.1rem'}}>{row.posicao}</span>
                      </div>
                    </td>
                    <td style={{padding:'.6rem .9rem'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.6rem',whiteSpace:'nowrap'}}>
                        <EscudoTime time={t ?? undefined} size={30} />
                        <span style={{fontWeight:600}}>{t?.nome}</span>
                      </div>
                    </td>
                    <td style={{textAlign:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--amarelo)',padding:'.6rem .9rem'}}>{row.pontos}</td>
                    <td style={{textAlign:'center',padding:'.6rem .9rem'}}>{row.jogos}</td>
                    <td style={{textAlign:'center',color:'var(--libertadores)',fontWeight:600,padding:'.6rem .9rem'}}>{row.vitorias}</td>
                    <td style={{textAlign:'center',padding:'.6rem .9rem'}}>{row.empates}</td>
                    <td style={{textAlign:'center',color:'var(--rebaixamento)',fontWeight:600,padding:'.6rem .9rem'}}>{row.derrotas}</td>
                    <td style={{textAlign:'center',padding:'.6rem .9rem'}}>{row.gols_pro}</td>
                    <td style={{textAlign:'center',padding:'.6rem .9rem'}}>{row.gols_contra}</td>
                    <td style={{textAlign:'center',fontWeight:600,padding:'.6rem .9rem',color:row.saldo>0?'var(--libertadores)':row.saldo<0?'var(--rebaixamento)':'inherit'}}>
                      {row.saldo>0?`+${row.saldo}`:row.saldo}
                    </td>
                  </tr>
                );
              })}
              {tabela.length===0&&<tr><td colSpan={10} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>Nenhuma partida encerrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
