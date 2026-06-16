'use client';
import { useState, useMemo } from 'react';
import { EscudoTime } from '@/components/EscudoTime';
import { Time, Jogador } from '@/lib/types';

interface JogadorStats {
  jogador_id: string;
  gols: number;
  gols_contra: number;
  gols_sofridos: number;
  assistencias: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  minutos: number;
  partidas: number;
}

interface JogadorComStats extends Jogador {
  stats: JogadorStats;
  transferencias_aqui?: { time_id: string; data: string }[];
}

interface TimeData {
  time: Time;
  publicoCasa: {
    total: number;
    jogos: number;
    porEstadio: Record<string, { total: number; jogos: number; nome: string }>;
  };
  publicoVisitante: { total: number; jogos: number };
  ativos: JogadorComStats[];
  foramEmbora: JogadorComStats[];
  vieram: JogadorComStats[];
}

interface Props {
  timesData: TimeData[];
}

const SUB_POS_LABEL: Record<string, string> = {
  GOL: 'GOL', ZAG: 'ZAG', LD: 'LD', LE: 'LE',
  VOL: 'VOL', MC: 'MC', MO: 'MO', CA: 'CA', PD: 'PD', PE: 'PE',
};

function fmt(n: number) { return n.toLocaleString('pt-BR'); }

function posColor(posicao: string): string {
  const m: Record<string, string> = {
    GOL: '#f59e0b', ZAG: '#3b82f6', LAT: '#22c55e',
    VOL: '#8b5cf6', MEI: '#ec4899', ATA: '#ef4444',
  };
  return m[posicao] ?? '#888';
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DO MELHOR TIME
// ─────────────────────────────────────────────────────────────────────────────

function scoreJogoLimpo(j: JogadorComStats): number {
  if (j.stats.minutos === 0 || j.stats.partidas === 0) return -Infinity;
  const totalCartoes = j.stats.cartoes_amarelos + j.stats.cartoes_vermelhos * 3;
  const jogoLimpo = totalCartoes === 0 ? j.stats.minutos : j.stats.minutos / (totalCartoes + 1);
  return jogoLimpo + j.stats.gols * 15;
}

function scoreGoleiro(j: JogadorComStats): number {
  if (j.stats.minutos === 0 || j.stats.partidas === 0) return -Infinity;
  if (j.stats.gols_sofridos === 0) return j.stats.minutos;
  return j.stats.minutos / j.stats.gols_sofridos;
}

function sortBy<T>(arr: T[], fn: (x: T) => number): T[] {
  return [...arr].sort((a, b) => fn(b) - fn(a));
}

function sp(j: JogadorComStats): string { return j.sub_posicao ?? ''; }

function isLD(j: JogadorComStats)  { return j.posicao === 'LAT' && sp(j) === 'LD'; }
function isLE(j: JogadorComStats)  { return j.posicao === 'LAT' && sp(j) === 'LE'; }
function isLAT(j: JogadorComStats) { return j.posicao === 'LAT'; }
function isZAG(j: JogadorComStats) { return j.posicao === 'ZAG'; }

function isVOL(j: JogadorComStats) { return j.posicao === 'VOL' || (j.posicao === 'MEI' && sp(j) === 'VOL'); }
function isMC(j: JogadorComStats)  { return j.posicao === 'MEI' && (sp(j) === 'MC' || sp(j) === ''); }
function isMO(j: JogadorComStats)  { return j.posicao === 'MEI' && sp(j) === 'MO'; }

function isCA(j: JogadorComStats)  { return j.posicao === 'ATA' && sp(j) === 'CA'; }
function isPD(j: JogadorComStats)  { return j.posicao === 'ATA' && sp(j) === 'PD'; }
function isPE(j: JogadorComStats)  { return j.posicao === 'ATA' && sp(j) === 'PE'; }

export interface BestTeamResult {
  goleiro: JogadorComStats | null;
  defesa: { jogador: JogadorComStats; role: string }[];
  meios: { jogador: JogadorComStats; role: string }[];
  ataque: { jogador: JogadorComStats; role: string }[];
  lateraisNoMeio: boolean; // para mostrar nota na UI
  nDef: number;
  nMei: number;
  nAta: number;
}

function calcBestTeam(jogadores: JogadorComStats[]): BestTeamResult {
  const com = jogadores.filter(j => j.stats.partidas > 0);

  // ── GOLEIRO ───────────────────────────────────────────────────────────────
  const goleiro = sortBy(com.filter(j => j.posicao === 'GOL'), scoreGoleiro)[0] ?? null;
  const usedIds = new Set<string>(goleiro ? [goleiro.id] : []);
  const avail = () => com.filter(j => !usedIds.has(j.id));

  // ── BLOCO DEFENSIVO ───────────────────────────────────────────────────────
  // Pool ZAG + LAT, ordenado por scoreJogoLimpo
  const defPool = sortBy(avail().filter(j => isZAG(j) || isLAT(j)), scoreJogoLimpo);
  const top5def = defPool.slice(0, 5);

  // Buscar APENAS dentro dos top-5 o melhor LD e o melhor LE
  const bestLDinTop5 = top5def.find(isLD) ?? null;
  const bestLEinTop5 = top5def.find(isLE) ?? null;

  let defesa: { jogador: JogadorComStats; role: string }[] = [];
  let lateraisForaDefesa: JogadorComStats[] = []; // laterais que sobraram para o meio

  if (bestLDinTop5 && bestLEinTop5) {
    // 4 defensores: LD + 2 melhores ZAG dos top-5 (excluindo os laterais) + LE
    // "melhores zagueiros" = quem não é lateral e está nos top-5
    const zagsTop5 = top5def
      .filter(j => j.id !== bestLDinTop5.id && j.id !== bestLEinTop5.id)
      // aceitar qualquer posição que não seja lateral (ZAG ou até LAT extra se não houver ZAG)
      .filter(j => isZAG(j))
      .slice(0, 2);

    // Se não houver 2 ZAGs nos top-5, completar com os melhores não-lateral
    const zagsOuDef = zagsTop5.length >= 2
      ? zagsTop5
      : top5def
          .filter(j => j.id !== bestLDinTop5.id && j.id !== bestLEinTop5.id)
          .slice(0, 2);

    defesa = [
      { jogador: bestLDinTop5, role: 'LD' },
      ...zagsOuDef.map(j => ({ jogador: j, role: isLD(j) ? 'LD' : isLE(j) ? 'LE' : 'ZAG' })),
      { jogador: bestLEinTop5, role: 'LE' },
    ];
    // Laterais não entram no meio neste cenário
    lateraisForaDefesa = [];
  } else {
    // Sem um lado completo: pegar os 3 melhores ZAGs dentro dos top-5
    // (se não houver 3 ZAGs nos top-5, pegar apenas os disponíveis)
    const zagsTop5 = top5def.filter(isZAG).slice(0, 3);
    defesa = zagsTop5.map(j => ({ jogador: j, role: 'ZAG' }));

    // Laterais que estavam nos top-5 mas não entraram na defesa ficam disponíveis para o meio
    const defIds = new Set(defesa.map(d => d.jogador.id));
    lateraisForaDefesa = top5def.filter(j => isLAT(j) && !defIds.has(j.id));
  }

  defesa.forEach(d => usedIds.add(d.jogador.id));
  const nDef = defesa.length; // 3 ou 4
  const lateraisNaDefesa = nDef === 4; // true = laterais já foram usados na defesa

  // ── BLOCO DE MEIO-CAMPO ───────────────────────────────────────────────────
  // Pool base: VOL + MC + MO (disponíveis, já excluindo usados)
  const meiPoolBase = sortBy(avail().filter(j => isVOL(j) || isMC(j) || isMO(j)), scoreJogoLimpo);

  // Se os laterais NÃO foram usados na defesa, tenta incluí-los no pool do meio (pool de 7)
  let meios: { jogador: JogadorComStats; role: string }[] = [];
  let lateraisNoMeio = false;

  if (!lateraisNaDefesa) {
    // Pool ampliado: LAT (disponíveis) + VOL + MC + MO → top-7
    const latDisponiveis = sortBy(avail().filter(j => isLAT(j)), scoreJogoLimpo);
    const poolAmpliado = sortBy([...latDisponiveis, ...meiPoolBase], scoreJogoLimpo);
    const top7 = poolAmpliado.slice(0, 7);

    const ldNoTop7 = top7.find(isLD) ?? null;
    const leNoTop7 = top7.find(isLE) ?? null;

    if (ldNoTop7 && leNoTop7) {
      // Pool de 7 tem LD e LE: montar com 2 laterais + 1 VOL + 1 MC + 1 MO (5 meios)
      // ou reduzir para 4 se faltar alguma posição
      lateraisNoMeio = true;

      const excl = new Set<string>();
      excl.add(ldNoTop7.id);
      excl.add(leNoTop7.id);

      const vol = meiPoolBase.find(j => isVOL(j) && !excl.has(j.id)) ?? null;
      if (vol) excl.add(vol.id);
      const mc = meiPoolBase.find(j => isMC(j) && !excl.has(j.id)) ?? null;
      if (mc) excl.add(mc.id);
      const mo = meiPoolBase.find(j => isMO(j) && !excl.has(j.id)) ?? null;

      // Montar a lista: LD + VOL? + MC? + MO? + LE
      const centroMeio = [
        ...(vol ? [{ jogador: vol, role: 'VOL' }] : []),
        ...(mc  ? [{ jogador: mc,  role: 'MC'  }] : []),
        ...(mo  ? [{ jogador: mo,  role: 'MO'  }] : []),
      ];

      meios = [
        { jogador: ldNoTop7, role: 'LD' },
        ...centroMeio,
        { jogador: leNoTop7, role: 'LE' },
      ];
      // Marcar todos como usados
      meios.forEach(m => usedIds.add(m.jogador.id));
    } else {
      // Pool de 7 não tem LD e LE: ignorar laterais e usar regra original de 5
      lateraisNoMeio = false;
      meios = buildMeiosCom5(meiPoolBase, usedIds);
      meios.forEach(m => usedIds.add(m.jogador.id));
    }
  } else {
    // Laterais já na defesa: regra original de 5
    meios = buildMeiosCom5(meiPoolBase, usedIds);
    meios.forEach(m => usedIds.add(m.jogador.id));
  }

  const nMei = meios.length;

  // ── BLOCO DE ATAQUE ───────────────────────────────────────────────────────
  const vagasAta = 11 - 1 - nDef - nMei;

  const ataPool = sortBy(avail().filter(j => j.posicao === 'ATA'), scoreJogoLimpo);
  const caPool  = ataPool.filter(isCA);
  const pdPool  = ataPool.filter(isPD);
  const pePool  = ataPool.filter(isPE);
  const semSub  = ataPool.filter(j => !j.sub_posicao);

  const pick1CA = (excl: Set<string>) => [...caPool, ...semSub].find(j => !excl.has(j.id)) ?? null;
  const pick1PD = (excl: Set<string>) => pdPool.find(j => !excl.has(j.id)) ?? null;
  const pick1PE = (excl: Set<string>) => pePool.find(j => !excl.has(j.id)) ?? null;

  let ataque: { jogador: JogadorComStats; role: string }[] = [];

  if (vagasAta <= 0) {
    ataque = [];
  } else if (vagasAta === 1) {
    const ca = pick1CA(usedIds);
    if (ca) ataque = [{ jogador: ca, role: 'CA' }];
  } else if (vagasAta === 2) {
    // PD e PE nos top-4? → um de cada. Senão → dois CA
    const top4 = ataPool.slice(0, 4);
    const excl = new Set(usedIds);
    if (top4.some(isPD) && top4.some(isPE)) {
      const pd = pick1PD(excl);
      if (pd) excl.add(pd.id);
      const pe = pick1PE(excl);
      ataque = [
        ...(pd ? [{ jogador: pd, role: 'PD' }] : []),
        ...(pe ? [{ jogador: pe, role: 'PE' }] : []),
      ];
      // completar com CA se faltar alguém
      while (ataque.length < 2) {
        const ataExcl = new Set([...excl, ...ataque.map(a => a.jogador.id)]);
        const ca = pick1CA(ataExcl);
        if (!ca) break;
        ataque.push({ jogador: ca, role: 'CA' });
      }
    } else {
      const ca1 = pick1CA(excl);
      if (ca1) excl.add(ca1.id);
      const ca2 = pick1CA(excl);
      ataque = [
        ...(ca1 ? [{ jogador: ca1, role: 'CA' }] : []),
        ...(ca2 ? [{ jogador: ca2, role: 'CA' }] : []),
      ];
    }
  } else {
    // 3+ vagas → 1 CA + 1 PD + 1 PE
    const excl = new Set(usedIds);
    const ca = pick1CA(excl); if (ca) excl.add(ca.id);
    const pd = pick1PD(excl); if (pd) excl.add(pd.id);
    const pe = pick1PE(excl); if (pe) excl.add(pe.id);
    ataque = [
      ...(ca ? [{ jogador: ca, role: 'CA' }] : []),
      ...(pd ? [{ jogador: pd, role: 'PD' }] : []),
      ...(pe ? [{ jogador: pe, role: 'PE' }] : []),
    ];
    // Completar vagas restantes com qualquer atacante disponível
    while (ataque.length < vagasAta) {
      const ataExcl = new Set([...excl, ...ataque.map(a => a.jogador.id)]);
      const extra = ataPool.find(j => !ataExcl.has(j.id));
      if (!extra) break;
      ataque.push({ jogador: extra, role: isCA(extra) ? 'CA' : isPD(extra) ? 'PD' : isPE(extra) ? 'PE' : 'ATA' });
    }
  }

  const nAta = ataque.length;

  return { goleiro, defesa, meios, ataque, lateraisNoMeio, nDef, nMei, nAta };
}

// Regra original de meio-campo com pool de 5 (VOL + MC + MO)
function buildMeiosCom5(
  meiPool: JogadorComStats[],
  usedIds: Set<string>,
): { jogador: JogadorComStats; role: string }[] {
  const top5 = meiPool.filter(j => !usedIds.has(j.id)).slice(0, 5);

  const cntVOL = top5.filter(isVOL).length;
  const cntMC  = top5.filter(isMC).length;
  const cntMO  = top5.filter(isMO).length;

  const roleLabel = (j: JogadorComStats) => isVOL(j) ? 'VOL' : isMO(j) ? 'MO' : 'MC';

  const bestOf = (fn: (j: JogadorComStats) => boolean, excl: Set<string>) =>
    meiPool.find(j => fn(j) && !excl.has(j.id) && !usedIds.has(j.id)) ?? null;

  if (cntVOL >= 3) {
    const excl = new Set<string>();
    const vols = top5.filter(isVOL).slice(0, 2); vols.forEach(j => excl.add(j.id));
    const mc = bestOf(isMC, excl); if (mc) excl.add(mc.id);
    const mo = bestOf(isMO, excl);
    return [...vols, ...(mc ? [mc] : []), ...(mo ? [mo] : [])].map(j => ({ jogador: j, role: roleLabel(j) }));
  }
  if (cntMC >= 3) {
    const excl = new Set<string>();
    const mcs = top5.filter(isMC).slice(0, 2); mcs.forEach(j => excl.add(j.id));
    const vol = bestOf(isVOL, excl); if (vol) excl.add(vol.id);
    const mo = bestOf(isMO, excl);
    return [...mcs, ...(vol ? [vol] : []), ...(mo ? [mo] : [])].map(j => ({ jogador: j, role: roleLabel(j) }));
  }
  if (cntMO >= 3) {
    const excl = new Set<string>();
    const mos = top5.filter(isMO).slice(0, 2); mos.forEach(j => excl.add(j.id));
    const vol = bestOf(isVOL, excl); if (vol) excl.add(vol.id);
    const mc = bestOf(isMC, excl);
    return [...mos, ...(vol ? [vol] : []), ...(mc ? [mc] : [])].map(j => ({ jogador: j, role: roleLabel(j) }));
  }

  // Nenhuma posição com 3+: se duas posições têm 2+ cada → manter os 5 do top5
  const pares = (cntVOL >= 2 ? 1 : 0) + (cntMC >= 2 ? 1 : 0) + (cntMO >= 2 ? 1 : 0);
  if (pares >= 2) {
    return top5.map(j => ({ jogador: j, role: roleLabel(j) }));
  }

  // Caso base: 1 de cada posição
  const excl = new Set<string>();
  const vol = bestOf(isVOL, excl); if (vol) excl.add(vol.id);
  const mc  = bestOf(isMC,  excl); if (mc)  excl.add(mc.id);
  const mo  = bestOf(isMO,  excl);
  return [
    ...(vol ? [vol] : []),
    ...(mc  ? [mc]  : []),
    ...(mo  ? [mo]  : []),
  ].map(j => ({ jogador: j, role: roleLabel(j) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTÃO DE JOGADOR — Melhor Time
// ─────────────────────────────────────────────────────────────────────────────

function BestPlayerCard({
  jogador, role, cor,
}: {
  jogador: JogadorComStats | null;
  role: string;
  cor: string;
}) {
  if (!jogador) return (
    <div style={{
      background: 'var(--surface2)', border: '1px dashed var(--border)',
      borderRadius: 8, padding: '.6rem .75rem', textAlign: 'center', flex: 1, minWidth: 88,
    }}>
      <div style={{ fontSize: '.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '.3rem' }}>{role}</div>
      <div style={{ fontSize: '.75rem', color: '#444' }}>—</div>
    </div>
  );

  const minVal = jogador.stats.minutos;
  const gs = jogador.posicao === 'GOL'
    ? (jogador.stats.gols_sofridos > 0
        ? `${Math.round(minVal / jogador.stats.gols_sofridos)}'∕gol`
        : '∞ min/gol')
    : null;

  return (
    <div style={{
      background: `${cor}12`, border: `1px solid ${cor}30`,
      borderRadius: 8, padding: '.65rem .75rem', textAlign: 'center',
      flex: 1, minWidth: 88,
    }}>
      <div style={{
        fontSize: '.58rem', color: cor,
        textTransform: 'uppercase', fontWeight: 700,
        letterSpacing: '.07em', marginBottom: '.2rem',
      }}>
        {role}
      </div>
      {jogador.numero && (
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: cor, lineHeight: 1.1 }}>
          #{jogador.numero}
        </div>
      )}
      <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)', margin: '.2rem 0' }}>
        {/* Último sobrenome para caber melhor */}
        {jogador.nome.split(' ').length > 1 ? jogador.nome.split(' ').pop() : jogador.nome}
      </div>
      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)' }}>
        {jogador.stats.partidas}j · {minVal}&apos;
      </div>
      {gs && (
        <div style={{ fontSize: '.62rem', color: cor, marginTop: '.15rem', fontWeight: 600 }}>{gs}</div>
      )}
      {!gs && jogador.stats.gols > 0 && (
        <div style={{ fontSize: '.62rem', color: '#22c55e', marginTop: '.15rem' }}>⚽ {jogador.stats.gols}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LINHA DO CAMPO (linha horizontal de cartões)
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({
  label, cor, players,
}: {
  label: string;
  cor: string;
  players: { jogador: JogadorComStats | null; role: string }[];
}) {
  if (players.length === 0) return null;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        fontSize: '.63rem', color: cor,
        textTransform: 'uppercase', letterSpacing: '.1em',
        fontWeight: 700, marginBottom: '.4rem',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {players.map((p, i) => (
          <BestPlayerCard key={p.jogador?.id ?? i} jogador={p.jogador} role={p.role} cor={cor} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function TimesClient({ timesData }: Props) {
  const [selectedTimeId, setSelectedTimeId] = useState<string>(timesData[0]?.time.id ?? '');
  const [abaJog, setAbaJog] = useState<'ativos' | 'vieram' | 'foramEmbora'>('ativos');

  const data = useMemo(
    () => timesData.find(d => d.time.id === selectedTimeId) ?? null,
    [timesData, selectedTimeId],
  );

  const mediaCasa = data && data.publicoCasa.jogos > 0
    ? Math.round(data.publicoCasa.total / data.publicoCasa.jogos) : null;
  const mediaVisitante = data && data.publicoVisitante.jogos > 0
    ? Math.round(data.publicoVisitante.total / data.publicoVisitante.jogos) : null;

  const bestTeam = useMemo(() => {
    if (!data || data.ativos.every(j => j.stats.partidas === 0)) return null;
    return calcBestTeam(data.ativos);
  }, [data]);

  if (!data) return (
    <div className="container" style={{ paddingTop: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
      Nenhum time encontrado.
    </div>
  );

  const { time, publicoCasa, publicoVisitante, ativos, foramEmbora, vieram } = data;
  const corTime = time.cor_primaria;
  const estadiosList = Object.values(publicoCasa.porEstadio).sort((a, b) => b.jogos - a.jogos);
  const jogadoresExibidos = abaJog === 'ativos' ? ativos : abaJog === 'vieram' ? vieram : foramEmbora;

  const tabStyle = (ativo: boolean): React.CSSProperties => ({
    padding: '.35rem .8rem',
    fontFamily: "'Bebas Neue',sans-serif",
    fontSize: '.9rem',
    letterSpacing: '.05em',
    borderRadius: 6,
    border: `1px solid ${ativo ? corTime : 'var(--border)'}`,
    background: ativo ? `${corTime}18` : 'transparent',
    color: ativo ? corTime : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all .15s',
  });

  // Formação em texto ex "4-4-2"
  const formacao = bestTeam
    ? `1-${bestTeam.nDef}-${bestTeam.nMei}-${bestTeam.nAta}`
    : '';

  return (
    <div style={{ paddingBottom: '4rem' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${corTime}18 50%, #0a0a0a 100%)`,
        borderBottom: '1px solid var(--border)',
        padding: '2.5rem 0 2rem',
        marginBottom: '2rem',
      }}>
        <div className="container">
          <p style={{ fontSize: '.75rem', color: corTime, textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700, marginBottom: '.4rem' }}>
            Perfil do Time
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <EscudoTime time={time} size={64} />
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', lineHeight: 1 }}>{time.nome}</h1>
              <div style={{ marginTop: '.75rem' }}>
                <select
                  value={selectedTimeId}
                  onChange={e => setSelectedTimeId(e.target.value)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', padding: '.45rem .85rem',
                    fontSize: '.9rem', fontFamily: 'Barlow, sans-serif', cursor: 'pointer',
                  }}
                >
                  {timesData.map(d => (
                    <option key={d.time.id} value={d.time.id}>{d.time.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">

        {/* ── Público ──────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
            👥 Público
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
                🏠 Média como Mandante
              </div>
              {publicoCasa.jogos === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados</p>
              ) : (
                <>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color: corTime, lineHeight: 1 }}>
                    {fmt(mediaCasa!)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                    {publicoCasa.jogos} jogo(s) · total: {fmt(publicoCasa.total)}
                  </div>
                </>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>
                ✈️ Média como Visitante
              </div>
              {publicoVisitante.jogos === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Sem dados</p>
              ) : (
                <>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '2.2rem', color: '#60a5fa', lineHeight: 1 }}>
                    {fmt(mediaVisitante!)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                    {publicoVisitante.jogos} jogo(s) · total: {fmt(publicoVisitante.total)}
                  </div>
                </>
              )}
            </div>
          </div>

          {estadiosList.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.75rem' }}>
                🏟️ Média por Estádio (Mandante)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {estadiosList.map(est => {
                  const media = est.jogos > 0 ? Math.round(est.total / est.jogos) : 0;
                  const maxMedia = estadiosList[0] ? Math.round(estadiosList[0].total / estadiosList[0].jogos) : 1;
                  const pct = maxMedia > 0 ? (media / maxMedia) * 100 : 0;
                  return (
                    <div key={est.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem', fontSize: '.85rem' }}>
                        <span>
                          {est.nome}
                          <span style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginLeft: '.4rem' }}>· {est.jogos}j</span>
                        </span>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: corTime }}>{fmt(media)}</span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 5 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: corTime, borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Jogadores ────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
            👤 Jogadores
          </h2>

          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button style={tabStyle(abaJog === 'ativos')} onClick={() => setAbaJog('ativos')}>
              ✅ Ativos ({ativos.length})
            </button>
            <button style={tabStyle(abaJog === 'vieram')} onClick={() => setAbaJog('vieram')}>
              📥 Vieram ({vieram.length})
            </button>
            <button style={tabStyle(abaJog === 'foramEmbora')} onClick={() => setAbaJog('foramEmbora')}>
              📤 Foram embora ({foramEmbora.length})
            </button>
          </div>

          {jogadoresExibidos.length === 0 ? (
            <div style={{
              color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem',
              background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
            }}>
              Nenhum jogador nesta categoria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead style={{ background: 'var(--surface2)', borderBottom: `2px solid ${corTime}` }}>
                  <tr>
                    {['#', 'Jogador', 'Pos.', 'P', 'Min', '⚽', 'Ast.', '🟨', '🟥',
                      abaJog === 'vieram' ? 'Chegou' : abaJog === 'foramEmbora' ? 'Passou por aqui' : 'Desde'
                    ].map(h => (
                      <th key={h} style={{
                        padding: '.55rem .65rem',
                        textAlign: h === 'Jogador' ? 'left' : 'center',
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: '.82rem', letterSpacing: '.06em',
                        color: 'var(--text-muted)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jogadoresExibidos.map((j, i) => {
                    const s = j.stats;
                    const subPosicao = j.sub_posicao && SUB_POS_LABEL[j.sub_posicao] ? SUB_POS_LABEL[j.sub_posicao] : null;
                    const cor = posColor(j.posicao);
                    const ultimaTransf = abaJog === 'vieram'
                      ? j.transferencias_aqui?.sort((a, b) => b.data.localeCompare(a.data))[0]
                      : j.transferencias.filter(tr => tr.time_id === time.id).sort((a, b) => b.data.localeCompare(a.data))[0];
                    return (
                      <tr key={j.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                        <td style={{ padding: '.5rem .65rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem' }}>
                          {j.numero ?? '—'}
                        </td>
                        <td style={{ padding: '.5rem .65rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {j.nome}
                          {j.idade && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginLeft: '.4rem' }}>{j.idade}a</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>
                          <span style={{ background: `${cor}18`, color: cor, border: `1px solid ${cor}33`, borderRadius: 4, fontSize: '.68rem', padding: '.15rem .4rem', fontWeight: 700 }}>
                            {subPosicao ?? j.posicao}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem' }}>{s.partidas || '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '1rem', color: 'var(--amarelo)', padding: '.5rem .5rem' }}>
                          {s.minutos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.gols > 0 ? '#22c55e' : 'var(--text-muted)', fontWeight: s.gols > 0 ? 600 : 400 }}>
                          {s.gols || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.assistencias > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                          {s.assistencias || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.cartoes_amarelos > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                          {s.cartoes_amarelos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', color: s.cartoes_vermelhos > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {s.cartoes_vermelhos || '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '.5rem .5rem', fontSize: '.75rem', color: 'var(--text-muted)' }}>
                          {ultimaTransf?.data ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Melhor Time ──────────────────────────────────────────────────────── */}
        {bestTeam ? (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '.35rem', paddingBottom: '.4rem', borderBottom: `2px solid ${corTime}` }}>
              ⭐ Melhor Time da Temporada
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.5rem',
                color: corTime, letterSpacing: '.08em',
              }}>
                {formacao}
              </span>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                <div>Goleiro: menor média de gols sofridos · Demais: jogo limpo (min∕cartão) + gols</div>
                {bestTeam.lateraisNoMeio && (
                  <div style={{ color: '#22c55e', marginTop: '.2rem' }}>
                    ↳ Laterais não encontrados nos top-5 da defesa — incluídos no meio-campo
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--surface)',
              border: `1px solid ${corTime}33`,
              borderRadius: 12, padding: '1.5rem',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* decoração sutil */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 220, height: 220,
                background: `${corTime}06`, borderRadius: '50%',
                transform: 'translate(70px,-70px)', pointerEvents: 'none',
              }} />

              <FieldRow
                label="Goleiro"
                cor="#f59e0b"
                players={bestTeam.goleiro ? [{ jogador: bestTeam.goleiro, role: 'GOL' }] : []}
              />

              <FieldRow
                label={`Defesa (${bestTeam.nDef})`}
                cor="#3b82f6"
                players={bestTeam.defesa}
              />

              <FieldRow
                label={
                  bestTeam.lateraisNoMeio
                    ? `Meio-campo com Laterais (${bestTeam.nMei})`
                    : `Meio-campo (${bestTeam.nMei})`
                }
                cor={bestTeam.lateraisNoMeio ? '#22c55e' : '#8b5cf6'}
                players={bestTeam.meios}
              />

              {bestTeam.ataque.length > 0 && (
                <FieldRow
                  label={`Ataque (${bestTeam.nAta})`}
                  cor="#ef4444"
                  players={bestTeam.ataque}
                />
              )}

              {/* Legenda */}
              <div style={{
                marginTop: '1rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)',
                display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
                fontSize: '.67rem', color: 'var(--text-muted)',
              }}>
                <span><strong style={{ color: 'var(--text)' }}>j</strong> Partidas disputadas</span>
                <span><strong style={{ color: 'var(--amarelo)' }}>&apos;</strong> Minutos em campo</span>
                <span><strong style={{ color: '#22c55e' }}>⚽</strong> Gols marcados</span>
                <span><strong style={{ color: '#f59e0b' }}>GOL</strong> min∕gol sofrido (∞ = nenhum gol sofrido)</span>
                <span>Defesa 3 ZAG ou LD+2ZAG+LE · Meio 3–5 · Ataque 1–3</span>
              </div>
            </div>
          </section>
        ) : (
          <div style={{
            color: 'var(--text-muted)', textAlign: 'center', padding: '2rem',
            background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '.85rem',
          }}>
            Nenhuma partida encerrada com jogadores deste time para montar o melhor time.
          </div>
        )}

      </div>
    </div>
  );
}
