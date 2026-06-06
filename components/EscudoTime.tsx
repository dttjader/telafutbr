'use client';
import { useState } from 'react';
import { Time } from '@/lib/types';

interface Props {
  time: Time | undefined;
  size?: number;
  showNome?: boolean;
}

// IDs da ESPN CDN para times da Série A 2026
const ESPN_IDS: Record<string, number> = {
  FLA: 819,
  PAL: 2029,
  CAM: 1063,
  BOT: 614,
  FLU: 3445,
  VAS: 1766,
  SAO: 2026,
  SPF: 2026,
  COR: 1035,
  SAN: 2034,
  INT: 1955,
  GRE: 6207,
  CRU: 1954,
  BAH: 2073,
  CAP: 2049,
  ATG: 2030,
  RBB: 5901,
  MIR: 10041,
  CHA: 6022,
  CFC: 2032,
  COT: 2032,
  REM: 5770,
  FOR: 2076,
  VIT: 2053,
};

export function EscudoTime({ time, size = 44, showNome = false }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!time) return null;

  const fontSize = Math.round(size * 0.28);
  const espnId = ESPN_IDS[time.sigla];
  const espnUrl = espnId && !imgError
    ? `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`
    : null;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: size,
        height: size,
        borderRadius: espnUrl ? 4 : '50%',
        background: espnUrl
          ? 'rgba(255,255,255,0.04)'
          : `linear-gradient(135deg, ${time.cor_primaria} 0%, ${time.cor_secundaria || '#888'} 100%)`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        border: espnUrl ? 'none' : '2px solid rgba(255,255,255,.12)',
        boxShadow: espnUrl ? 'none' : '0 2px 8px rgba(0,0,0,.5)',
      }}>
        {espnUrl ? (
          <img
            src={espnUrl}
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
