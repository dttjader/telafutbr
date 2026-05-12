import fs from 'fs';
import path from 'path';

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

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

export function getConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
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

  // Vagas diretas têm badge especial mas não mudam a zona visual
  if (config.libertadores.vagas_diretas.some(v => v.time_id === timeId)) return 'libertadores-direta';
  if (config.sulamericana.vagas_diretas.some(v => v.time_id === timeId)) return 'sulamericana-direta';
  if (posicao <= vagasLib) return 'libertadores';
  if (posicao <= vagasSul) return 'sulamericana';
  if (posicao >= vagasReb) return 'rebaixamento';
  return 'neutro';
}
