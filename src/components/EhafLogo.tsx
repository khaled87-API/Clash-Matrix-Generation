import React from 'react';

interface EhafLogoProps {
  className?: string;
  theme?: 'dark' | 'light';
  showSubtitle?: boolean;
}

/**
 * EHAF - QCES (Quality Control & Engineering Services) 2019 Corporate Logo
 *
 * Wide horizontal architectural engineering emblem with bilingual Arabic and English typography
 * and the iconic geometric structural crest.
 * Respects strict aspect ratio (never stretched vertically, never cropped).
 */
export const EhafLogo: React.FC<EhafLogoProps> = ({
  className = 'h-11 sm:h-12 w-auto',
  theme = 'dark',
  showSubtitle = true,
}) => {
  const isLight = theme === 'light';

  // Corporate EHAF Color Palette
  const primaryBlue = '#24438C';
  const cyanAccent = '#0798D1';
  const darkNavy = '#173875';
  const whiteText = '#FFFFFF';
  const lightBlueMuted = '#93C5FD';
  const lightSecondary = '#5B6B7A';

  const textMain = isLight ? primaryBlue : whiteText;
  const textSub = isLight ? cyanAccent : '#38BDF8';
  const textAr = isLight ? darkNavy : '#E0F2FE';
  const textDivision = isLight ? lightSecondary : '#94A3B8';

  return (
    <div
      className={`inline-flex items-center shrink-0 select-none ${className}`}
      style={{ aspectRatio: '480 / 100' }}
    >
      <svg
        viewBox="0 0 480 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="EHAF Consulting Engineers - Quality Control & Engineering Services (QCES)"
      >
        <defs>
          {/* Crest Gradients */}
          <linearGradient id="ehafCrestGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor={cyanAccent} />
          </linearGradient>

          <linearGradient id="ehafCrestGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cyanAccent} />
            <stop offset="100%" stopColor={primaryBlue} />
          </linearGradient>

          <linearGradient id="ehafCrestGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={darkNavy} />
            <stop offset="100%" stopColor={primaryBlue} />
          </linearGradient>

          <linearGradient id="ehafGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
          </linearGradient>

          {/* Subtle drop shadow for crest */}
          <filter id="crestShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor={isLight ? 'rgba(23,56,117,0.2)' : 'rgba(7,152,209,0.35)'}
            />
          </filter>
        </defs>

        {/* ==================================================== */}
        {/* 1. SIGNATURE GEOMETRIC / STRUCTURAL CREST            */}
        {/* ==================================================== */}
        <g transform="translate(10, 8)" filter="url(#crestShadow)">
          {/* Background Structural Shadow Plate */}
          <polygon
            points="42,4 80,26 80,68 42,90 4,68 4,26"
            fill={isLight ? 'rgba(36,67,140,0.06)' : 'rgba(7,152,209,0.1)'}
            stroke={isLight ? 'rgba(36,67,140,0.15)' : 'rgba(56,189,248,0.2)'}
            strokeWidth="1"
          />

          {/* Top-Right Facet (Bright Cyan & Prism Reflection) */}
          <polygon
            points="42,6 78,27 42,48 42,6"
            fill="url(#ehafCrestGrad1)"
            opacity="0.95"
          />

          {/* Right Lower Facet (Primary EHAF Royal Blue) */}
          <polygon
            points="78,27 78,67 42,88 42,48"
            fill="url(#ehafCrestGrad2)"
          />

          {/* Left Upper Facet (Mediterranean Cyan) */}
          <polygon
            points="42,6 42,48 6,27"
            fill="url(#ehafCrestGrad2)"
            opacity="0.85"
          />

          {/* Left Lower Facet (Deep Structural Dark Navy) */}
          <polygon
            points="42,48 42,88 6,67 6,27"
            fill="url(#ehafCrestGrad3)"
          />

          {/* Precision Architectural Beam Centerline / Meridian Highlight */}
          <polyline
            points="42,6 42,88"
            stroke={isLight ? '#FFFFFF' : '#BAE6FD'}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <polyline
            points="6,27 78,27"
            stroke={isLight ? '#FFFFFF' : '#BAE6FD'}
            strokeWidth="1"
            opacity="0.5"
          />
          <polyline
            points="6,67 78,67"
            stroke={isLight ? 'rgba(255,255,255,0.7)' : 'rgba(186,230,253,0.6)'}
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Central Structural Hex Node Accent */}
          <circle cx="42" cy="48" r="4.5" fill="#FFFFFF" />
          <circle cx="42" cy="48" r="2.5" fill={primaryBlue} />
        </g>

        {/* Divider Line between Crest & Typography */}
        <line
          x1="102"
          y1="14"
          x2="102"
          y2="88"
          stroke={isLight ? 'rgba(217,226,236,0.9)' : 'rgba(255,255,255,0.12)'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* ==================================================== */}
        {/* 2. BILINGUAL BRANDING TEXT                           */}
        {/* ==================================================== */}
        {/* Line 1: English Main Brand & Arabic Main Name */}
        <g transform="translate(116, 0)">
          {/* EHAF English Bold Brandmark */}
          <text
            x="0"
            y="35"
            fill={textMain}
            fontSize="26"
            fontWeight="900"
            letterSpacing="2.5"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
          >
            EHAF
          </text>

          {/* Arabic Brandmark: إيــهــاف للاستشارات الهندسية */}
          <text
            x="345"
            y="33"
            textAnchor="end"
            fill={textAr}
            fontSize="17"
            fontWeight="700"
            fontFamily="'Segoe UI', 'Cairo', 'Tahoma', 'Arial', sans-serif"
            direction="rtl"
          >
            إيـهـاف للاستشارات الهندسية
          </text>

          {/* Line 2: English Consulting Engineers & Arabic Subtitle */}
          <text
            x="1"
            y="54"
            fill={textSub}
            fontSize="10.5"
            fontWeight="700"
            letterSpacing="3"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            CONSULTING ENGINEERS
          </text>

          {/* Dividing Accent Line */}
          <line
            x1="0"
            y1="64"
            x2="345"
            y2="64"
            stroke={isLight ? 'rgba(7,152,209,0.25)' : 'rgba(7,152,209,0.3)'}
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Line 3: Quality Control & Engineering Services (QCES) */}
          {showSubtitle && (
            <>
              {/* QCES Badge / English Line */}
              <g transform="translate(0, 72)">
                {/* QCES pill indicator */}
                <rect
                  x="0"
                  y="2"
                  width="38"
                  height="14"
                  rx="3"
                  fill={isLight ? 'rgba(7,152,209,0.12)' : 'rgba(7,152,209,0.22)'}
                  stroke={isLight ? 'rgba(7,152,209,0.35)' : 'rgba(7,152,209,0.45)'}
                  strokeWidth="0.8"
                />
                <text
                  x="19"
                  y="12.5"
                  textAnchor="middle"
                  fill={isLight ? darkNavy : '#38BDF8'}
                  fontSize="8.5"
                  fontWeight="800"
                  letterSpacing="0.8"
                  fontFamily="system-ui, sans-serif"
                >
                  QCES
                </text>

                <text
                  x="44"
                  y="13"
                  fill={textDivision}
                  fontSize="8.5"
                  fontWeight="600"
                  letterSpacing="0.6"
                  fontFamily="system-ui, sans-serif"
                >
                  Quality Control &amp; Engineering Services
                </text>

                {/* Arabic Division: خدمات مراقبة الجودة والهندسة */}
                <text
                  x="345"
                  y="12.5"
                  textAnchor="end"
                  fill={textDivision}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="'Segoe UI', 'Cairo', 'Tahoma', 'Arial', sans-serif"
                  direction="rtl"
                >
                  خدمات مراقبة الجودة والهندسة
                </text>
              </g>
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
