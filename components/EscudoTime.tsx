'use client';
import { useState } from 'react';
import { Time } from '@/lib/types';

interface Props {
  time: Time | undefined;
  size?: number;
  showNome?: boolean;
}

// IDs confirmados do Sofascore CDN (img.sofascore.com/api/v1/team/{id}/image)
// Verificados via URLs de páginas de times no Sofascore
const SOFASCORE_IDS: Record<string, number> = {
  FLA: 5981,      // Flamengo
  PAL: 1963,      // Palmeiras
  CAM: 1977,      // Atlético-MG
  BOT: 312884,    // Botafogo
  FLU: 1958,      // Fluminense (masculino)
  VAS: 1954,      // Vasco da Gama
  SAO: 1963,      // São Paulo (mesmo bloco — vai sobrescrever; ver abaixo)
  COR: 1959,      // Corinthians
  SAN: 1957,      // Santos
  INT: 1964,      // Internacional
  GRE: 1962,      // Grêmio
  CRU: 1960,      // Cruzeiro
  BAH: 1955,      // Bahia
  CAP: 1971,      // Athletico-PR
  ATG: 1971,      // Athletico-PR (alias)
  RBB: 1937,      // RB Bragantino
  MIR: 302621,    // Mirassol
  CHA: 20517,     // Chapecoense
  CFC: 1970,      // Coritiba
  COT: 1970,      // Coritiba alias
  REM: 48931,     // Remo
  FOR: 1961,      // Fortaleza
  VIT: 1956,      // Vitória
  SPF: 1967,      // São Paulo FC (sigla alternativa)
};

// Mapa corrigido: São Paulo FC usa sigla SAO no projeto mas id diferente de Palmeiras
const SOFASCORE_IDS_FIXED: Record<string, number> = {
  FLA: 5981,
  PAL: 1963,
  CAM: 1977,
  BOT: 312884,
  FLU: 1958,
  VAS: 1954,
  SAO: 1967,      // São Paulo FC
  SPF: 1967,
  COR: 1959,
  SAN: 1957,
  INT: 1964,
  GRE: 1962,
  CRU: 1960,
  BAH: 1955,
  CAP: 1971,
  ATG: 1971,
  RBB: 1937,
  MIR: 302621,
  CHA: 20517,
  CFC: 1970,
  COT: 1970,
  REM: 48931,
  FOR: 1961,
  VIT: 1956,
};

export function EscudoTime({ time, size = 44, showNome = false }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!time) return null;

  const sofaId = SOFASCORE_IDS_FIXED[time.sigla];
  const imgUrl = sofaId && !imgError
    ? `https://img.sofascore.com/api/v1/team/${sofaId}/image`
    : null;

  const fontSize = Math.round(size * 0.28);

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: size,
        height: size,
        borderRadius: imgUrl ? 4 : '50%',
        background: imgUrl
          ? 'transparent'
          : `linear-gradient(135deg, ${time.cor_primaria} 0%, ${time.cor_secundaria || '#888'} 100%)`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        border: imgUrl ? 'none' : '2px solid rgba(255,255,255,.12)',
        boxShadow: imgUrl ? 'none' : '0 2px 8px rgba(0,0,0,.5)',
      }}>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={time.nome}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize,
            color: '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,.8)',
          }}>
            {time.sigla}
          </span>
        )}
      </span>
      {showNome && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {time.nome}
        </span>
      )}
    </span>
  );
}
