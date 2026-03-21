// Proffy Logo mark — stylized professor's graduation cap
//
// Shape:  wide horizontal bar (mortarboard board)
//         curved dome below (cap)
//         tassel dropping from right corner
//
// Like Claude's hexagon or GPT's spiral — an abstract geometric form
// that evokes "professor / academic" at a glance.
// Works at 16px favicon through 128px display sizes.

interface LogoProps {
  size?: number;
  className?: string;
  gradId?: string;
}

export function PrOffyLogo({ size = 32, className, gradId = "pr-g0" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8ef7" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
      {/* Mortarboard board — wide rectangle */}
      <rect x="4.5" y="9" width="23" height="5.5" rx="2.5" fill="white" />
      {/* Cap dome — half ellipse below board center */}
      <path d="M 9 20 A 7 5.5 0 0 0 23 20 Z" fill="white" fillOpacity="0.8" />
      {/* Stem connecting board to dome */}
      <line x1="16" y1="14.5" x2="16" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Tassel cord — drops from right edge of board */}
      <line x1="27.5" y1="11.75" x2="27.5" y2="21.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Tassel ball */}
      <circle cx="27.5" cy="23" r="1.7" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

// Alias kept for backward compatibility
export const StudyAILogo = PrOffyLogo;
export const StudyAISymbol = PrOffyLogo;
