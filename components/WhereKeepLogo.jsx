export default function WhereKeepLogo({
  showWordmark = true,
  className = "",
  markClassName = "",
}) {
  return (
    <span
      className={`inline-flex items-center text-[var(--stocksense-brand)] ${className}`}
      aria-label="WhereKeep"
    >
      <svg
        className={`h-12 w-auto shrink-0 overflow-visible ${markClassName}`}
        viewBox={showWordmark ? "0 0 1240 420" : "120 40 300 340"}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="WhereKeep logo"
      >
        <defs>
          <linearGradient id="wherekeep-teal-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--stocksense-brand-border)" />
            <stop offset="55%" stopColor="var(--stocksense-brand)" />
            <stop offset="100%" stopColor="var(--stocksense-brand-dark)" />
          </linearGradient>

          <linearGradient id="wherekeep-word-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--stocksense-brand-border)" />
            <stop offset="50%" stopColor="var(--stocksense-brand)" />
            <stop offset="100%" stopColor="var(--stocksense-brand-dark)" />
          </linearGradient>
        </defs>

        <g transform="translate(140 60)">
          <path
            d="M130 0C68 0 18 50 18 112c0 89 112 190 112 190s112-101 112-190C242 50 192 0 130 0Z"
            fill="url(#wherekeep-teal-grad)"
          />

          <path
            d="M130 24c-48 0-88 39-88 88 0 67 88 151 88 151s88-84 88-151c0-49-40-88-88-88Z"
            fill="var(--stocksense-brand-dark)"
          />

          <path
            d="M130 41c-40 0-72 32-72 72 0 56 72 124 72 124s72-68 72-124c0-40-32-72-72-72Z"
            fill="var(--stocksense-brand)"
            opacity="0.34"
          />

          <rect x="72" y="92" width="116" height="10" rx="5" fill="var(--stocksense-brand-border)" />
          <rect x="72" y="151" width="116" height="10" rx="5" fill="var(--stocksense-brand-border)" />
          <rect x="64" y="80" width="10" height="92" rx="5" fill="var(--stocksense-brand)" />
          <rect x="186" y="80" width="10" height="92" rx="5" fill="var(--stocksense-brand)" />

          <rect x="83" y="56" width="58" height="48" rx="6" fill="var(--stocksense-brand)" />
          <rect x="149" y="72" width="44" height="32" rx="5" fill="var(--stocksense-brand-soft)" />
          <rect x="83" y="114" width="58" height="48" rx="6" fill="var(--stocksense-brand)" />
          <rect x="149" y="114" width="44" height="23" rx="5" fill="var(--stocksense-brand-soft)" />
          <rect x="149" y="142" width="44" height="23" rx="5" fill="var(--stocksense-brand-soft)" />

          <rect x="103" y="71" width="20" height="5" rx="2.5" fill="var(--stocksense-brand-dark)" />
          <rect x="162" y="82" width="19" height="5" rx="2.5" fill="var(--stocksense-brand-dark)" />
          <rect x="103" y="128" width="20" height="5" rx="2.5" fill="var(--stocksense-brand-dark)" />
          <rect x="162" y="124" width="19" height="5" rx="2.5" fill="var(--stocksense-brand-dark)" />
          <rect x="162" y="151" width="19" height="5" rx="2.5" fill="var(--stocksense-brand-dark)" />

          <path
            d="M82 194l38 38 66-75"
            fill="none"
            stroke="var(--stocksense-brand-border)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {showWordmark && (
          <text
            x="430"
            y="245"
            fontFamily="var(--stocksense-font-family), Inter, Poppins, Montserrat, Arial, sans-serif"
            fontSize="118"
            fontWeight="800"
            letterSpacing="-3"
            fill="url(#wherekeep-word-grad)"
          >
            WhereKeep
          </text>
        )}
      </svg>
    </span>
  );
}
