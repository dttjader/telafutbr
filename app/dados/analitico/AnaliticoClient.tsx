'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { EscudoTime } from '@/components/EscudoTime';
import { Time, Jogador } from '@/lib/types';
import { PesoGolItem, StatsOptaAgregado, VinculoJogador } from '@/lib/data';

export interface StatJogador {
  jogador: Jogador;
  timeNome: string;
  timeSigla: string;
  timeCor: string;
  timeCorSec: string;
  partidas: number;
  titular: number;
  reserva: number;
  minutos: number;
  gols: number;
  gols_contra: number;
  gols_sofridos: number; // só goleiros
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  minutos_com_amarelo: number;
  pontuacao_gols: number; // soma do peso dos gols/pênaltis defendidos na pontuação
  stats_opta: StatsOptaAgregado; // soma das estatísticas lançadas na aba Stats de cada partida
  vinculo: VinculoJogador; // cruzamento entre gols/cartões e as estatísticas Opta
}

const POSICAO_LABEL: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral',
  VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};
const POSICOES = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

// Sub-posição: abreviação exibida ao lado do nome
const SUB_POS_LABEL: Record<string, string> = {
  GOL: 'GOL', ZAG: 'ZAG',
  LD: 'LD', LE: 'LE',
  VOL: 'VOL',
  MC: 'MC', MO: 'MO',
  CA: 'CA', PD: 'PD', PE: 'PE',
};

// Retorna true se a sub-posição é "informativa" (diferente do código da posição principal)
const hasSubPos = (sub?: string, pos?: string) =>
  !!sub && sub !== pos && !!SUB_POS_LABEL[sub];

// Nacionalidades
const NAC_FLAG: Record<string, string> = {
  Brasileiro:      '🇧🇷',
  Argentino:       '🇦🇷',
  Uruguaio:        '🇺🇾',
  Chileno:         '🇨🇱',
  Paraguaio:       '🇵🇾',
  Colombiano:      '🇨🇴',
  'Outros Países': '🌍',
};

// Opções do filtro de nacionalidade no Analítico
const NAC_FILTER_OPTS: { value: string; label: string }[] = [
  { value: '',               label: 'Todas nac.' },
  { value: 'Brasileiro',     label: '🇧🇷 Brasileiro' },
  { value: 'Estrangeiro',    label: '🌍 Estrangeiro (todos)' },
  { value: 'Argentino',      label: '🇦🇷 Argentino' },
  { value: 'Uruguaio',       label: '🇺🇾 Uruguaio' },
  { value: 'Chileno',        label: '🇨🇱 Chileno' },
  { value: 'Paraguaio',      label: '🇵🇾 Paraguaio' },
  { value: 'Colombiano',     label: '🇨🇴 Colombiano' },
  { value: 'Outros Países',  label: '🌍 Outros Países' },
];

const ESTRANGEIROS = ['Argentino','Uruguaio','Chileno','Paraguaio','Colombiano','Outros Países'];

interface Props {
  lista: StatJogador[];
  totalPartidas: number;
  times: Time[];
  pesoGols: PesoGolItem[];
}

type OrdenarPor = 'minutos' | 'partidas' | 'gols' | 'assistencias' | 'amarelos' | 'vermelhos';
type OrdenarOptaPor = keyof Omit<StatsOptaAgregado, 'partidas_com_stats'> | 'partidas_com_stats';

// ── Helpers de formatação de índices ─────────────────────────────────────────
// Retorna '—' quando o denominador é zero/negativo (evita divisão por zero e
// índices sem sentido quando não há volume suficiente de dados).
function formatPct(num: number, den: number): string {
  if (den <= 0) return '—';
  return `${((num / den) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// ── Sub-componente: tabela de uma faixa de peso ──────────────────────────────
// Hoisted (fora do componente principal) para não ser recriado a cada
// re-render do AnaliticoClient.
function GrupoPesoTable({
  titulo, faixaDesc, cor, itens, expandido, onToggle,
}: {
  titulo: string;
  faixaDesc: string;
  cor: string;
  itens: PesoGolItem[];
  expandido: boolean;
  onToggle: () => void;
}) {
  const LIMITE = 15;
  const exibidos = expandido ? itens : itens.slice(0, LIMITE);

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.6rem', marginBottom: '.6rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.15rem', color: cor }}>{titulo}</h3>
        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{faixaDesc} · {itens.length} registro(s)</span>
      </div>

      {itens.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', padding: '.5rem 0 1rem' }}>Nenhum registro nesta faixa.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: `2px solid ${cor}` }}>
                <tr>
                  {['Peso', 'Rodada', 'Partida', 'Jogador', 'Time', 'Tipo', 'Min.'].map(h => (
                    <th key={h} style={{
                      padding: '.55rem .75rem',
                      textAlign: h === 'Jogador' ? 'left' : 'center',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: '.85rem',
                      letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exibidos.map((it, i) => (
                  <tr key={`${it.tipo}-${it.id}-${it.jogadorId}`} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                    <td style={{
                      textAlign: 'center', padding: '.5rem .5rem',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem',
                      color: cor,
                    }}>
                      {it.peso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center', padding: '.5rem' }}>{it.rodada}</td>
                    <td style={{ textAlign: 'center', padding: '.5rem', whiteSpace: 'nowrap' }}>
                      <Link href={`/partida/${it.partidaId}`} style={{ color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)' }}>
                        {it.mandanteSigla} {it.placarCasa}×{it.placarVisitante} {it.visitanteSigla}
                      </Link>
                    </td>
                    <td style={{ padding: '.5rem .75rem', fontWeight: 600 }}>{it.jogadorNome}</td>
                    <td style={{ textAlign: 'center', padding: '.5rem', color: 'var(--text-muted)' }}>{it.timeSigla}</td>
                    <td style={{ textAlign: 'center', padding: '.5rem' }}>
                      <span style={{
                        fontSize: '.68rem', padding: '.15rem .45rem', borderRadius: 4,
                        background: it.tipo === 'penalti_defendido' ? 'rgba(96,165,250,.12)' : 'rgba(255,223,0,.1)',
                        color: it.tipo === 'penalti_defendido' ? '#60a5fa' : 'var(--amarelo)',
                        border: `1px solid ${it.tipo === 'penalti_defendido' ? 'rgba(96,165,250,.3)' : 'rgba(255,223,0,.25)'}`,
                      }}>
                        {it.tipo === 'penalti_defendido' ? '🧤 Defesa' : '⚽ Gol'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '.5rem', color: 'var(--text-muted)' }}>
                      {it.minuto}{it.acrescimo > 0 ? `+${it.acrescimo}` : ''}&apos;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {itens.length > LIMITE && (
            <div style={{ textAlign: 'center', marginTop: '.75rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={onToggle}>
                {expandido ? 'Mostrar menos' : `Mostrar todos (${itens.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-componente: tabela de Estatísticas Opta ──────────────────────────────
// Hoisted pelo mesmo motivo do GrupoPesoTable acima.
function StatsOptaTable({ dados, times }: { dados: StatJogador[]; times: Time[] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
          <tr>
            {['Jogador', 'Time', 'Jogos', 'S', 'SoT', 'SB', 'P', 'C', 'Crn', 'Tk', 'Off', 'FC', 'FS', 'Sav'].map(h => (
              <th key={h} style={{
                padding: '.55rem .6rem',
                textAlign: (h === 'Jogador' || h === 'Time') ? 'left' : 'center',
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '.82rem',
                letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr>
              <td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Nenhum jogador com estatísticas Opta registradas para os filtros atuais.
              </td>
            </tr>
          ) : dados.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            const o = s.stats_opta;
            return (
              <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                <td style={{ padding: '.5rem .6rem', fontWeight: 600 }}>{s.jogador.nome}</td>
                <td style={{ padding: '.5rem .6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <EscudoTime time={time} size={20} />
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)' }}>{o.partidas_com_stats}</td>
                <td style={{ textAlign: 'center' }}>{o.S || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.SoT || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.SB || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{o.P || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.C || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.Crn || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.Tk || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.Off || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.FC || '—'}</td>
                <td style={{ textAlign: 'center' }}>{o.FS || '—'}</td>
                <td style={{ textAlign: 'center', color: o.Sav > 0 ? 'var(--verde)' : 'var(--text-muted)', fontWeight: o.Sav > 0 ? 600 : 400 }}>{o.Sav || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Sub-componentes: tabelas de Vínculos e Índices ───────────────────────────
// OBS: as tabelas de SAV% (Goleiros), Eficiência de Finalização (S/SoT/SB →
// Artilharia) e Faltas/Desarmes (FC/FS/Tk → Cartões) foram migradas para as
// respectivas abas. Aqui ficam apenas os vínculos que ainda não têm um lar
// próprio: Escanteios/Cruzamentos → assistências de cabeça, e Passes/90.

function EscanteiosCruzamentoTable({ dados, times }: { dados: StatJogador[]; times: Time[] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
          <tr>
            {['Jogador', 'Time', 'Crn', 'Assist. Escanteio', 'Índice', 'C', 'Assist. Cruzamento', 'Índice'].map(h => (
              <th key={h} style={{
                padding: '.55rem .6rem',
                textAlign: (h === 'Jogador' || h === 'Time') ? 'left' : 'center',
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '.8rem',
                letterSpacing: '.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogador com escanteios ou cruzamentos registrados.</td></tr>
          ) : dados.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            const o = s.stats_opta;
            const v = s.vinculo;
            return (
              <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                <td style={{ padding: '.5rem .6rem', fontWeight: 600 }}>{s.jogador.nome}</td>
                <td style={{ padding: '.5rem .6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <EscudoTime time={time} size={20} />
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>{o.Crn || '—'}</td>
                <td style={{ textAlign: 'center', color: v.assist_gol_escanteio > 0 ? 'var(--verde)' : 'var(--text-muted)' }}>{v.assist_gol_escanteio || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#a78bfa' }}>{formatPct(v.assist_gol_escanteio, o.Crn)}</td>
                <td style={{ textAlign: 'center' }}>{o.C || '—'}</td>
                <td style={{ textAlign: 'center', color: v.assist_gol_cruzamento > 0 ? 'var(--verde)' : 'var(--text-muted)' }}>{v.assist_gol_cruzamento || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#a78bfa' }}>{formatPct(v.assist_gol_cruzamento, o.C)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tabela de Passes por 90 Minutos + Passes por Minuto (raw, sem converter
// para base de 90). Passes/90 e Passes/Minuto seguem exatamente a mesma
// ordenação (um é múltiplo escalar do outro) — por isso a mesma lista já
// ordenada (dadosPasses90) serve para as duas colunas.
function PassesPorNoventaTable({ dados, times }: { dados: StatJogador[]; times: Time[] }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
        <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--verde)' }}>
          <tr>
            {['Jogador', 'Time', 'Passes (P)', 'Minutos', 'Passes/90', 'Passes/Minutos'].map(h => (
              <th key={h} style={{
                padding: '.55rem .6rem',
                textAlign: (h === 'Jogador' || h === 'Time') ? 'left' : 'center',
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '.82rem',
                letterSpacing: '.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogador com passes registrados.</td></tr>
          ) : dados.map((s, i) => {
            const time = times.find(t => t.id === s.jogador.time_atual);
            const o = s.stats_opta;
            const porMinuto = s.minutos > 0 ? o.P / s.minutos : 0;
            const p90 = porMinuto * 90;
            return (
              <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                <td style={{ padding: '.5rem .6rem', fontWeight: 600 }}>{s.jogador.nome}</td>
                <td style={{ padding: '.5rem .6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <EscudoTime time={time} size={20} />
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{o.P || '—'}</td>
                <td style={{ textAlign: 'center', color: 'var(--amarelo)' }}>{s.minutos}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#a78bfa' }}>
                  {p90.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#a78bfa' }}>
                  {porMinuto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AnaliticoClient({ lista, totalPartidas, times, pesoGols }: Props) {
  const [filtroTime, setFiltroTime] = useState('');
  const [filtroNac, setFiltroNac] = useState('');
  const [filtroPos, setFiltroPos] = useState('');
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('');
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('');
  const [filtroJogosMin, setFiltroJogosMin] = useState('');
  const [filtroCartao, setFiltroCartao] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('minutos');
  const [porPosicao, setPorPosicao] = useState(true);

  // ── Peso dos Gols na Pontuação ────────────────────────────────────────────
  const [filtroTipoPeso, setFiltroTipoPeso] = useState<'todos' | 'gol' | 'penalti_defendido'>('todos');
  const [expandidoGrupo, setExpandidoGrupo] = useState<Record<string, boolean>>({});
  const toggleGrupo = (key: string) => setExpandidoGrupo(e => ({ ...e, [key]: !e[key] }));

  // ── Estatísticas Avançadas (Opta) ─────────────────────────────────────────
  const [ordenarOpta, setOrdenarOpta] = useState<OrdenarOptaPor>('P');

  const pesoPorTipo = useMemo(() => {
    return filtroTipoPeso === 'todos' ? pesoGols : pesoGols.filter(it => it.tipo === filtroTipoPeso);
  }, [pesoGols, filtroTipoPeso]);

  const gruposPeso = useMemo(() => {
    const alta: PesoGolItem[] = [];
    const media: PesoGolItem[] = [];
    const baixa: PesoGolItem[] = [];
    const zero: PesoGolItem[] = [];
    for (const it of pesoPorTipo) {
      if (it.peso === 0) zero.push(it);
      else if (it.peso > 1.5) alta.push(it);
      else if (it.peso === 1.5 || it.peso === 1) media.push(it);
      else baixa.push(it);
    }
    return { alta, media, baixa, zero };
  }, [pesoPorTipo]);

  const filtrada = useMemo(() => {
    return lista.filter(s => {
      if (filtroTime && s.jogador.time_atual !== filtroTime) return false;
      if (filtroNac) {
        const nac = s.jogador.nacionalidade ?? 'Brasileiro';
        if (filtroNac === 'Estrangeiro') {
          if (!ESTRANGEIROS.includes(nac)) return false;
        } else {
          if (nac !== filtroNac) return false;
        }
      }
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

  // Mesma base filtrada acima, restrita a quem tem estatísticas Opta lançadas
  // e ordenada pela coluna Opta escolhida.
  const filtradaOpta = useMemo(() => {
    return [...filtrada]
      .filter(s => s.stats_opta.partidas_com_stats > 0)
      .sort((a, b) => b.stats_opta[ordenarOpta] - a.stats_opta[ordenarOpta]);
  }, [filtrada, ordenarOpta]);

  // ── Bases para as tabelas de Vínculos e Índices ───────────────────────────
  const dadosEscanteiosCruz = useMemo(() =>
    [...filtrada]
      .filter(s => s.stats_opta.Crn > 0 || s.stats_opta.C > 0)
      .sort((a, b) => (b.stats_opta.Crn + b.stats_opta.C) - (a.stats_opta.Crn + a.stats_opta.C)),
    [filtrada]);

  const dadosPasses90 = useMemo(() =>
    [...filtrada]
      .filter(s => s.stats_opta.P > 0 && s.minutos > 0)
      .sort((a, b) => (b.stats_opta.P / b.minutos) - (a.stats_opta.P / a.minutos)),
    [filtrada]);

  const limparFiltros = () => {
    setFiltroTime(''); setFiltroNac(''); setFiltroPos('');
    setFiltroIdadeMin(''); setFiltroIdadeMax('');
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
        const nac = s.jogador.nacionalidade ?? 'Brasileiro';
        const nacFlag = NAC_FLAG[nac] ?? '🌍';
        const subPos = s.jogador.sub_posicao;
        const showSubPos = hasSubPos(subPos, s.jogador.posicao);

        return (
          <tr key={s.jogador.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
            <td style={{ padding: '.5rem .7rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                <Link href={`/dados/analitico/${s.jogador.id}`} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--verde)', paddingBottom: 1 }}>
                  {s.jogador.nome}
                </Link>
                {/* Sub-posição ao lado do nome */}
                {showSubPos && (
                  <span style={{
                    fontSize: '.65rem', padding: '.05rem .3rem', borderRadius: 3,
                    background: 'rgba(0,168,79,.14)', color: 'var(--verde)',
                    border: '1px solid rgba(0,168,79,.25)', fontWeight: 700,
                    letterSpacing: '.04em', lineHeight: 1.4,
                  }}>
                    {SUB_POS_LABEL[subPos!]}
                  </span>
                )}
              </div>
              {s.jogador.numero && (
                <div style={{ fontSize: '.68rem', color: 'var(--verde)' }}>#{s.jogador.numero}</div>
              )}
            </td>
            <td style={{ padding: '.5rem .5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <EscudoTime time={time} size={22} />
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.timeSigla}</span>
              </div>
            </td>
            <td style={{ textAlign: 'center', fontSize: '.85rem' }} title={nac}>
              {nacFlag}
            </td>
            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
              {s.jogador.idade ?? '—'}
            </td>
            <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.05rem' }}>{s.partidas}</td>
            <td style={{ textAlign: 'center', color: 'var(--verde)' }}>{s.titular}</td>
            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{s.reserva}</td>
            <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: 'var(--amarelo)' }}>{s.minutos}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: s.gols > 0 ? 'var(--libertadores)' : 'var(--text-muted)' }}>{s.gols}</td>
            <td style={{ textAlign: 'center', fontWeight: 600, color: s.pontuacao_gols > 0 ? '#a78bfa' : 'var(--text-muted)' }}>
              {s.pontuacao_gols > 0 ? s.pontuacao_gols.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </td>
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
              ['Gols', 'center'], ['Pts', 'center'], ['GC', 'center'], ['GS', 'center'], ['GS/90', 'center'],
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
            ? <tr><td colSpan={18} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogador encontrado com esses filtros.</td></tr>
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

            {/* Filtro de nacionalidade expandido */}
            <select value={filtroNac} onChange={e => setFiltroNac(e.target.value)} style={selectStyle}>
              {NAC_FILTER_OPTS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
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
                  {POSICAO_LABEL[pos]}{' '}
                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontFamily: 'Barlow,sans-serif', fontWeight: 400 }}>
                    {dados.length} jogador(es)
                  </span>
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
          <span><strong style={{ color: '#a78bfa' }}>Pts</strong> Soma do peso dos gols/pênaltis defendidos na pontuação das partidas</span>
          <span><strong>GC</strong> Gols Contra</span>
          <span><strong>GS</strong> Gols Sofridos</span>
          <span><strong>GS/90</strong> Gols Sofridos por 90min</span>
          <span><strong>G/90</strong> Gols Marcados por 90min</span>
          <span><strong>🟨</strong> Amarelos</span>
          <span><strong>🟥</strong> Vermelhos</span>
          <span><strong>Min🟨</strong> Minutos jogados com cartão amarelo</span>
          <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '.75rem' }}>
            Sub-posições: <strong style={{ color: 'var(--verde)' }}>LD/LE</strong> Lateral ·{' '}
            <strong style={{ color: 'var(--verde)' }}>MC/MO</strong> Meia ·{' '}
            <strong style={{ color: 'var(--verde)' }}>CA/PD/PE</strong> Atacante
          </span>
        </div>

        {/* 📈 Estatísticas Avançadas (Opta) */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📈 Estatísticas Avançadas (Opta)
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 760 }}>
            Soma de todas as partidas encerradas em que o jogador teve estatísticas lançadas na aba &quot;Stats&quot;
            (Admin → Partida → Eventos → Stats). A tabela abaixo respeita os filtros da seção acima e mostra apenas
            jogadores com ao menos uma partida com estatística registrada.
          </p>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Ordenar por:</span>
            <select value={ordenarOpta} onChange={e => setOrdenarOpta(e.target.value as OrdenarOptaPor)} style={selectStyle}>
              <option value="P">Passes</option>
              <option value="S">Finalizações</option>
              <option value="SoT">Finalizações no Alvo</option>
              <option value="SB">Finalizações Bloqueadas</option>
              <option value="C">Cruzamentos</option>
              <option value="Crn">Escanteios a favor</option>
              <option value="Tk">Desarmes</option>
              <option value="Off">Impedimentos</option>
              <option value="FC">Faltas Cometidas</option>
              <option value="FS">Faltas Sofridas</option>
              <option value="Sav">Defesas</option>
              <option value="partidas_com_stats">Partidas com stats</option>
            </select>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {filtradaOpta.length} jogador(es) com estatística registrada
            </span>
          </div>

          <StatsOptaTable dados={filtradaOpta} times={times} />

          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
            <span><strong>S</strong> Finalizações</span>
            <span><strong>SoT</strong> Finalizações no Alvo</span>
            <span><strong>SB</strong> Finalizações Bloqueadas</span>
            <span><strong>P</strong> Passes</span>
            <span><strong>C</strong> Cruzamentos</span>
            <span><strong>Crn</strong> Escanteios a favor</span>
            <span><strong>Tk</strong> Desarmes</span>
            <span><strong>Off</strong> Impedimentos</span>
            <span><strong>FC</strong> Faltas Cometidas</span>
            <span><strong>FS</strong> Faltas Sofridas</span>
            <span><strong>Sav</strong> Defesas (somente Goleiros)</span>
          </div>
        </section>

        {/* 🔗 Vínculos e Índices */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            🔗 Vínculos e Índices
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 780 }}>
            Cruza as estatísticas Opta com os gols já registrados nas partidas. Os índices de SAV% (Goleiros),
            Eficiência de Finalização (Artilharia) e Faltas/Desarmes (Cartões) foram migrados para as respectivas
            abas — veja em <Link href="/dados/goleiros" style={{ color: 'var(--verde)' }}>Goleiros</Link>,{' '}
            <Link href="/dados/artilharia" style={{ color: 'var(--verde)' }}>Artilharia</Link> e{' '}
            <Link href="/dados/cartoes" style={{ color: 'var(--verde)' }}>Cartões</Link>.
          </p>

          {/* Escanteios e Cruzamentos */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--verde)', marginBottom: '.4rem' }}>🚩 Escanteios e Cruzamentos → Assistências de Cabeça</h3>
            <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
              Índice = assistências em gols de cabeça originados do escanteio/cruzamento ÷ total de escanteios (Crn) ou cruzamentos (C) do jogador.
            </p>
            <EscanteiosCruzamentoTable dados={dadosEscanteiosCruz} times={times} />
          </div>

          {/* Passes por 90 minutos + Passes por Minuto */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--verde)', marginBottom: '.4rem' }}>🎯 Passes por 90 Minutos</h3>
            <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
              Passes/90 = (total de passes ÷ minutos jogados) × 90. Passes/Minutos = total de passes ÷ minutos
              jogados, sem converter para a base de 90 minutos.
            </p>
            <PassesPorNoventaTable dados={dadosPasses90} times={times} />
          </div>
        </section>

        {/* ⚖️ Peso dos Gols na Pontuação */}
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            ⚖️ Peso dos Gols na Pontuação
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 760 }}>
            Mede o quanto cada gol (ou pênalti defendido) valeu na pontuação da partida. Numa vitória, os gols do time vencedor dividem entre si os 3 pontos; num empate, cada time divide seu 1 ponto entre os próprios gols; gols do perdedor valem 0. Um pênalti defendido não altera o placar, mas &quot;resgata&quot; a diferença de pontos que o time do goleiro perderia se o pênalti tivesse sido convertido.
          </p>

          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['todos', 'Todos'],
              ['gol', '⚽ Gols'],
              ['penalti_defendido', '🧤 Pênaltis Defendidos'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFiltroTipoPeso(v as 'todos' | 'gol' | 'penalti_defendido')}
                className={`btn btn-sm ${filtroTipoPeso === v ? 'btn-primary' : 'btn-ghost'}`}
              >
                {l}
              </button>
            ))}
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {pesoPorTipo.length} registro(s) no total
            </span>
          </div>

          <GrupoPesoTable
            titulo="🔥 Alto Impacto"
            faixaDesc="peso acima de 1,50 até 3,00"
            cor="#ef4444"
            itens={gruposPeso.alta}
            expandido={!!expandidoGrupo.alta}
            onToggle={() => toggleGrupo('alta')}
          />
          <GrupoPesoTable
            titulo="⚡ Impacto Médio"
            faixaDesc="peso de 1,00 ou 1,50"
            cor="var(--amarelo)"
            itens={gruposPeso.media}
            expandido={!!expandidoGrupo.media}
            onToggle={() => toggleGrupo('media')}
          />
          <GrupoPesoTable
            titulo="🔹 Baixo Impacto"
            faixaDesc="peso entre 0,10 e 1,00"
            cor="#60a5fa"
            itens={gruposPeso.baixa}
            expandido={!!expandidoGrupo.baixa}
            onToggle={() => toggleGrupo('baixa')}
          />
          <GrupoPesoTable
            titulo="⚪ Sem Impacto"
            faixaDesc="peso 0,00 (gol do time perdedor)"
            cor="var(--text-muted)"
            itens={gruposPeso.zero}
            expandido={!!expandidoGrupo.zero}
            onToggle={() => toggleGrupo('zero')}
          />
        </section>
      </div>
    </div>
  );
}
