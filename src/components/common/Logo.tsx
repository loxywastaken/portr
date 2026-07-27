interface LogoProps {
  className?: string;
}

/**
 * Loxy's Portfolios brand mark. Monochrome — inherits the current text color
 * via `currentColor`, so `text-white` (or any ink token) sets its colour.
 */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 684 532"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      role="img"
      aria-label="Loxy's Portfolios"
      className={className}
    >
      <path d="M 195 228 L 138 279 L 210 322 L 257 282 Z M 682 2 L 192 137 L 3 305 L 241 480 L 163 367 L 202 328 L 106 281 L 190 207 L 429 141 L 306 243 L 346 282 L 247 366 L 353 449 L 669 531 L 416 340 L 384 366 L 590 491 L 354 365 L 509 235 L 417 232 Z" />
    </svg>
  );
}
