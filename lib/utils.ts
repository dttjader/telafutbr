// Utilitários puros — sem imports de Node.js, seguro para Client Components

// Partidas que entram em pontuação, placares e todos os indicadores:
// encerradas E ao vivo (o placar parcial já é contabilizado).
export function partidaContabilizada(p: { status: string }): boolean {
  return p.status === 'encerrada' || p.status === 'ao_vivo';
}

// Idade em anos completos a partir de uma data AAAA-MM-DD (null se inválida).
export function calcularIdade(dataNascimento?: string | null, hoje: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento ?? '');
  if (!m) return null;
  const [ano, mes, dia] = [+m[1], +m[2], +m[3]];
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--;
  return idade >= 0 ? idade : null;
}

// Idade do jogador: calculada dinamicamente pela data de nascimento quando
// existir; caso contrário usa o valor legado salvo em `idade`.
export function idadeJogador(j: { data_nascimento?: string | null; idade?: number | null }): number | undefined {
  return calcularIdade(j.data_nascimento) ?? j.idade ?? undefined;
}

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
