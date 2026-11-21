// Lista única de nacionalidades usada nos cadastros de Jogadores e Técnicos.
// Para incluir/remover/renomear uma opção, edite apenas o array abaixo.
// Módulo puro (sem imports de Node.js): seguro para Client Components.

export interface NacionalidadeOpcao {
  value: string;
  label: string;
  flag: string;
}

export const NACIONALIDADES: NacionalidadeOpcao[] = [
  { value: 'Brasileiro',    label: 'Brasileiro',    flag: '🇧🇷' },
  { value: 'Argentino',     label: 'Argentino',     flag: '🇦🇷' },
  { value: 'Uruguaio',      label: 'Uruguaio',      flag: '🇺🇾' },
  { value: 'Chileno',       label: 'Chileno',       flag: '🇨🇱' },
  { value: 'Paraguaio',     label: 'Paraguaio',     flag: '🇵🇾' },
  { value: 'Colombiano',    label: 'Colombiano',    flag: '🇨🇴' },
  { value: 'Português',     label: 'Português',     flag: '🇵🇹' },
  { value: 'Francês',       label: 'Francês',       flag: '🇨🇵' },
  { value: 'Holandês',      label: 'Holandês',      flag: '🇳🇱' },
  { value: 'Outros Países', label: 'Outros Países', flag: '🌍' },
];

// Mapa valor → bandeira (derivado da lista acima)
export const NAC_FLAG: Record<string, string> =
  Object.fromEntries(NACIONALIDADES.map(n => [n.value, n.flag]));

// Opções para um <select>. Se o valor já salvo no banco não estiver na lista
// (ex.: dado antigo digitado livremente), ele é mantido como opção extra para
// não ser perdido ao editar o registro.
export function opcoesNacionalidade(valorAtual?: string | null): NacionalidadeOpcao[] {
  const v = (valorAtual ?? '').trim();
  if (v && !NACIONALIDADES.some(n => n.value === v)) {
    return [...NACIONALIDADES, { value: v, label: v, flag: '🏳️' }];
  }
  return NACIONALIDADES;
}
