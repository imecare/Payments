import React from 'react';

/**
 * Componente JumperLogo
 * Uso: <JumperLogo className="w-64 h-auto" />
 * Se adapta perfectamente a fondos claros.
 */

interface JumperLogoProps {
  className?: string;
  [key: string]: unknown;
}

const JumperLogo: React.FC<JumperLogoProps> = ({ className = "w-full h-auto", ...props }) => {
  return (
    <div className={className} {...props}>
      <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="jumperGrad" x1="0" y1="120" x2="120" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a8a" /> {/* Blue 900 */}
            <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan 500 */}
          </linearGradient>
        </defs>
        <g transform="translate(10, 10)">
          <circle cx="50" cy="50" r="46" stroke="url(#jumperGrad)" strokeWidth="4" />
          <path d="M25 85C30 65 50 45 80 35" stroke="url(#jumperGrad)" strokeWidth="6" strokeLinecap="round" />
          <path d="M25 75C35 55 55 40 75 25" stroke="url(#jumperGrad)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="35" r="5" fill="#06b6d4" />
          <circle cx="75" cy="25" r="4" fill="#06b6d4" />
          <circle cx="88" cy="45" r="6" fill="#1e3a8a" />
          <line x1="80" y1="35" x2="88" y2="45" stroke="#1e3a8a" strokeWidth="2" />
        </g>
        <text x="120" y="70" fontFamily="sans-serif" fontWeight="900" fontSize="56" fill="#1e3a8a">
          JUMPER
        </text>
        <text x="122" y="95" fontFamily="sans-serif" fontWeight="600" fontSize="16" fill="#64748b">
          A BUSINESSCLOUD SERVICE
        </text>
      </svg>
    </div>
  );
};

export default JumperLogo;
