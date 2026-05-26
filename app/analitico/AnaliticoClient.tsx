'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatJogador } from './page';
import { EscudoTime } from '@/components/EscudoTime';
import { Time } from '@/lib/types';

const POSICAO_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral',
  VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};
const POSICOES = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

interface Props {
  lista: StatJogador[];
  totalPartidas: number;
  times: Time[];
}

type OrdenarPor = 'minutos' | 'partidas' | 'gols' | 'assistencias' | 'amarelos' | 'vermelhos';

export function AnaliticoClient({ lista, totalPartidas, times }: Props) {
  const [filtroTime, setFiltroTime] = useState('');
  const [filtroNac, setFiltroNac] = useState('');
  const [filtroPos, setFiltroPos] = useState('');
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('');
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('');
  const [filtroJogosMin, setFiltroJogosMin] = useState('');
  const [filtroCartao, setFiltroCartao] = useState(''); // 'sem_amarelo' | 'com_amarelo' | 'com_vermelho'
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('minutos');
  const [porPosicao, setPorPosicao] = useState(true);

  const filtrada = useMemo(() => {
    return lista.filter(s => {
      if (filtroTime && s.jogador.time_atual !== filtroTime) return false;
      if (filtroNac && s.jogador.nacionalidade !== filtroNac) return false;
      if (filtroPos && s.jogador.posicao !== filtroPos) return false;
      if (filtroIdadeMin && (s.jogador.idade ?? 0) < +filtroIdadeMin) return false;
      if (filtroIdadeMax && (s.jogador.idade ?? 999) > +filtroIdadeMax) return false;
      if (filtroJogosMin && s.partidas < +filtroJogosMin) return false;
      if (filtroCartao === 'sem_amarelo' && s.cartoes_amarelos > 0) return false;
      if (filtroCartao === 'com_amarelo' && s.cartoes_amarelos === 0) return false;
      if (filtroCartao === 'com_vermelho' && s.cartoes_vermelhos === 0) return false;
      return true;
    }).sort((a, b) => {
      switch (ordenarPor) {
        case 'gols': return b.gols - a.gols || b.minutos - a.minutos;
        case 'assistencias': return b.assistencias - a.assistencias || b.minutos - a.minutos;
        case 'amarelos': return b.cartoes_amarelos - a.cartoes_amarelos;
        case 'vermelhos': return b.cartoes_vermelhos - a.cartoes_vermelhos;
        case 'partidas': return b.partidas - a.partidas;
        default: return b.minutos - a.minutos;
      }
    });
  }, [lista, filtroTime, filtroNac, filtroPos, filtroIdadeMin, filtroIdadeMax, filtroJogosMin, filtroCartao, ordenarPor]);

  const limparFiltros = () => {
    setFiltroTime(''); setFiltroNac(''); setFiltroPos(''); setFiltroIdadeMin(''); setFiltroIdadeMax('');
    setFiltroJogosMin(''); setFiltroCartao('');
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', padding: '.4rem .6rem', fontSize: '.82rem',
  };
  const inputStyle: React.CSSProperties = {
    ...selectStyle, width: 60, textAlign: 'center',
  };

  const TabelaRows = ({ dados }: { dados: StatJogador[] }) => (
    <>
      {dados.map((s, i) => {
        const time = times.find(t => t.id === s.jogador.time_atual);
        const golsMin = s.minutos > 0 ? (s.gols / s.minutos * 90).toFixed(2) : '—';
        const golsSofMin = s.jogador.posicao === 'GOL' && s.minutos > 0
          ? (s.gols_sofridos / s.minutos * 90).toFixed(2) : null;

        return (
          <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
            <td style={{ padding: '.5rem .7rem' }}>
              <Link href={`/analitico/${s.jogador.id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                {s.jogador.nome}
              </Link>
              {s.jogador.numero && <div style={{ fontSize: '.68rem', color: 'var(--verde)' }}>#{s.jogador.numero}</div>}
            </td>
            <td style={{ padding: '.5rem .5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <EscudoTime time={time} size={22} />
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
              </div>
            </td>
            <td style={{ textAlign: 'center', fontSize: '.85rem' }}>
              {s.jogador.nacionalidade === 'Estrangeiro' ? '🌍' : '🇧🇷'}
            </td>
            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
              {s.jogador.idade ?? '—'}
            </td>
            <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem' }}>{s.partidas}</td>
            <td style={{ textAlign: 'center', color: 'var(--verde)' }}>{s.titular}</td>
            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{s.reserva}</td>
            <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{s.minutos}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: s.gols > 0 ? 'var(--libertadores)' : 'var(--text-muted)' }}>{s.gols}</td>
            <td style={{ textAlign: 'center', color: s.gols_contra > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{s.gols_contra || '—'}</td>
            {s.jogador.posicao === 'GOL' ? (
              <>
                <td style={{ textAlign: 'center', color: s.gols_sofridos > 0 ? 'var(--rebaixamento)' : 'var(--libertadores)' }}>{s.gols_sofridos}</td>
                <td style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--text-muted)' }}>{golsSofMin ?? '—'}</td>
              </>
            ) : (
              <>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>
              </>
            )}
            <td style={{ textAlign: 'center', color: s.assistencias > 0 ? '#60a5fa' : 'var(--text-muted)' }}>{s.assistencias || '—'}</td>
            <td style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              {s.gols > 0 ? golsMin : '—'}
            </td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: s.cartoes_amarelos > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{s.cartoes_amarelos || '—'}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: s.cartoes_vermelhos > 0 ? 'var(--rebaixamento)' : 'var(--text-muted)' }}>{s.cartoes_vermelhos || '—'}</td>
            <td style={{ textAlign: 'center', fontSize: '.8rem', color: s.minutos_com_amarelo > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
              {s.minutos_com_amarelo > 0 ? `${s.minutos_com_amarelo}'` : '—'}
            </td>
          </tr>
        );
      })}
    </>
  );

  const Tabela = ({ dados }: { dados: StatJogador[] }) => (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
          <tr>
            {[
              ['Jogador', 'left'], ['Time', 'left'], ['Nac.', 'center'], ['Idade', 'center'],
              ['P', 'center'], ['T', 'center'], ['R', 'center'], ['Min', 'center'],
              ['Gols', 'center'], ['GC', 'center'], ['GS', 'center'], ['GS/90', 'center'],
              ['Ast.', 'center'], ['G/90', 'center'], ['🟨', 'center'], ['🟥', 'center'], ["Min🟨", 'center'],
            ].map(([h, align]) => (
              <th key={h} onClick={() => {
                if (h === 'Min') setOrdenarPor('minutos');
                if (h === 'Gols') setOrdenarPor('gols');
                if (h === 'Ast.') setOrdenarPor('assistencias');
                if (h === '🟨') setOrdenarPor('amarelos');
                if (h === '🟥') setOrdenarPor('vermelhos');
                if (h === 'P') setOrdenarPor('partidas');
              }} style={{
                padding: '.55rem .6rem', textAlign: align as 'left' | 'center',
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '.82rem', letterSpacing: '.06em',
                color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer',
                userSelect: 'none',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0
            ? <tr><td colSpan={17} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogador encontrado com esses filtros.</td></tr>
            : <TabelaRows dados={dados} />
          }
        </tbody>
      </table>
    </div>
  );

  const posicoesPorDados = POSICOES.filter(p => filtrada.some(s => s.jogador.posicao === p));

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '1.5rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>Analítico de Jogadores</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '.4rem', fontSize: '.85rem' }}>
            {filtrada.length} jogador(es) · {totalPartidas} partida(s) encerrada(s)
          </p>
        </div>
      </div>

      <div className="container">
        {/* FILTROS */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.9rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>🔍 Filtros</h3>
            <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>Limpar</button>
          </div>
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} style={selectStyle}>
              <option value="">Todos os times</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <select value={filtroNac} onChange={e => setFiltroNac(e.target.value)} style={selectStyle}>
              <option value="">Todas nac.</option>
              <option value="Brasileiro">🇧🇷 Brasileiro</option>
              <option value="Estrangeiro">🌍 Estrangeiro</option>
            </select>
            <select value={filtroPos} onChange={e => setFiltroPos(e.target.value)} style={selectStyle}>
              <option value="">Todas posições</option>
              {POSICOES.map(p => <option key={p} value={p}>{POSICAO_LABEL[p]}</option>)}
            </select>
            <select value={filtroCartao} onChange={e => setFiltroCartao(e.target.value)} style={selectStyle}>
              <option value="">Todos cartões</option>
              <option value="sem_amarelo">Sem amarelo</option>
              <option value="com_amarelo">Com amarelo</option>
              <option value="com_vermelho">Com vermelho</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              Idade:
              <input type="number" min={14} max={50} placeholder="min" value={filtroIdadeMin} onChange={e => setFiltroIdadeMin(e.target.value)} style={inputStyle} />
              <span>–</span>
              <input type="number" min={14} max={50} placeholder="max" value={filtroIdadeMax} onChange={e => setFiltroIdadeMax(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              Mín. jogos:
              <input type="number" min={1} placeholder="Ex: 5" value={filtroJogosMin} onChange={e => setFiltroJogosMin(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Ordenar por:
              <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value as OrdenarPor)} style={selectStyle}>
                <option value="minutos">Minutos</option>
                <option value="partidas">Partidas</option>
                <option value="gols">Gols</option>
                <option value="assistencias">Assistências</option>
                <option value="amarelos">Amarelos</option>
                <option value="vermelhos">Vermelhos</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '.3rem', background: 'var(--surface2)', borderRadius: 6, padding: 3 }}>
              <button onClick={() => setPorPosicao(true)} className="btn btn-sm"
                style={{ background: porPosicao ? 'var(--verde)' : 'transparent', color: porPosicao ? '#fff' : 'var(--text-muted)', border: 'none' }}>
                Por posição
              </button>
              <button onClick={() => setPorPosicao(false)} className="btn btn-sm"
                style={{ background: !porPosicao ? 'var(--verde)' : 'transparent', color: !porPosicao ? '#fff' : 'var(--text-muted)', border: 'none' }}>
                Todos juntos
              </button>
            </div>
          </div>
        </div>

        {/* TABELA */}
        {porPosicao ? (
          posicoesPorDados.map(pos => {
            const dados = filtrada.filter(s => s.jogador.posicao === pos);
            if (dados.length === 0) return null;
            return (
              <section key={pos} style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '.75rem', paddingBottom: '.4rem', borderBottom: '1px solid var(--border)' }}>
                  {POSICAO_LABEL[pos]} <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontFamily: 'Barlow,sans-serif', fontWeight: 400 }}>{dados.length} jogador(es)</span>
                </h2>
                <Tabela dados={dados} />
              </section>
            );
          })
        ) : (
          <Tabela dados={filtrada} />
        )}

        {/* LEGENDA */}
        <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
          <span><strong style={{ color: 'var(--text)' }}>P</strong> Partidas</span>
          <span><strong style={{ color: 'var(--verde)' }}>T</strong> Titular</span>
          <span><strong style={{ color: 'var(--text)' }}>R</strong> Reserva</span>
          <span><strong style={{ color: 'var(--amarelo)' }}>Min</strong> Minutos (45+acréscimos)</span>
          <span><strong>GC</strong> Gols Contra</span>
          <span><strong>GS</strong> Gols Sofridos</span>
          <span><strong>GS/90</strong> Gols Sofridos por 90min</span>
          <span><strong>G/90</strong> Gols Marcados por 90min</span>
          <span><strong>🟨</strong> Amarelos</span>
          <span><strong>🟥</strong> Vermelhos</span>
          <span><strong>Min🟨</strong> Minutos jogados com cartão amarelo</span>
        </div>
      </div>
    </div>
  );
}
