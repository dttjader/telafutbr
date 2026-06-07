// Client-safe — recebe os dados via props, sem imports de Node.js
import { Time } from '@/lib/types';

interface Props {
  time: Time | undefined;
  size?: number;
  showNome?: boolean;
}

// Escudos SVG simplificados inline — sem dependência de CDN externa
// Cada escudo é um SVG minimalista fiel às cores e símbolos do time
function EscudoSVG({ sigla, corPrimaria, corSecundaria, size }: {
  sigla: string;
  corPrimaria: string;
  corSecundaria: string;
  size: number;
}) {
  const s = size;
  const r = s / 2;
  const escudos: Record<string, JSX.Element> = {

    // Flamengo — listras horizontais preto e vermelho com escudo
    FLA: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="fla-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <rect x="2" y="11" width="40" height="10" fill="#000" clipPath="url(#fla-clip)"/>
        <rect x="2" y="23" width="40" height="10" fill="#000" clipPath="url(#fla-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="serif">FLA</text>
      </svg>
    ),

    // Palmeiras — verde com palma branca
    PAL: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#006437"/>
        <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="serif">PAL</text>
      </svg>
    ),

    // Atlético-MG — preto com galo
    CAM: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#000"/>
        <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="serif">CAM</text>
      </svg>
    ),

    // Botafogo — listras verticais preto e branco
    BOT: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="bot-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#fff"/>
        <rect x="2"  y="2" width="10" height="40" fill="#000" clipPath="url(#bot-clip)"/>
        <rect x="22" y="2" width="10" height="40" fill="#000" clipPath="url(#bot-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#000" fontFamily="serif">BOT</text>
      </svg>
    ),

    // Fluminense — tricolor: grená, verde, branco
    FLU: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="flu-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#fff"/>
        <rect x="2"  y="2" width="13" height="40" fill="#6B0A0A" clipPath="url(#flu-clip)"/>
        <rect x="29" y="2" width="13" height="40" fill="#228B22" clipPath="url(#flu-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#6B0A0A" fontFamily="serif">FLU</text>
      </svg>
    ),

    // Vasco — preto e branco com cruz
    VAS: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#000"/>
        <rect x="20" y="6"  width="4" height="32" fill="#fff"/>
        <rect x="10" y="20" width="24" height="4"  fill="#fff"/>
        <text x="22" y="38" textAnchor="middle" fontSize="6" fill="#fff" fontFamily="sans-serif">VAS</text>
      </svg>
    ),

    // São Paulo — tricolor: vermelho, branco, preto
    SAO: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="sao-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#fff"/>
        <rect x="2" y="2"  width="40" height="13" fill="#CC0000" clipPath="url(#sao-clip)"/>
        <rect x="2" y="29" width="40" height="13" fill="#000"    clipPath="url(#sao-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000" fontFamily="serif">SPF</text>
      </svg>
    ),
    SPF: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="spf-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#fff"/>
        <rect x="2" y="2"  width="40" height="13" fill="#CC0000" clipPath="url(#spf-clip)"/>
        <rect x="2" y="29" width="40" height="13" fill="#000"    clipPath="url(#spf-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000" fontFamily="serif">SPF</text>
      </svg>
    ),

    // Corinthians — preto e branco
    COR: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#000"/>
        <ellipse cx="22" cy="22" rx="14" ry="14" fill="#fff"/>
        <text x="22" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000" fontFamily="serif">COR</text>
      </svg>
    ),

    // Santos — preto e branco vertical
    SAN: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="san-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#fff"/>
        <rect x="12" y="2" width="20" height="40" fill="#000" clipPath="url(#san-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">SAN</text>
      </svg>
    ),

    // Internacional — vermelho
    INT: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="serif">INT</text>
      </svg>
    ),

    // Grêmio — azul, preto e branco tricolor
    GRE: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="gre-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#0B3D91"/>
        <rect x="2"  y="2"  width="13" height="40" fill="#000" clipPath="url(#gre-clip)"/>
        <rect x="29" y="2"  width="13" height="40" fill="#fff" clipPath="url(#gre-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">GRE</text>
      </svg>
    ),

    // Cruzeiro — azul celeste
    CRU: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#0A2C6E"/>
        <text x="22" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="serif">CRU</text>
        {/* Cruz do Sul simplificada */}
        <text x="22" y="32" textAnchor="middle" fontSize="10" fill="#fff">✦</text>
      </svg>
    ),

    // Bahia — azul e vermelho
    BAH: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="bah-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#0A2C6E"/>
        <polygon points="22,2 42,22 22,42 2,22" fill="#CC0000" clipPath="url(#bah-clip)"/>
        <text x="22" y="26" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="serif">BAH</text>
      </svg>
    ),

    // Athletico-PR — vermelho e preto
    CAP: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="cap-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <rect x="2" y="18" width="40" height="8" fill="#000" clipPath="url(#cap-clip)"/>
        <text x="22" y="35" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="serif">CAP</text>
      </svg>
    ),
    ATG: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="atg-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <rect x="2" y="18" width="40" height="8" fill="#000" clipPath="url(#atg-clip)"/>
        <text x="22" y="35" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="serif">CAP</text>
      </svg>
    ),

    // RB Bragantino — vermelho e branco
    RBB: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <ellipse cx="22" cy="22" rx="12" ry="12" fill="#fff"/>
        <text x="22" y="26" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#CC0000" fontFamily="sans-serif">RBB</text>
      </svg>
    ),

    // Mirassol — amarelo e preto
    MIR: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#FFD700"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#000" fontFamily="serif">MIR</text>
      </svg>
    ),

    // Chapecoense — verde
    CHA: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#2D8C2D"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">CHA</text>
      </svg>
    ),

    // Coritiba — verde
    CFC: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#006633"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">CFC</text>
      </svg>
    ),
    COT: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#006633"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">COT</text>
      </svg>
    ),

    // Remo — azul
    REM: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#003DA5"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">REM</text>
      </svg>
    ),

    // Fortaleza — azul, vermelho e branco
    FOR: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="for-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#0A2C6E"/>
        <rect x="2" y="29" width="40" height="14" fill="#CC0000" clipPath="url(#for-clip)"/>
        <text x="22" y="22" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff" fontFamily="serif">FOR</text>
      </svg>
    ),

    // Vitória — vermelho e preto
    VIT: (
      <svg width={s} height={s} viewBox="0 0 44 44">
        <defs>
          <clipPath id="vit-clip"><ellipse cx="22" cy="22" rx="20" ry="20"/></clipPath>
        </defs>
        <ellipse cx="22" cy="22" rx="20" ry="20" fill="#CC0000"/>
        <rect x="2"  y="2"  width="13" height="40" fill="#000" clipPath="url(#vit-clip)"/>
        <rect x="29" y="2"  width="13" height="40" fill="#000" clipPath="url(#vit-clip)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff" fontFamily="serif">VIT</text>
      </svg>
    ),
  };

  return escudos[sigla] ?? null;
}

export function EscudoTime({ time, size = 44, showNome = false }: Props) {
  if (!time) return null;

  const fontSize = Math.round(size * 0.28);
  const svg = EscudoSVG({ sigla: time.sigla, corPrimaria: time.cor_primaria, corSecundaria: time.cor_secundaria || '#888', size });

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        background: svg ? 'transparent' : `linear-gradient(135deg, ${time.cor_primaria} 0%, ${time.cor_secundaria || '#888'} 100%)`,
        border: svg ? 'none' : '2px solid rgba(255,255,255,.12)',
        boxShadow: svg ? 'none' : '0 2px 8px rgba(0,0,0,.5)',
      }}>
        {svg ?? (
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
