'use client';
import { useEffect, useState } from 'react';
import { EscudoTime } from '@/components/EscudoTime';
import type { Time } from '@/lib/types';
import {
  GRUPOS_RANKING, RANKINGS, RANKING_IDS, RANKINGS_PADRAO, TOTAL_CARDS,
  type RankingItem,
} from '@/lib/rankings';

interface Props {
  rankings: Record<string, RankingItem[]>;
  times: Time[];
}

const CHAVE_STORAGE = 'resumo-top-cards';
const PARAM_URL = 'cards';

const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

// Aceita só ids conhecidos, sem repetição, completando com o padrão.
function normalizar(ids: string[]): string[] {
  const usados: string[] = [];
  for (const id of ids) if (RANKING_IDS.has(id) && !usados.includes(id)) usados.push(id);
  for (const id of RANKINGS_PADRAO) if (usados.length < TOTAL_CARDS && !usados.includes(id)) usados.push(id);
  return usados.slice(0, TOTAL_CARDS);
}

function lerSelecao(): string[] | null {
  try {
    const param = new URLSearchParams(window.location.search).get(PARAM_URL);
    if (param) return normalizar(param.split(','));
  } catch { /* sem acesso à URL */ }
  try {
    const salvo = window.localStorage.getItem(CHAVE_STORAGE);
    if (salvo) return normalizar(salvo.split(','));
  } catch { /* localStorage indisponível */ }
  return null;
}

function gravarSelecao(ids: string[]) {
  const valor = ids.join(',');
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_URL, valor);
    window.history.replaceState(null, '', url.toString());
  } catch { /* ignora */ }
  try { window.localStorage.setItem(CHAVE_STORAGE, valor); } catch { /* ignora */ }
}

export function TopSelector({ rankings, times }: Props) {
  const [ids, setIds] = useState<string[]>(RANKINGS_PADRAO);
  const [copiado, setCopiado] = useState(false);

  // Lê a seleção (URL ou localStorage) só no cliente, depois da hidratação.
  useEffect(() => {
    const salva = lerSelecao();
    if (salva) setIds(salva);
  }, []);

  const atualizar = (novos: string[]) => {
    setIds(novos);
    gravarSelecao(novos);
  };

  // Ao escolher um indicador que já está em outro card, os dois trocam de lugar.
  const trocar = (posicao: number, novoId: string) => {
    const novos = [...ids];
    const jaEm = novos.indexOf(novoId);
    if (jaEm >= 0) novos[jaEm] = novos[posicao];
    novos[posicao] = novoId;
    atualizar(novos);
  };

  const restaurar = () => {
    atualizar([...RANKINGS_PADRAO]);
    try { window.localStorage.removeItem(CHAVE_STORAGE); } catch { /* ignora */ }
  };

  const copiarLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM_URL, ids.join(','));
      await navigator.clipboard.writeText(url.toString());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* navegador sem clipboard */ }
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.6rem', marginBottom: '.9rem' }}>
        <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', flex: 1, minWidth: 220 }}>
          Escolha os indicadores de cada card. A seleção fica salva neste navegador e no link da página.
        </p>
        <button type="button" onClick={copiarLink} className="btn btn-ghost btn-sm">
          {copiado ? '✓ Link copiado' : '🔗 Copiar link'}
        </button>
        <button type="button" onClick={restaurar} className="btn btn-ghost btn-sm">↺ Restaurar padrão</button>
      </div>

      <div className="resumo-top5-grid">
        {ids.map((id, pos) => {
          const def = RANKINGS.find(r => r.id === id) ?? RANKINGS[0];
          const itens = rankings[def.id] ?? [];
          return (
            <div key={pos} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.1rem', minWidth: 0 }}>
              <select
                aria-label={`Indicador do card ${pos + 1}`}
                value={def.id}
                onChange={e => trocar(pos, e.target.value)}
                style={{
                  width: '100%', marginBottom: '.25rem', padding: '.35rem .4rem',
                  background: 'var(--surface2)', color: def.cor,
                  border: '1px solid var(--border)', borderRadius: 6,
                  font: 'inherit', fontSize: '.9rem', fontWeight: 700,
                }}
              >
                {GRUPOS_RANKING.map(grupo => (
                  <optgroup key={grupo} label={grupo}>
                    {RANKINGS.filter(r => r.grupo === grupo).map(r => (
                      <option key={r.id} value={r.id}>{r.emoji} Top 10 {r.titulo}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p style={{ fontSize: '.64rem', color: 'var(--text-muted)', marginBottom: '.75rem', lineHeight: 1.35 }}>{def.criterio}</p>

              {itens.length === 0 && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Sem dados.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {itens.map((it, i) => {
                  const time = it.timeId ? times.find(t => t.id === it.timeId) : undefined;
                  return (
                    <div key={`${it.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--text-muted)', minWidth: 26 }}>{medalha(i)}</span>
                      {it.timeId && <EscudoTime time={time} size={20} />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: '.85rem' }}>{it.nome}</span>
                        {it.detalhe && <span style={{ display: 'block', fontSize: '.62rem', color: 'var(--text-muted)' }}>{it.detalhe}</span>}
                      </span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', color: def.cor }}>{it.valor}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
