'use client';
import { useEffect, useRef, useState } from 'react';

// ── Impressão / PDF ──────────────────────────────────────────────────────────
// • <ImpressaoSetup/>  : prepara a página em beforeprint (cores escuras sobre
//   fundo branco, escala das tabelas largas) e desfaz em afterprint. Funciona
//   também com Ctrl+P.
// • <BotaoImprimir/>   : botão do menu com "Retrato" e "Paisagem". Define a
//   orientação da folha e abre a impressão (escolha "Salvar como PDF").

type Orientacao = 'retrato' | 'paisagem';
const CHAVE = 'orientacao-impressao';
// Largura útil da folha (mm) descontando margens de 10 mm; usa o menor papel comum (Carta)
const LARGURA_MM: Record<Orientacao, number> = { retrato: 190, paisagem: 259 };
const MM_PARA_PX = 96 / 25.4;

function orientacaoSalva(): Orientacao {
  try { return localStorage.getItem(CHAVE) === 'retrato' ? 'retrato' : 'paisagem'; } catch { return 'paisagem'; }
}

// ── cores ────────────────────────────────────────────────────────────────────
type RGBA = { r: number; g: number; b: number; a: number };
function parseCor(c: string): RGBA | null {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (p.length < 3 || p.some(isNaN)) return null;
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function lum({ r, g, b }: RGBA) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function toHsl({ r, g, b }: RGBA): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const neutroEscuro = (c: RGBA) => lum(c) < 0.25 && toHsl(c)[1] < 0.4; // superfícies escuras do tema

// Escurece uma cor de texto/traço mantendo o tom
function escurecer(c: RGBA): string | null {
  const [h, s, l] = toHsl(c);
  if (l <= 0.4) return null;
  if (s < 0.2) return l > 0.75 ? '#0f172a' : '#475569';  // brancos/cinzas
  return hsl(h, Math.min(s, 0.85), 0.3);                    // cores vivas → tom escuro
}

type Salvo = Map<Element, Record<string, [string, string]>>;
let salvos: Salvo = new Map();

function definir(el: Element, prop: string, valor: string) {
  const st = (el as HTMLElement).style;
  if (!st) return;
  const m = salvos.get(el) ?? {};
  if (!(prop in m)) m[prop] = [st.getPropertyValue(prop), st.getPropertyPriority(prop)];
  salvos.set(el, m);
  st.setProperty(prop, valor, 'important');
}

// Cor efetiva de fundo (original) atrás de um elemento: null = papel branco
function fundoAtras(el: Element | null): RGBA | null {
  while (el) {
    const c = parseCor(getComputedStyle(el).backgroundColor);
    if (c && c.a > 0.6) return c;
    el = el.parentElement;
  }
  return null;
}

function prepararCores(raiz: Element) {
  const todos = [raiz, ...Array.from(raiz.querySelectorAll('*'))];
  for (const el of todos) {
    if (el.closest('[data-print-keep]')) continue; // escudos mantêm as cores originais
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement;

    // Fundo escuro do tema → branco / cinza claro (fundos coloridos ficam)
    const bg = parseCor(cs.backgroundColor);
    if (bg && bg.a > 0.6 && neutroEscuro(bg)) definir(el, 'background-color', lum(bg) < 0.1 ? '#ffffff' : '#f1f5f9');

    // Bordas escuras do tema → cinza claro
    const bc = parseCor(cs.borderTopColor);
    if (bc && bc.a > 0.2 && lum(bc) < 0.3 && parseFloat(cs.borderTopWidth) > 0) definir(el, 'border-color', '#cbd5e1');

    // Texto: escurece se estiver sobre papel/fundo escuro do tema (não sobre fundo colorido)
    if (!svg) {
      const cor = parseCor(cs.color);
      const atras = fundoAtras(el);
      const sobreColorido = atras && !neutroEscuro(atras);
      if (cor && !sobreColorido) { const n = escurecer(cor); if (n) definir(el, 'color', n); }
    } else {
      // SVG (gráficos): preenchimento e traço
      for (const prop of ['fill', 'stroke'] as const) {
        const v = cs.getPropertyValue(prop);
        const c = parseCor(v);
        if (!c || c.a < 0.2) continue;
        if (neutroEscuro(c)) definir(el, prop, prop === 'stroke' ? '#cbd5e1' : '#ffffff');
        else if (el.tagName.toLowerCase() === 'text' || prop === 'stroke') { const n = escurecer(c); if (n) definir(el, prop, n); }
      }
    }
  }
}

// ── escala de tabelas largas ─────────────────────────────────────────────────
function ajustarLargura(raiz: Element, orientacao: Orientacao) {
  const util = LARGURA_MM[orientacao] * MM_PARA_PX;
  const alvos = Array.from(raiz.querySelectorAll<HTMLElement>('[style*="overflow-x"], [style*="overflow: auto"]'));
  for (const el of alvos) {
    if (el.parentElement?.closest('[data-print-zoom]')) continue;
    const w = el.scrollWidth;
    if (w > util) {
      el.setAttribute('data-print-zoom', '1');
      definir(el, 'zoom', String(Math.max(util / w, 0.4)));
    }
  }
}

function antes(orientacao: Orientacao, titulo: string) {
  depois();
  const raiz = document.querySelector('main');
  if (raiz) { prepararCores(raiz); ajustarLargura(raiz, orientacao); }
  const d = document.getElementById('print-data');
  if (d) d.textContent = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  (window as unknown as { __tituloOriginal?: string }).__tituloOriginal = document.title;
  if (titulo) document.title = titulo;
}

function depois() {
  salvos.forEach((props, el) => {
    const st = (el as HTMLElement).style;
    for (const [prop, [valor, prio]] of Object.entries(props)) {
      if (valor) st.setProperty(prop, valor, prio); else st.removeProperty(prop);
    }
    el.removeAttribute('data-print-zoom');
  });
  salvos = new Map();
  const w = window as unknown as { __tituloOriginal?: string };
  if (w.__tituloOriginal) { document.title = w.__tituloOriginal; w.__tituloOriginal = undefined; }
  document.getElementById('print-page-style')?.remove();
}

function definirFolha(o: Orientacao) {
  document.getElementById('print-page-style')?.remove();
  const s = document.createElement('style');
  s.id = 'print-page-style';
  s.textContent = `@page { size: ${o === 'paisagem' ? 'landscape' : 'portrait'}; margin: 10mm; }`;
  document.head.appendChild(s);
}

export function ImpressaoSetup({ titulo }: { titulo: string }) {
  useEffect(() => {
    const a = () => {
      // Ctrl+P: usa a orientação salva; pelo botão, a folha já foi definida
      if (!document.getElementById('print-page-style')) definirFolha(orientacaoSalva());
      antes(orientacaoSalva(), titulo);
    };
    window.addEventListener('beforeprint', a);
    window.addEventListener('afterprint', depois);
    return () => { window.removeEventListener('beforeprint', a); window.removeEventListener('afterprint', depois); };
  }, [titulo]);
  return null;
}

export function BotaoImprimir() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<Orientacao>('paisagem');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setAtual(orientacaoSalva()); }, []);
  useEffect(() => {
    const fechar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const imprimir = (o: Orientacao) => {
    try { localStorage.setItem(CHAVE, o); } catch { /* ignore */ }
    setAtual(o); setAberto(false);
    definirFolha(o);
    // pequena espera para o navegador aplicar o @page antes do diálogo
    setTimeout(() => window.print(), 50);
  };

  const item = (o: Orientacao, texto: string) => (
    <button key={o} onClick={() => imprimir(o)} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '.5rem .8rem', background: atual === o ? 'rgba(255,223,0,.1)' : 'transparent',
      color: 'var(--text)', border: 'none', cursor: 'pointer', fontSize: '.85rem', whiteSpace: 'nowrap',
    }}>{texto}{atual === o ? ' ✓' : ''}</button>
  );

  return (
    <div ref={ref} className="no-print" style={{ position: 'relative' }}>
      <button onClick={() => setAberto(a => !a)} title="Imprimir ou salvar como PDF" aria-label="Imprimir ou salvar como PDF"
        style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '.25rem .6rem', cursor: 'pointer', fontSize: '.85rem' }}>
        🖨️ PDF
      </button>
      {aberto && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', zIndex: 200, minWidth: 190 }}>
          <div style={{ padding: '.4rem .8rem', fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Imprimir / Salvar PDF</div>
          {item('paisagem', '▭ Paisagem (tabelas largas)')}
          {item('retrato', '▯ Retrato')}
          <div style={{ padding: '.4rem .8rem', fontSize: '.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            No diálogo, escolha “Salvar como PDF”.
          </div>
        </div>
      )}
    </div>
  );
}
