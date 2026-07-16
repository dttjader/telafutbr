'use client';
import { useState } from 'react';
import { EscudoTime } from '@/components/EscudoTime';
import { Time } from '@/lib/types';

export interface CartaoDetalhe {
  nome: string;
  timeSigla: string;
  adversarioSigla: string;
  rodada: number;
  data: string;
  placarCasa: number;
  placarVisitante: number;
  mandanteSigla: string;
  visitanteSigla: string;
  minuto: number;
  acrescimo: number;
  motivo: string;
}

export interface TipoCartaoResumo {
  tipo: string;
  label: string;
  quantidade: number;
  jogos: CartaoDetalhe[];
}

export interface DescricaoCartao {
  descricao: string;
  quantidade: number;
  jogos: CartaoDetalhe[];
}

export interface PendenteItem {
  nome: string;
  tipo: 'Jogador' | 'Técnico';
  timeSigla: string;
  cartoes: number;
}

export interface SuspensoItem {
  nome: string;
  tipo: 'Jogador' | 'Técnico';
  timeSigla: string;
  motivo: string;
  rodada: number;
}

export interface RankingCartaoItem {
  jogador_id: string;
  nome: string;
  timeSigla: string;
  timeId: string;
  quantidade: number;
}

interface Props {
  tiposResumo: TipoCartaoResumo[];
  descricoesAmarelo: DescricaoCartao[];
  descricoesVermelho: DescricaoCartao[];
  pendurados: PendenteItem[];
  suspensos: SuspensoItem[];
  rankingAmarelos: RankingCartaoItem[];
  rankingVermelhos: RankingCartaoItem[];
  times: Time[];
}

const TIPO_COR: Record<string, string> = {
  amarelo: '#f59e0b',
  vermelho: 'var(--rebaixamento)',
  amarelo_tecnico: '#eab308',
  vermelho_tecnico: '#dc2626',
};

const TIPO_EMOJI: Record<string, string> = {
  amarelo: '🟨',
  vermelho: '🟥',
  amarelo_tecnico: '🟨',
  vermelho_tecnico: '🟥',
};

const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

function formatData(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function ListaDeJogos({ itens }: { itens: CartaoDetalhe[] }) {
  if (itens.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhum registro encontrado.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {itens.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .75rem', background: 'var(--surface2)', borderRadius: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--verde)', minWidth: 46 }}>
            {it.minuto}{it.acrescimo > 0 ? `+${it.acrescimo}` : ''}&apos;
          </span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 600 }}>{it.nome}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              {it.timeSigla} vs {it.adversarioSigla} · Rodada {it.rodada} · {formatData(it.data)}
              {it.motivo && <> · <em>{it.motivo}</em></>}
            </div>
          </div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '.95rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {it.mandanteSigla} {it.placarCasa} × {it.placarVisitante} {it.visitanteSigla}
          </span>
        </div>
      ))}
    </div>
  );
}

function RankingCol({ titulo, dados, cor, times }: {
  titulo: string;
  dados: RankingCartaoItem[];
  cor: string;
  times: Time[];
}) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {titulo}
      </h2>
      {dados.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Nenhum registro ainda.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {dados.slice(0, 30).map((a, i) => {
          const time = times.find(t => t.id === a.timeId);
          const isPrimeiro = i === 0;
          return (
            <div key={a.jogador_id} style={{
              display: 'flex', alignItems: 'center', gap: '.85rem',
              padding: isPrimeiro ? '1rem 1.25rem' : '.75rem 1rem',
              background: isPrimeiro ? 'rgba(255,223,0,.04)' : 'var(--surface)',
              border: `1px solid ${isPrimeiro ? 'rgba(255,223,0,.25)' : 'var(--border)'}`,
              borderRadius: 10,
            }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', minWidth: 32, textAlign: 'center' }}>{medalha(i)}</div>
              <EscudoTime time={time ?? undefined} size={isPrimeiro ? 44 : 34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: isPrimeiro ? '1rem' : '.9rem' }}>{a.nome}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.timeSigla}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isPrimeiro ? '2rem' : '1.6rem', color: cor, lineHeight: 1 }}>{a.quantidade}</div>
                <div style={{ fontSize: '.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>cartões</div>
              </div>
            </div>
          );
        })}
        {dados.length > 30 && (
          <p style={{ textAlign: 'center', fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
            Exibindo apenas os 30 primeiros.
          </p>
        )}
      </div>
    </div>
  );
}

function BlocoDescricao({
  titulo, emoji, cor, itens, onSelecionar,
}: {
  titulo: string;
  emoji: string;
  cor: string;
  itens: DescricaoCartao[];
  onSelecionar: (titulo: string, itens: CartaoDetalhe[]) => void;
}) {
  const max = Math.max(...itens.map(d => d.quantidade), 1);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: cor, letterSpacing: '.04em' }}>
          {titulo}
        </span>
      </div>
      <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Motivos padrão utilizados no registro de cada cartão.
      </p>
      {itens.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Nenhum cartão registrado ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {itens.map(d => (
            <button
              key={d.descricao}
              onClick={() => onSelecionar(`${titulo} — ${d.descricao}`, d.jogos)}
              style={{ textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem', gap: '.5rem' }}>
                <span style={{ color: 'var(--text)' }}>{d.descricao}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: cor, flexShrink: 0 }}>{d.quantidade}</span>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 3, height: 5 }}>
                <div style={{ width: `${(d.quantidade / max) * 100}%`, height: '100%', background: cor, borderRadius: 3 }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CartoesClient({
  tiposResumo, descricoesAmarelo, descricoesVermelho, pendurados, suspensos, rankingAmarelos, rankingVermelhos, times,
}: Props) {
  const [modalJogos, setModalJogos] = useState<{ titulo: string; itens: CartaoDetalhe[] } | null>(null);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0a0a0a 0%,#0d1f0d 50%,#0a0a0a 100%)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0 2rem', marginBottom: '2rem' }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: 'var(--verde)', textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>Estatísticas</p>
          <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)' }}>Cartões</h1>
        </div>
      </div>

      <div className="container">

        {/* 0. Resumo por tipo de cartão */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '.25rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            📌 Resumo por Tipo de Cartão
          </h2>
          <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Clique em um item para ver a lista de jogos.
          </p>

          {/* Amarelos e Vermelhos de jogador — detalhados por descrição */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BlocoDescricao
              titulo="Cartões Amarelos"
              emoji="🟨"
              cor="#f59e0b"
              itens={descricoesAmarelo}
              onSelecionar={(titulo, itens) => setModalJogos({ titulo, itens })}
            />
            <BlocoDescricao
              titulo="Cartões Vermelhos"
              emoji="🟥"
              cor="var(--rebaixamento)"
              itens={descricoesVermelho}
              onSelecionar={(titulo, itens) => setModalJogos({ titulo, itens })}
            />
          </div>

          {/* Amarelo/Vermelho de técnico — cards simples, como antes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem' }}>
            {tiposResumo.map(s => {
              const cor = TIPO_COR[s.tipo] ?? 'var(--amarelo)';
              return (
                <button
                  key={s.tipo}
                  onClick={() => setModalJogos({ titulo: s.label, itens: s.jogos })}
                  style={{
                    textAlign: 'center', cursor: 'pointer', font: 'inherit', color: 'inherit',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem 1rem',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', marginBottom: '.3rem', lineHeight: 1 }}>{TIPO_EMOJI[s.tipo]}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2rem', color: cor, lineHeight: 1 }}>{s.quantidade}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.35rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 1. Pendurados e Suspensos */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border)' }}>
            ⚠️ Pendurados e Suspensos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>

            {/* Pendurados */}
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                🟨 Pendurados
                <span style={{ fontSize: '.75rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
                  {pendurados.length} jogador(es)/técnico(s)
                </span>
              </h3>
              <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                A 1 cartão amarelo de cumprir suspensão (2, 5, 8, 11...).
              </p>
              {pendurados.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Ninguém pendurado no momento.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {pendurados.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <span style={{ fontSize: '.9rem' }}>{p.tipo === 'Técnico' ? '🧑‍💼' : '👤'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{p.nome}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{p.tipo} · {p.timeSigla}</div>
                      </div>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.1rem', color: '#f59e0b' }}>{p.cartoes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suspensos */}
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '.75rem', color: 'var(--rebaixamento)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                🟥 Suspensos
                <span style={{ fontSize: '.75rem', fontFamily: 'Barlow,sans-serif', fontWeight: 400, color: 'var(--text-muted)' }}>
                  {suspensos.length} jogador(es)/técnico(s)
                </span>
              </h3>
              <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                Vermelho ou 3º/6º/9º... amarelo na última rodada disputada pelo time.
              </p>
              {suspensos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Ninguém suspenso no momento.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {suspensos.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .75rem', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8 }}>
                      <span style={{ fontSize: '.9rem' }}>{s.tipo === 'Técnico' ? '🧑‍💼' : '👤'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{s.nome}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{s.tipo} · {s.timeSigla} · Rodada {s.rodada}</div>
                      </div>
                      <span style={{ fontSize: '.68rem', color: 'var(--rebaixamento)', textAlign: 'right', maxWidth: 130 }}>{s.motivo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. Ranking de cartões */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <RankingCol titulo="🟨 Ranking de Amarelos" dados={rankingAmarelos} cor="#f59e0b" times={times} />
            <RankingCol titulo="🟥 Ranking de Vermelhos" dados={rankingVermelhos} cor="var(--rebaixamento)" times={times} />
          </div>
        </section>
      </div>

      {/* Modal — lista de jogos por tipo de cartão */}
      {modalJogos && (
        <div
          onClick={() => setModalJogos(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--amarelo)' }}>{modalJogos.titulo}</h3>
              <button onClick={() => setModalJogos(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {modalJogos.itens.length} registro(s)
            </p>
            <ListaDeJogos itens={modalJogos.itens} />
          </div>
        </div>
      )}
    </div>
  );
}
