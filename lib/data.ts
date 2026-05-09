import fs from 'fs';
import path from 'path';
import { Estadio, Time, Jogador, Partida } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(file: string): T {
  const filePath = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJson<T>(file: string, data: T): void {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Estádios ──────────────────────────────────────────────
export function getEstadios(): Estadio[] {
  return readJson<Estadio[]>('estadios.json');
}
export function saveEstadios(data: Estadio[]) {
  writeJson('estadios.json', data);
}
export function getEstadio(id: string) {
  return getEstadios().find(e => e.id === id);
}

// ── Times ─────────────────────────────────────────────────
export function getTimes(): Time[] {
  return readJson<Time[]>('times.json');
}
export function getTime(id: string) {
  return getTimes().find(t => t.id === id);
}

// ── Jogadores ─────────────────────────────────────────────
export function getJogadores(): Jogador[] {
  return readJson<Jogador[]>('jogadores.json');
}
export function saveJogadores(data: Jogador[]) {
  writeJson('jogadores.json', data);
}
export function getJogador(id: string) {
  return getJogadores().find(j => j.id === id);
}
export function getJogadoresDoTime(timeId: string) {
  return getJogadores().filter(j => j.time_atual === timeId);
}

// ── Partidas ──────────────────────────────────────────────
export function getPartidas(): Partida[] {
  return readJson<Partida[]>('partidas.json');
}
export function savePartidas(data: Partida[]) {
  writeJson('partidas.json', data);
}
export function getPartida(id: string) {
  return getPartidas().find(p => p.id === id);
}

// ── Tabela ────────────────────────────────────────────────
export function calcularTabela() {
  const partidas = getPartidas().filter(p => p.status === 'encerrada');
  const times = getTimes();
  const map: Record<string, {
    time_id: string; pontos: number; jogos: number; vitorias: number;
    empates: number; derrotas: number; gols_pro: number; gols_contra: number;
  }> = {};

  times.forEach(t => {
    map[t.id] = { time_id: t.id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 };
  });

  for (const p of partidas) {
    const c = map[p.time_casa_id];
    const v = map[p.time_visitante_id];
    if (!c || !v) continue;
    c.jogos++; v.jogos++;
    c.gols_pro += p.placar_casa; c.gols_contra += p.placar_visitante;
    v.gols_pro += p.placar_visitante; v.gols_contra += p.placar_casa;
    if (p.placar_casa > p.placar_visitante) { c.vitorias++; c.pontos += 3; v.derrotas++; }
    else if (p.placar_casa < p.placar_visitante) { v.vitorias++; v.pontos += 3; c.derrotas++; }
    else { c.empates++; c.pontos++; v.empates++; v.pontos++; }
  }

  return Object.values(map)
    .filter(t => t.jogos > 0)
    .sort((a, b) => b.pontos - a.pontos || (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) || b.gols_pro - a.gols_pro)
    .map((t, i) => ({ ...t, posicao: i + 1, saldo: t.gols_pro - t.gols_contra }));
}

// ── Artilharia ────────────────────────────────────────────
export function calcularArtilharia() {
  const partidas = getPartidas().filter(p => p.status === 'encerrada');
  const map: Record<string, { jogador_id: string; time_id: string; quantidade: number }> = {};
  for (const p of partidas) {
    for (const g of p.gols) {
      if (g.tipo === 'contra') continue;
      const key = g.jogador_id;
      if (!map[key]) map[key] = { jogador_id: g.jogador_id, time_id: g.time_id, quantidade: 0 };
      map[key].quantidade++;
    }
  }
  return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
}

// ── Helpers ───────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

export function zonaClassificacao(pos: number) {
  if (pos <= 4) return 'libertadores';
  if (pos <= 6) return 'sulamericana';
  if (pos >= 18) return 'rebaixamento';
  return 'neutro';
}

export const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];
