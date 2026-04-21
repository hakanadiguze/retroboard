// ─── RetroBoard Logo — Concept A ──────────────────────────────────────────────
// Circle with post-it grid + cycle arrow
// size: icon diameter in px (default 40)
// variant: "color" | "white" | "dark"

export function LogoIcon({ size = 40 }) {
  const s = size;
  const id = `rb-grad-${size}`;
  return (
    <svg width={s} height={s} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D9E9E"/>
          <stop offset="100%" stopColor="#076F6F"/>
        </linearGradient>
      </defs>
      {/* Circle background */}
      <circle cx="28" cy="28" r="28" fill={`url(#${id})`}/>
      {/* Post-it grid — 3×3 */}
      <rect x="12" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.9"/>
      <rect x="22" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6"/>
      <rect x="32" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.35"/>
      <rect x="12" y="24" width="7" height="7" rx="1.5" fill="white" opacity="0.6"/>
      <rect x="22" y="24" width="7" height="7" rx="1.5" fill="#FCD34D" opacity="0.95"/>
      <rect x="32" y="24" width="7" height="7" rx="1.5" fill="white" opacity="0.65"/>
      <rect x="12" y="34" width="7" height="5" rx="1.5" fill="white" opacity="0.35"/>
      <rect x="22" y="34" width="7" height="5" rx="1.5" fill="white" opacity="0.45"/>
      <rect x="32" y="34" width="7" height="5" rx="1.5" fill="#34D399" opacity="0.9"/>
      {/* Cycle arrow arc */}
      <path d="M28 6 A22 22 0 1 1 6 28"
        stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.92"/>
      {/* Arrow head */}
      <polygon points="3,21 6,30 11,23" fill="white" opacity="0.92"/>
    </svg>
  );
}

export function LogoFull({ size = 40, dark = false }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap: size * 0.3 }}>
      <LogoIcon size={size}/>
      <div>
        <div style={{
          fontSize: size * 0.5,
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
          color: dark ? "#0A2020" : "#ffffff",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          Retro<span style={{ color:"#0D9E9E" }}>Board</span>
        </div>
        {size >= 36 && (
          <div style={{
            fontSize: size * 0.17,
            fontWeight: 700,
            letterSpacing: "2px",
            color: dark ? "#5A7878" : "rgba(127,218,218,0.8)",
            textTransform: "uppercase",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}>
            Agile Retrospectives
          </div>
        )}
      </div>
    </div>
  );
}
