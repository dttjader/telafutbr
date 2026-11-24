'use client';
import { useEffect, useState } from 'react';
import {
  clientGetTemporadas, clientTemporadaSelecionada, definirTemporadaCookie,
  clientCriarTemporada, clientDefinirTemporadaAtual,
} from '@/lib/client';
import type { Temporada } from '@/lib/types';

// Gestão de temporadas (Admin/Config): ver, criar a próxima e definir qual é a atual.
export function GestaoTemporadas() {
  const [lista, setLista] = useState<Temporada[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [novoAno, setNovoAno] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const l = await clientGetTemporadas();
    setLista(l);
    setSel(await clientTemporadaSelecionada());
    setNovoAno(String(Math.max(...l.map(t => t.ano)) + 1));
  };
  useEffect(() => { load(); }, []);

  const aviso = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };

  const criar = async () => {
    const ano = Number(novoAno);
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return aviso('Informe um ano válido.');
    if (lista.some(t => t.ano === ano)) return aviso(`A temporada ${ano} já existe.`);
    if (!confirm(`Criar a temporada ${ano}? Ela começa sem partidas; os cadastros de times, estádios, jogadores e técnicos continuam os mesmos.`)) return;
    try {
      // Copia as vagas por zona da temporada selecionada; vagas diretas (por títulos) começam zeradas.
      const base = await fetch('/api/config').then(r => r.json());
      const configNova = {
        ...base,
        libertadores: { ...base.libertadores, vagas_diretas: [] },
        sulamericana: { ...base.sulamericana, vagas_diretas: [] },
      };
      await clientCriarTemporada(ano, configNova);
      aviso(`Temporada ${ano} criada.`);
      load();
    } catch (e) { aviso('Erro: ' + String(e)); }
  };

  const tornarAtual = async (ano: number) => {
    if (!confirm(`Definir ${ano} como a temporada atual (a que o site mostra por padrão)?`)) return;
    try {
      await clientDefinirTemporadaAtual(ano);
      definirTemporadaCookie(ano);
      window.location.reload();
    } catch (e) { aviso('Erro: ' + String(e)); }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.3rem', marginBottom: '.25rem', color: 'var(--amarelo)' }}>📅 Temporadas</h2>
      <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        As configurações abaixo e os cadastros de partidas valem para a temporada selecionada no menu
        {sel !== null && <> (agora: <strong style={{ color: 'var(--text)' }}>{sel}</strong>)</>}.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1rem' }}>
        {lista.map(t => (
          <div key={t.ano} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.9rem' }}>
            <strong style={{ minWidth: 48 }}>{t.ano}</strong>
            {t.atual && <span className="badge badge-amarelo">Atual</span>}
            {t.ano === sel && <span className="badge badge-cinza">Selecionada</span>}
            {!t.atual && (
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => tornarAtual(t.ano)}>
                Definir como atual
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="number" value={novoAno} onChange={e => setNovoAno(e.target.value)} style={{ width: 110 }} />
        <button className="btn btn-primary btn-sm" onClick={criar}>+ Nova temporada</button>
        {msg && <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{msg}</span>}
      </div>
    </div>
  );
}
