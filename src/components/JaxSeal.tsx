// Stylized Jacksonville civic seal placeholder.
// The official seal is copyrighted; this is a Liftori-original tribute mark in the
// city's traditional navy + gold palette. Replace with city-provided asset post-award.
export function JaxSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Jacksonville civic seal">
      <circle cx="32" cy="32" r="30" fill="currentColor" opacity="0.15" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M 14 36 Q 22 32 30 36 T 46 36 T 50 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M 14 40 Q 22 36 30 40 T 46 40 T 50 40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M 32 18 L 33.5 23 L 38.5 23 L 34.5 26 L 36 31 L 32 28 L 28 31 L 29.5 26 L 25.5 23 L 30.5 23 Z" fill="currentColor" />
    </svg>
  )
}
