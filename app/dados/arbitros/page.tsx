import { getPartidas } from '@/lib/data';
import { ArbitrosClient, type CargoArbitro, type ArbitroAuxiliar, type ArbitroPrincipal } from './ArbitrosClient';

export const dynamic = 'force-dynamic';

export default async function ArbitrosPage() {
  const partidas = await getPartidas();
  const encerradas = partidas.filter(p => p.status === 'encerrada');

  // Construir mapa por nome → cargos e estatísticas
  const map: Record<string, {
    nome: string;
    cargos: Partial<Record<CargoArbitro, { jogos: number; gols: number; amarelos: number; vermelhos: number }>>;
    totalJogos: number;
    totalGols: number;
    totalAmarelos: number;
    totalVermelhos: number;
  }> = {};

  const addArbitro = (nome: string, cargo: CargoArbitro, gols: number, amarelos: number, vermelhos: number) => {
    if (!nome || !nome.trim()) return;
    const key = nome.trim();
    if (!map[key]) map[key] = { nome: key, cargos: {}, totalJogos: 0, totalGols: 0, totalAmarelos: 0, totalVermelhos: 0 };
    const entry = map[key];
    if (!entry.cargos[cargo]) entry.cargos[cargo] = { jogos: 0, gols: 0, amarelos: 0, vermelhos: 0 };
    entry.cargos[cargo]!.jogos++;
    entry.cargos[cargo]!.gols += gols;
    entry.cargos[cargo]!.amarelos += amarelos;
    entry.cargos[cargo]!.vermelhos += vermelhos;
    entry.totalJogos++;
    entry.totalGols += gols;
    entry.totalAmarelos += amarelos;
    entry.totalVermelhos += vermelhos;
  };

  for (const p of encerradas) {
    const gols = p.placar_casa + p.placar_visitante;
    let amarelos = 0, vermelhos = 0;
    for (const c of p.cartoes) {
      if (c.tipo === 'amarelo' || c.tipo === 'amarelo_tecnico') amarelos++;
      else if (c.tipo === 'vermelho' || c.tipo === 'vermelho_tecnico') vermelhos++;
    }
    const arb = p.arbitragem;
    if (arb?.principal)   addArbitro(arb.principal,   'principal',   gols, amarelos, vermelhos);
    if (arb?.assistente1) addArbitro(arb.assistente1, 'assistente1', gols, amarelos, vermelhos);
    if (arb?.assistente2) addArbitro(arb.assistente2, 'assistente2', gols, amarelos, vermelhos);
    if (arb?.quarto)      addArbitro(arb.quarto,      'quarto',      gols, amarelos, vermelhos);
    if (arb?.var)         addArbitro(arb.var,          'var',         gols, amarelos, vermelhos);
  }

  const lista = Object.values(map).sort((a, b) => b.totalJogos - a.totalJogos);

  // Árbitros principais — dados já achatados nas colunas exibidas na tabela
  // (jogos, gols e cartões correspondem apenas às partidas em que atuaram como principal)
  const principaisData: ArbitroPrincipal[] = lista
    .filter(a => a.cargos['principal'])
    .map(a => ({
      nome: a.nome,
      jogos: a.cargos['principal']!.jogos,
      gols: a.cargos['principal']!.gols,
      amarelos: a.cargos['principal']!.amarelos,
      vermelhos: a.cargos['principal']!.vermelhos,
    }));

  // Auxiliares & VAR — mantém a estrutura de cargos para exibir os badges
  const auxiliaresData: ArbitroAuxiliar[] = lista
    .filter(a => !a.cargos['principal'])
    .map(a => ({
      nome: a.nome,
      cargos: a.cargos,
      totalJogos: a.totalJogos,
      totalAmarelos: a.totalAmarelos,
      totalVermelhos: a.totalVermelhos,
    }));

  return (
    <ArbitrosClient
      principaisData={principaisData}
      auxiliaresData={auxiliaresData}
      totalArbitros={lista.length}
      totalPartidas={encerradas.length}
    />
  );
}
