// Utilitários puros — sem imports de Node.js, seguro para Client Components

export function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function posicaoLabel(p: string) {
  const l: Record<string, string> = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };
  return l[p] ?? p;
}

export function golTipoLabel(t: string) {
  const l: Record<string, string> = { normal: 'Gol', penalti: 'Pênalti', falta: 'Falta', contra: 'Contra' };
  return l[t] ?? t;
}

export function zonaClassificacao(pos: number) {
  if (pos <= 4) return 'libertadores';
  if (pos <= 6) return 'sulamericana';
  if (pos >= 18) return 'rebaixamento';
  return 'neutro';
}
