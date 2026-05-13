import { supabase } from './supabase';

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

export async function getConfig(): Promise<Config> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'classificacao')
    .single();
  if (error || !data) return DEFAULT_CONFIG;
  return data.valor as Config;
}

export async function saveConfig(config: Config): Promise<void> {
  await supabase
    .from('configuracoes')
    .upsert({ chave: 'classificacao', valor: config });
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
