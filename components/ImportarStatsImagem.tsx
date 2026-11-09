'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Partida, Jogador, StatsJogador } from '@/lib/types';
import {
  STAT_KEYS, STAT_MAX, parseColunas, parseLinhas, casarLinha, ajustarValores,
  type StatKey, type Candidato, type MetodoCasamento,
} from '@/lib/statsImagem';

const COLUNAS_PADRAO = 'Crn S SoT SB P C Tk Off FC FS Sav';
const LS_COLUNAS = 'statsImagem.colunas';

interface Linha {
  key: number;
  nomeLido: string;
  textoOriginal: string;
  jogador_id: string;
  metodo: MetodoCasamento | null;
  valores: Partial<Record<StatKey, number>>;
  sobrando: number; // valores lidos além das colunas configuradas
  faltando: number; // colunas sem valor
  incluir: boolean;
}

interface Props {
  partida: Partida;
  jogadores: Jogador[];
  getStats: (jogador_id: string) => StatsJogador;
  // Recebe todos os stats já mesclados e salva uma única vez.
  onAplicar: (novos: StatsJogador[]) => Promise<void> | void;
  flash: (ok: boolean, t: string) => void;
}

const btn: React.CSSProperties = { cursor: 'pointer' };

// Reduz ruído antes do OCR: amplia 2x, converte para tons de cinza, aumenta
// contraste e (opcional) inverte, útil para screenshots de tema escuro.
async function preprocessar(file: Blob, inverter: boolean): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const escala = bmp.width < 1600 ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width * escala;
  canvas.height = bmp.height * escala;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (inverter) g = 255 - g;
    g = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function ImportarStatsImagem({ partida, jogadores, getStats, onAplicar, flash }: Props) {
  const [colunasTxt, setColunasTxt] = useState(COLUNAS_PADRAO);
  const [inverter, setInverter] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [textoOcr, setTextoOcr] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(LS_COLUNAS); if (s) setColunasTxt(s); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_COLUNAS, colunasTxt); } catch { /* ignore */ }
  }, [colunasTxt]);

  const { colunas, invalidas } = useMemo(() => parseColunas(colunasTxt), [colunasTxt]);

  const candidatos: Candidato[] = useMemo(() => {
    const out: Candidato[] = [];
    const add = (esc: Partida['escalacao_casa'], lado: 'casa' | 'visitante') => {
      for (const e of esc) {
        const j = jogadores.find(x => x.id === e.jogador_id);
        if (j) out.push({ jogador: j, esc: e, lado });
      }
    };
    add(partida.escalacao_casa, 'casa');
    add(partida.escalacao_visitante, 'visitante');
    return out;
  }, [partida, jogadores]);

  const escolher = (f: Blob | null | undefined) => {
    if (!f) return;
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setBlob(f); setImgUrl(URL.createObjectURL(f));
    setLinhas([]); setTextoOcr('');
  };

  // Ctrl+V com a aba aberta cola o screenshot
  useEffect(() => {
    const onPaste = (ev: ClipboardEvent) => {
      const item = Array.from(ev.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (item) { escolher(item.getAsFile()); ev.preventDefault(); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgUrl]);

  const montarLinhas = (texto: string, cols: (StatKey | null)[]) => {
    const lidas = parseLinhas(texto);
    const novas: Linha[] = lidas.map((l, i) => {
      const c = casarLinha(l, candidatos);
      const valores: Partial<Record<StatKey, number>> = {};
      const v = ajustarValores(l, cols);
      cols.forEach((k, idx) => { if (k && v[idx] !== undefined) valores[k] = v[idx]; });
      return {
        key: i, nomeLido: l.nome, textoOriginal: l.texto,
        jogador_id: c.jogador_id ?? '', metodo: c.metodo, valores,
        sobrando: Math.max(0, v.length - cols.length),
        faltando: Math.max(0, cols.length - v.length),
        incluir: !!c.jogador_id,
      };
    });
    setLinhas(novas);
  };

  const lerImagem = async () => {
    if (!blob) return flash(false, 'Escolha ou cole uma imagem primeiro.');
    if (colunas.length === 0 || invalidas.length > 0) return flash(false, 'Ordem de colunas inválida.');
    setProgresso(0); setLinhas([]);
    try {
      const canvas = await preprocessar(blob, inverter);
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => { if (m.status === 'recognizing text') setProgresso(Math.round(m.progress * 100)); },
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' });
      const { data } = await worker.recognize(canvas);
      await worker.terminate();
      setTextoOcr(data.text);
      montarLinhas(data.text, colunas);
      if (!parseLinhas(data.text).length) flash(false, 'Nenhuma linha com nome + números foi reconhecida. Tente "Inverter cores" ou uma imagem maior.');
    } catch (e) {
      flash(false, 'Erro no OCR: ' + String(e));
    }
    setProgresso(null);
  };

  // Reaplica as colunas sem refazer o OCR (ex.: ajustar a ordem)
  const remontar = () => { if (textoOcr) montarLinhas(textoOcr, colunas); };

  const upd = (key: number, patch: Partial<Linha>) =>
    setLinhas(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const updValor = (key: number, k: StatKey, v: string) =>
    setLinhas(ls => ls.map(l => {
      if (l.key !== key) return l;
      const valores = { ...l.valores };
      if (v === '') delete valores[k]; else valores[k] = Math.max(0, parseInt(v, 10) || 0);
      return { ...l, valores };
    }));

  const jogadorDe = (id: string) => jogadores.find(j => j.id === id);
  const duplicados = useMemo(() => {
    const cont: Record<string, number> = {};
    linhas.filter(l => l.incluir && l.jogador_id).forEach(l => { cont[l.jogador_id] = (cont[l.jogador_id] ?? 0) + 1; });
    return new Set(Object.keys(cont).filter(k => cont[k] > 1));
  }, [linhas]);

  const aplicar = async () => {
    const mapa = new Map<string, StatsJogador>();
    let linhasAplicadas = 0, celulasIgnoradas = 0, travados = 0;

    for (const l of linhas) {
      if (!l.incluir || !l.jogador_id || duplicados.has(l.jogador_id)) continue;
      const atual = mapa.get(l.jogador_id) ?? getStats(l.jogador_id);
      if (atual.validado) { travados++; continue; }
      const jog = jogadorDe(l.jogador_id);
      const novo: StatsJogador = { ...atual };
      for (const k of STAT_KEYS) {
        const v = l.valores[k];
        if (v === undefined) continue;
        if (v > STAT_MAX[k] || (k === 'Sav' && jog?.posicao !== 'GOL')) { celulasIgnoradas++; continue; }
        novo[k] = v;
      }
      mapa.set(l.jogador_id, novo);
      linhasAplicadas++;
    }
    if (mapa.size === 0) return flash(false, 'Nada para aplicar.');
    await onAplicar(Array.from(mapa.values()));
    flash(true, `${linhasAplicadas} jogador(es) atualizado(s)` +
      (celulasIgnoradas ? ` · ${celulasIgnoradas} valor(es) ignorado(s)` : '') +
      (travados ? ` · ${travados} validado(s) preservado(s)` : ''));
    setLinhas([]);
  };

  const selSt: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '.25rem .35rem', fontSize: '.8rem' };
  const metodoLabel: Record<string, { t: string; c: string }> = {
    registro: { t: 'registro', c: 'var(--verde)' },
    alias: { t: 'alias', c: 'var(--verde)' },
    nome: { t: 'nome', c: 'var(--verde)' },
    aproximado: { t: 'aproximado — confira', c: '#f59e0b' },
  };
  const colsAtivas = colunas.filter((k): k is StatKey => !!k);

  return (
    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #60a5fa' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '.75rem', color: '#60a5fa' }}>📷 Importar de imagem (OCR no navegador)</h3>
      <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Cole (Ctrl+V) ou envie o screenshot. A leitura roda no seu navegador — nada é enviado para servidores externos.
        Nada é salvo até você confirmar a prévia. Jogadores <strong>Validados</strong> não são alterados.
      </p>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '.75rem' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 280 }}>
          <label>Ordem das colunas no screenshot (use _ para ignorar uma coluna)</label>
          <input value={colunasTxt} onChange={e => setColunasTxt(e.target.value)} />
          {invalidas.length > 0 && <span style={{ fontSize: '.7rem', color: 'var(--rebaixamento)' }}>Siglas inválidas: {invalidas.join(', ')}</span>}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={btn} onClick={() => fileRef.current?.click()}>📁 Escolher imagem</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => escolher(e.target.files?.[0])} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.8rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={inverter} onChange={e => setInverter(e.target.checked)} /> Inverter cores (tema escuro)
        </label>
        <button type="button" className="btn btn-primary btn-sm" style={btn} onClick={lerImagem} disabled={!blob || progresso !== null}>
          {progresso !== null ? `Lendo... ${progresso}%` : '🔍 Ler imagem'}
        </button>
      </div>

      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt="screenshot" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 6, border: '1px solid var(--border)', marginBottom: '.75rem' }} />
      ) : (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: '.75rem' }}>
          Nenhuma imagem — cole com Ctrl+V ou clique em &quot;Escolher imagem&quot;.
        </div>
      )}

      {textoOcr && (
        <div style={{ marginBottom: '.75rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" style={btn} onClick={() => setMostrarTexto(v => !v)}>
            {mostrarTexto ? 'Ocultar texto bruto' : 'Ver texto bruto do OCR'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ ...btn, marginLeft: '.4rem' }} onClick={remontar}>↻ Reaplicar colunas</button>
          {mostrarTexto && (
            <pre style={{ marginTop: '.5rem', background: 'var(--surface2)', borderRadius: 6, padding: '.6rem', fontSize: '.72rem', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{textoOcr}</pre>
          )}
        </div>
      )}

      {linhas.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)', marginBottom: '1rem' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '.8rem', width: '100%' }}>
              <thead style={{ background: 'var(--surface2)', borderBottom: '2px solid #60a5fa' }}>
                <tr>
                  <th style={{ padding: '.5rem' }}>✔</th>
                  <th style={{ padding: '.5rem', textAlign: 'left' }}>Lido no OCR</th>
                  <th style={{ padding: '.5rem', textAlign: 'left' }}>Jogador</th>
                  {colsAtivas.map(k => <th key={k} style={{ padding: '.5rem .25rem', fontFamily: "'Bebas Neue',sans-serif" }}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const jog = jogadorDe(l.jogador_id);
                  const stAtual = l.jogador_id ? getStats(l.jogador_id) : null;
                  const travado = !!stAtual?.validado;
                  const dup = duplicados.has(l.jogador_id);
                  const aviso: string[] = [];
                  if (!l.jogador_id) aviso.push('sem jogador');
                  if (travado) aviso.push('validado (bloqueado)');
                  if (dup) aviso.push('jogador repetido');
                  if (l.sobrando) aviso.push(`${l.sobrando} valor(es) a mais`);
                  if (l.faltando) aviso.push(`${l.faltando} coluna(s) sem valor`);
                  return (
                    <tr key={l.key} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', opacity: l.incluir ? 1 : .55 }}>
                      <td style={{ padding: '.35rem', textAlign: 'center' }}>
                        <input type="checkbox" checked={l.incluir} disabled={!l.jogador_id || travado} onChange={e => upd(l.key, { incluir: e.target.checked })} />
                      </td>
                      <td style={{ padding: '.35rem .5rem', maxWidth: 180 }} title={l.textoOriginal}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nomeLido}</div>
                        {l.metodo && <div style={{ fontSize: '.62rem', color: metodoLabel[l.metodo].c }}>{metodoLabel[l.metodo].t}</div>}
                        {aviso.length > 0 && <div style={{ fontSize: '.62rem', color: '#f59e0b' }}>⚠ {aviso.join(' · ')}</div>}
                      </td>
                      <td style={{ padding: '.35rem' }}>
                        <select style={{ ...selSt, width: 170 }} value={l.jogador_id}
                          onChange={e => upd(l.key, { jogador_id: e.target.value, metodo: null, incluir: !!e.target.value })}>
                          <option value="">— selecionar —</option>
                          {candidatos.map(c => (
                            <option key={c.jogador.id} value={c.jogador.id}>
                              {c.jogador.nome} (#{c.esc.numero} · {c.lado === 'casa' ? 'M' : 'V'})
                            </option>
                          ))}
                        </select>
                      </td>
                      {colsAtivas.map(k => {
                        const v = l.valores[k];
                        const excede = v !== undefined && v > STAT_MAX[k];
                        const savBloq = k === 'Sav' && jog && jog.posicao !== 'GOL' && v !== undefined;
                        const atual = stAtual?.[k];
                        return (
                          <td key={k} style={{ padding: '.25rem', textAlign: 'center' }}>
                            <input type="number" min={0} value={v ?? ''} onChange={e => updValor(l.key, k, e.target.value)}
                              title={`${k}: atual ${atual ?? '—'}${excede ? ` · acima do limite (${STAT_MAX[k]})` : ''}${savBloq ? ' · só goleiros' : ''}`}
                              style={{ ...selSt, width: 48, textAlign: 'center', borderColor: excede || savBloq ? 'var(--rebaixamento)' : 'var(--border)', color: excede || savBloq ? 'var(--rebaixamento)' : 'var(--text)' }} />
                            {atual !== undefined && v !== undefined && atual !== v && (
                              <div style={{ fontSize: '.58rem', color: 'var(--text-muted)' }}>era {atual}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" style={btn} onClick={aplicar}>
              ✅ Aplicar {linhas.filter(l => l.incluir && l.jogador_id && !duplicados.has(l.jogador_id)).length} linha(s)
            </button>
            <button type="button" className="btn btn-ghost" style={btn} onClick={() => setLinhas([])}>Descartar</button>
            <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              Valores em vermelho (acima do limite, ou Sav fora de goleiro) são ignorados ao aplicar.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
