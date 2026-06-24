import { createClient } from '@/utils/supabase/server'

export const revalidate = 0

interface Jogo {
  id: string | number
  time_casa_id: number
  time_visitante_id: number
  placar_casa: number | null
  placar_visitante: number | null
  status: string
  data: string
  hora: string
  rodada: number
  times_casa: { nome: string; sigla: string; escudo?: string }
  times_visitante: { nome: string; sigla: string; escudo?: string }
}

interface Time {
  id: number
  nome: string
  sigla: string
  escudo?: string
}

const homeShadeBg: Record<number, string> = {
  0: 'rgba(0, 128, 0, 0.55)',
  1: 'rgba(0, 128, 0, 0.45)',
  2: 'rgba(0, 128, 0, 0.35)',
  3: 'rgba(0, 128, 0, 0.25)',
  4: 'rgba(0, 128, 0, 0.15)',
}

function corCelula(v: number, ehCasa: boolean) {
  if (v > 0) return ehCasa ? 'rgba(0, 128, 0, 0.55)' : 'rgba(255, 0, 0, 0.55)'
  if (v < 0) return ehCasa ? 'rgba(255, 0, 0, 0.55)' : 'rgba(0, 128, 0, 0.55)'
  return 'rgba(128, 128, 128, 0.35)'
}

export default async function Confrontos2026() {
  const supabase = await createClient()

  const { data: jogos } = await supabase
    .from('jogos')
    .select(
      'id, time_casa_id, time_visitante_id, placar_casa, placar_visitante, status, data, hora, rodada, times_casa:nome, times_visitante:nome'
    )
    .eq('temporada', '2026')
    .order('data', { ascending: true })
    .order('hora', { ascending: true })

  const { data: times } = await supabase.from('times').select('id, nome, sigla, escudo').order('nome')

  const listaJogos: Jogo[] = (jogos as unknown as Jogo[]) ?? []
  const listaTimes: Time[] = times ?? []

  const encerradas = listaJogos.filter((j) => j.status === 'encerrada')
  const naoEncerradas = listaJogos.filter((j) => j.status !== 'encerrada')

  const vitoriasCasa = encerradas.filter((j) => (j.placar_casa ?? 0) > (j.placar_visitante ?? 0)).length
  const empates = encerradas.filter((j) => (j.placar_casa ?? 0) === (j.placar_visitante ?? 0)).length
  const vitoriasFora = encerradas.filter((j) => (j.placar_casa ?? 0) < (j.placar_visitante ?? 0)).length
  const golsCasa = encerradas.reduce((s, j) => s + (j.placar_casa ?? 0), 0)
  const golsFora = encerradas.reduce((s, j) => s + (j.placar_visitante ?? 0), 0)
  const totalGols = golsCasa + golsFora
  const mediaGols = encerradas.length ? (totalGols / encerradas.length).toFixed(2) : '0.00'

  const timesOrdenados = [...listaTimes].sort((a, b) => a.nome.localeCompare(b.nome))

  const idx: Record<string | number, number> = {}
  timesOrdenados.forEach((t, i) => {
    idx[t.id] = i
    idx[t.sigla] = i
  })

  const ultimas5Casa: Record<number, Map<string, number>> = {}

  timesOrdenados.forEach((timeCasa) => {
    const jogosCasa = listaJogos
      .filter(
        (j) =>
          j.time_casa_id === timeCasa.id &&
          j.status === 'encerrada' &&
          j.placar_casa !== null &&
          j.placar_visitante !== null
      )
      .sort((a, b) => {
        const da = new Date(`${a.data}T${a.hora || '00:00'}`).getTime()
        const db = new Date(`${b.data}T${b.hora || '00:00'}`).getTime()
        return db - da
      })
      .slice(0, 5)

    const map = new Map<string, number>()
    jogosCasa.forEach((j, index) => {
      const visitante = listaTimes.find((t) => t.id === j.time_visitante_id)
      if (visitante) {
        map.set(String(visitante.id), index)
      }
    })

    ultimas5Casa[timeCasa.id] = map
  })

  const matrizSaldoCasa: (number | null)[][] = Array(timesOrdenados.length)
    .fill(null)
    .map(() => Array(timesOrdenados.length).fill(null))
  const matrizSaldoFora: (number | null)[][] = Array(timesOrdenados.length)
    .fill(null)
    .map(() => Array(timesOrdenados.length).fill(null))
  const matrizPontos: (number | null)[][] = Array(timesOrdenados.length)
    .fill(null)
    .map(() => Array(timesOrdenados.length).fill(null))
  const matrizGols: (number | null)[][] = Array(timesOrdenados.length)
    .fill(null)
    .map(() => Array(timesOrdenados.length).fill(null))

  encerradas.forEach((j) => {
    const iCasa = idx[j.time_casa_id]
    const iFora = idx[j.time_visitante_id]
    if (iCasa === undefined || iFora === undefined) return

    const gc = j.placar_casa ?? 0
    const gf = j.placar_visitante ?? 0

    let pontosCasa = 0
    let pontosFora = 0
    if (gc > gf) {
      pontosCasa = 3
    } else if (gc < gf) {
      pontosFora = 3
    } else {
      pontosCasa = 1
      pontosFora = 1
    }

    matrizSaldoCasa[iCasa][iFora] = gc - gf
    matrizSaldoFora[iFora][iCasa] = gf - gc
    matrizPontos[iCasa][iFora] = pontosCasa
    matrizPontos[iFora][iCasa] = pontosFora
    matrizGols[iCasa][iFora] = gc
    matrizGols[iFora][iCasa] = gf
  })

  const resumoCasa = timesOrdenados
    .map((t) => {
      const i = idx[t.id]
      const jogos = matrizSaldoCasa[i].filter((v) => v !== null).length
      const v = matrizSaldoCasa[i].filter((v) => (v ?? 0) > 0).length
      const e = matrizSaldoCasa[i].filter((v) => v === 0).length
      const d = matrizSaldoCasa[i].filter((v) => (v ?? 0) < 0).length
      const gp = matrizGols[i].reduce((s, v) => s + (v ?? 0), 0)
      const gc = matrizGols.map((row) => row[i]).reduce((s, v) => s + (v ?? 0), 0)
      const sg = gp - gc
      const pts = matrizPontos[i].reduce((s, v) => s + (v ?? 0), 0)
      return { time: t, jogos, v, e, d, gp, gc, sg, pts }
    })
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp)

  const resumoFora = timesOrdenados
    .map((t) => {
      const i = idx[t.id]
      const jogos = matrizSaldoFora[i].filter((v) => v !== null).length
      const v = matrizSaldoFora[i].filter((v) => (v ?? 0) > 0).length
      const e = matrizSaldoFora[i].filter((v) => v === 0).length
      const d = matrizSaldoFora[i].filter((v) => (v ?? 0) < 0).length
      const gp = matrizGols.map((row) => row[i]).reduce((s, v) => s + (v ?? 0), 0)
      const gc = matrizGols[i].reduce((s, v) => s + (v ?? 0), 0)
      const sg = gp - gc
      const pts = matrizPontos.map((row) => row[i]).reduce((s, v) => s + (v ?? 0), 0)
      return { time: t, jogos, v, e, d, gp, gc, sg, pts }
    })
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp)

  return (
    <div
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        padding: '24px',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
        rel="stylesheet"
      />

      <h1
        style={{
          fontSize: '42px',
          textAlign: 'center',
          letterSpacing: '2px',
          marginBottom: '24px',
        }}
      >
        CONFRONTOS 2026
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {[
          { label: 'JOGOS', value: encerradas.length + naoEncerradas.length },
          { label: 'ENCERRADOS', value: encerradas.length },
          { label: 'VITÓRIAS CASA', value: vitoriasCasa },
          { label: 'EMPATES', value: empates },
          { label: 'VITÓRIAS FORA', value: vitoriasFora },
          { label: 'GOLS TOTAIS', value: totalGols },
          { label: 'MÉDIA GOLS/JOGO', value: mediaGols },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '16px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', color: '#38bdf8' }}>{stat.value}</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', letterSpacing: '1px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '48px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            minWidth: '900px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  background: '#1e293b',
                  padding: '10px',
                  border: '1px solid #334155',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                }}
              ></th>
              {timesOrdenados.map((t) => (
                <th
                  key={t.id}
                  style={{
                    background: '#1e293b',
                    padding: '10px',
                    border: '1px solid #334155',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    minWidth: '36px',
                  }}
                  title={t.nome}
                >
                  {t.sigla}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timesOrdenados.map((tCasa) => {
              const iCasa = idx[tCasa.id]
              return (
                <tr key={tCasa.id}>
                  <td
                    style={{
                      background: '#1e293b',
                      padding: '10px',
                      border: '1px solid #334155',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                    title={tCasa.nome}
                  >
                    {tCasa.sigla}
                  </td>
                  {timesOrdenados.map((tFora) => {
                    const iFora = idx[tFora.id]
                    const saldo = matrizSaldoCasa[iCasa][iFora]
                    const recencyIdx = ultimas5Casa[tCasa.id]?.get(String(tFora.id))

                    if (iCasa === iFora) {
                      return (
                        <td
                          key={tFora.id}
                          style={{
                            background: '#0f172a',
                            padding: '10px',
                            border: '1px solid #334155',
                            textAlign: 'center',
                          }}
                        >
                          —
                        </td>
                      )
                    }

                    return (
                      <td
                        key={tFora.id}
                        style={{
                          background:
                            recencyIdx !== undefined
                              ? homeShadeBg[recencyIdx]
                              : saldo !== null
                              ? corCelula(saldo, true)
                              : 'transparent',
                          padding: '10px',
                          border: '1px solid #334155',
                          textAlign: 'center',
                          color: saldo !== null ? '#fff' : '#64748b',
                          fontWeight: 'bold',
                          cursor: 'default',
                        }}
                        title={`${tCasa.nome} x ${tFora.nome}`}
                      >
                        {saldo !== null ? (saldo > 0 ? `+${saldo}` : saldo) : '-'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '16px',
              borderBottom: '2px solid #38bdf8',
              paddingBottom: '8px',
            }}
          >
            RESUMO COMO MANDANTE
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                {['#', 'TIME', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'PTS'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumoCasa.map((r, pos) => (
                <tr key={r.time.id} style={{ background: pos % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {pos + 1}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155' }}>{r.time.nome}</td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.jogos}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.v}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.e}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.d}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.gp}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.gc}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.sg > 0 ? `+${r.sg}` : r.sg}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#38bdf8',
                    }}
                  >
                    {r.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '16px',
              borderBottom: '2px solid #f472b6',
              paddingBottom: '8px',
            }}
          >
            RESUMO COMO VISITANTE
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                {['#', 'TIME', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'PTS'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumoFora.map((r, pos) => (
                <tr key={r.time.id} style={{ background: pos % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {pos + 1}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155' }}>{r.time.nome}</td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.jogos}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.v}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.e}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.d}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.gp}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.gc}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                    {r.sg > 0 ? `+${r.sg}` : r.sg}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#f472b6',
                    }}
                  >
                    {r.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
