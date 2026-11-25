import { supabase } from './supabase';
import { temporadaSelecionada, divisaoSelecionada } from './temporada';

export interface VagaDireta {
  time_id: string;
  motivo: string;
}

export interface Config {
  libertadores: {
    vagas_tabela: number;
    vagas_diretas: VagaDireta[];
  };
  sulamericana: {
    vagas_tabela: number;
    vagas_diretas: VagaDireta[];
  };
  rebaixamento: {
    vagas: number;
  };
}

const DEFAULT_CONFIG: Config = {
  libertadores: { vagas_tabela: 5, vagas_diretas: [] },
  sulamericana: { vagas_tabela: 6, vagas_diretas: [] },
  rebaixamento: { vagas: 4 },
};

// Padrão por divisão. Série B: libertadores = acesso direto, sulamericana = acesso por decisão.
const DEFAULT_SERIE_B: Config = {
  libertadores: { vagas_tabela: 2, vagas_diretas: [] },
  sulamericana: { vagas_tabela: 2, vagas_diretas: [] },
  rebaixamento: { vagas: 4 },
};
export function configPadrao(divisao: number): Config {
  return divisao === 2 ? DEFAULT_SERIE_B : DEFAULT_CONFIG;
}

// Chave da configuração: Série A 'classificacao:ANO' · demais 'classificacao:ANO:DIV'.
export function chaveConfig(ano: number, divisao: number): string {
  return divisao === 1 ? `classificacao:${ano}` : `classificacao:${ano}:${divisao}`;
}

// Sem configuração própria, a Série A usa a linha antiga 'classificacao'; depois, o padrão.
export async function getConfig(temporada?: number, divisao?: number): Promise<Config> {
  const ano = temporada ?? await temporadaSelecionada();
  const div = divisao ?? await divisaoSelecionada(ano);
  const chaves = div === 1 ? [chaveConfig(ano, div), 'classificacao'] : [chaveConfig(ano, div)];
  for (const chave of chaves) {
    const { data } = await supabase.from('configuracoes').select('valor').eq('chave', chave).maybeSingle();
    if (data) return data.valor as Config;
  }
  return configPadrao(div);
}

export async function saveConfig(config: Config, temporada?: number, divisao?: number): Promise<void> {
  const ano = temporada ?? await temporadaSelecionada();
  const div = divisao ?? await divisaoSelecionada(ano);
  await supabase.from('configuracoes').upsert({ chave: chaveConfig(ano, div), valor: config });
}

export function zonaClassificacao(
  posicao: number,
  timeId: string,
  config: Config,
  totalTimes: number
): 'libertadores' | 'libertadores-direta' | 'sulamericana' | 'sulamericana-direta' | 'rebaixamento' | 'neutro' {
  const vagasLib = config.libertadores.vagas_tabela;
  const vagasSul = vagasLib + config.sulamericana.vagas_tabela;
  const vagasReb = totalTimes - config.rebaixamento.vagas + 1;

  if (config.libertadores.vagas_diretas.some(v => v.time_id === timeId)) return 'libertadores-direta';
  if (config.sulamericana.vagas_diretas.some(v => v.time_id === timeId)) return 'sulamericana-direta';
  if (posicao <= vagasLib) return 'libertadores';
  if (posicao <= vagasSul) return 'sulamericana';
  if (posicao >= vagasReb) return 'rebaixamento';
  return 'neutro';
}
