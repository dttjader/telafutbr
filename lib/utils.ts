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

// NOTE: A função `zonaClassificacao` foi removida deste arquivo.
// A única fonte de verdade para zona de classificação é `lib/config.ts`,
// que recebe a configuração de vagas salva em /admin/config
// (zonaClassificacao(posicao, timeId, config, totalTimes)).
// Havia aqui uma versão hardcoded (Lib 1-4, Sula 5-6, Reb >=18) que não
// refletia as vagas configuráveis pelo admin — foi descontinuada para
// evitar divergência entre telas. Importe de '@/lib/config' quando precisar.
