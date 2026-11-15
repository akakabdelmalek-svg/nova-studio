import React from 'react';

interface NovaLogoProps {
  size?: number;
  className?: string;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HN Nova Studio Logo"
      className={className}
    >
      <defs>
        <linearGradient id="hnLogoGrad" x1="18" y1="12" x2="102" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#19E6D6" />
          <stop offset="50%" stopColor="#3ABFF8" />
          <stop offset="100%" stopColor="#607BF8" />
        </linearGradient>
      </defs>

      {/* Deep navy background plate matching brand mark */}
      <rect x="2" y="2" width="116" height="116" rx="22" fill="#061422" />
      <rect x="2.75" y="2.75" width="114.5" height="114.5" rx="21.25" stroke="url(#hnLogoGrad)" strokeOpacity="0.28" strokeWidth="1.5" />

      {/* Outer & inner layered rotated diamond rings */}
      <g transform="translate(60 60) rotate(45)">
        <rect x="-32" y="-32" width="64" height="64" rx="14" stroke="url(#hnLogoGrad)" strokeWidth="4.2" />
        <rect x="-25.5" y="-25.5" width="51" height="51" rx="10.5" stroke="url(#hnLogoGrad)" strokeWidth="2.1" strokeOpacity="0.88" />
      </g>

      {/* Corner circuit nodes */}
      {/* Top-Left */}
      <rect x="16" y="21" width="16" height="16" rx="4.5" fill="url(#hnLogoGrad)" />
      <rect x="33" y="10" width="9" height="9" rx="2.5" fill="url(#hnLogoGrad)" />
      <path d="M29 24 L36 16" stroke="url(#hnLogoGrad)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M28 33 C36 37 42 36 48 31" stroke="url(#hnLogoGrad)" strokeWidth="3.2" strokeLinecap="round" />

      {/* Top-Right */}
      <rect x="88" y="16" width="15" height="15" rx="4" fill="url(#hnLogoGrad)" />
      <rect x="103" y="34" width="9" height="9" rx="2.5" fill="url(#hnLogoGrad)" />
      <path d="M99 28 L106 36" stroke="url(#hnLogoGrad)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M90 27 C86 35 86 43 92 50" stroke="url(#hnLogoGrad)" strokeWidth="3.2" strokeLinecap="round" />

      {/* Bottom-Left */}
      <rect x="17" y="88" width="15" height="15" rx="4" fill="url(#hnLogoGrad)" />
      <rect x="11" y="76" width="8.5" height="8.5" rx="2.3" fill="url(#hnLogoGrad)" />
      <path d="M22 90 L16 82" stroke="url(#hnLogoGrad)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M29 91 C34 83 34 75 28 69" stroke="url(#hnLogoGrad)" strokeWidth="3.2" strokeLinecap="round" />

      {/* Bottom-Right */}
      <rect x="88" y="82" width="16" height="16" rx="4.5" fill="url(#hnLogoGrad)" />
      <rect x="78" y="101" width="9" height="9" rx="2.5" fill="url(#hnLogoGrad)" />
      <path d="M91 96 L84 104" stroke="url(#hnLogoGrad)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M91 86 C83 82 77 83 70 89" stroke="url(#hnLogoGrad)" strokeWidth="3.2" strokeLinecap="round" />

      {/* Side accent diamonds */}
      <g fill="url(#hnLogoGrad)">
        <rect x="68" y="12" width="9" height="9" rx="2.2" transform="rotate(45 72.5 16.5)" />
        <rect x="78" y="21" width="6.5" height="6.5" rx="1.6" transform="rotate(45 81.25 24.25)" />
        <rect x="14" y="45" width="8.5" height="8.5" rx="2" transform="rotate(45 18.25 49.25)" />
        <rect x="23" y="38" width="6" height="6" rx="1.5" transform="rotate(45 26 41)" />
        <rect x="97" y="67" width="8.5" height="8.5" rx="2" transform="rotate(45 101.25 71.25)" />
        <rect x="90" y="75" width="6" height="6" rx="1.5" transform="rotate(45 93 78)" />
        <rect x="42" y="99" width="9" height="9" rx="2.2" transform="rotate(45 46.5 103.5)" />
        <rect x="35" y="91" width="6.5" height="6.5" rx="1.6" transform="rotate(45 38.25 94.25)" />
      </g>

      {/* Bold Center HN Monogram */}
      <text
        x="60"
        y="62"
        textAnchor="middle"
        dominantBaseline="central"
        fill="url(#hnLogoGrad)"
        fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
        fontWeight="800"
        fontSize="29"
        letterSpacing="1"
      >
        HN
      </text>
    </svg>
  );
};
