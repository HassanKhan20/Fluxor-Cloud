// Small, warm SVG vignette for retirement-home pages.
// Two figures (caregiver + resident with cane) gently walking together while
// soft hearts drift upward. Designed to feel innocent and reassuring, not cute
// or infantilizing — the figures are abstract, the motion is slow.

interface WarmthIllustrationProps {
    size?: 'sm' | 'md' | 'lg';
    /** Show sun + ground line for the larger empty-state version. */
    scenic?: boolean;
}

export default function WarmthIllustration({ size = 'md', scenic = false }: WarmthIllustrationProps) {
    const dim = size === 'sm' ? 96 : size === 'md' ? 160 : 220;

    return (
        <div
            className="warmth-vignette relative inline-block"
            style={{ width: dim, height: dim }}
            aria-hidden="true"
        >
            <style>{`
                @keyframes warmth-bob {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-2px); }
                }
                @keyframes warmth-arm {
                    0%, 100% { transform: rotate(-4deg); }
                    50%      { transform: rotate(4deg); }
                }
                @keyframes warmth-cane {
                    0%, 100% { transform: rotate(0deg); }
                    50%      { transform: rotate(3deg); }
                }
                @keyframes warmth-heart-rise {
                    0%   { transform: translateY(0) scale(0.8); opacity: 0; }
                    20%  { opacity: 1; }
                    100% { transform: translateY(-30px) scale(1); opacity: 0; }
                }
                @keyframes warmth-sun {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.05); }
                }
                .warmth-vignette .figure-pair { animation: warmth-bob 3.4s ease-in-out infinite; transform-origin: bottom center; }
                .warmth-vignette .arm-link { animation: warmth-arm 3.4s ease-in-out infinite; transform-origin: 50% 0%; }
                .warmth-vignette .cane { animation: warmth-cane 3.4s ease-in-out infinite; transform-origin: top center; }
                .warmth-vignette .floating-heart { animation: warmth-heart-rise 3.6s ease-out infinite; transform-origin: center; }
                .warmth-vignette .floating-heart-2 { animation-delay: 1.2s; }
                .warmth-vignette .floating-heart-3 { animation-delay: 2.4s; }
                .warmth-vignette .sun { animation: warmth-sun 5s ease-in-out infinite; transform-origin: center; }
                @media (prefers-reduced-motion: reduce) {
                    .warmth-vignette * { animation: none !important; }
                }
            `}</style>

            <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="warmth-bg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ecfdf5" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                    <radialGradient id="warmth-sun-grad">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Background — soft circle */}
                <circle cx="100" cy="100" r="92" fill="url(#warmth-bg)" />

                {scenic && (
                    <>
                        {/* Sun */}
                        <g className="sun">
                            <circle cx="148" cy="56" r="14" fill="url(#warmth-sun-grad)" />
                            <circle cx="148" cy="56" r="8" fill="#fbbf24" opacity="0.65" />
                        </g>
                        {/* Soft hill / ground */}
                        <path d="M 0 156 Q 100 144 200 156 L 200 200 L 0 200 Z" fill="#d1fae5" opacity="0.7" />
                        <path d="M 0 162 Q 100 152 200 162" fill="none" stroke="#10b981" strokeOpacity="0.25" strokeWidth="1.2" />
                    </>
                )}

                {/* Floating hearts above the pair */}
                <g className="floating-heart" transform="translate(100 90)">
                    <path d="M 0 6 C -5 0, -10 -2, -10 -7 C -10 -10, -8 -12, -5 -12 C -3 -12, -1 -11, 0 -9 C 1 -11, 3 -12, 5 -12 C 8 -12, 10 -10, 10 -7 C 10 -2, 5 0, 0 6 Z"
                        fill="#10b981" opacity="0.85" />
                </g>
                <g className="floating-heart floating-heart-2" transform="translate(86 92)">
                    <path d="M 0 4 C -3.5 0, -7 -1.5, -7 -5 C -7 -7, -5.5 -8.5, -3.5 -8.5 C -2 -8.5, -0.5 -7.5, 0 -6 C 0.5 -7.5, 2 -8.5, 3.5 -8.5 C 5.5 -8.5, 7 -7, 7 -5 C 7 -1.5, 3.5 0, 0 4 Z"
                        fill="#34d399" opacity="0.75" />
                </g>
                <g className="floating-heart floating-heart-3" transform="translate(114 92)">
                    <path d="M 0 4 C -3.5 0, -7 -1.5, -7 -5 C -7 -7, -5.5 -8.5, -3.5 -8.5 C -2 -8.5, -0.5 -7.5, 0 -6 C 0.5 -7.5, 2 -8.5, 3.5 -8.5 C 5.5 -8.5, 7 -7, 7 -5 C 7 -1.5, 3.5 0, 0 4 Z"
                        fill="#6ee7b7" opacity="0.7" />
                </g>

                {/* Caregiver + resident figure pair */}
                <g className="figure-pair">
                    {/* Caregiver (slightly taller, scrubs) — left */}
                    <g transform="translate(80 110)">
                        {/* Head */}
                        <circle cx="0" cy="-8" r="9" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                        {/* Hair */}
                        <path d="M -8 -10 Q -8 -16 0 -17 Q 8 -16 8 -10 Q 7 -13 0 -14 Q -7 -13 -8 -10 Z" fill="#78350f" opacity="0.85" />
                        {/* Body (scrubs) */}
                        <path d="M -8 0 Q -10 18 -8 32 L 8 32 Q 10 18 8 0 Z" fill="#10b981" />
                        {/* Pocket detail */}
                        <rect x="-5" y="6" width="10" height="6" rx="1" fill="#059669" opacity="0.5" />
                        {/* Outer arm */}
                        <path d="M -8 2 Q -14 14 -12 26" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" />
                        {/* Inner arm — links to resident, gently swings */}
                        <g className="arm-link">
                            <path d="M 8 2 Q 14 12 18 18" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" />
                        </g>
                        {/* Legs */}
                        <line x1="-4" y1="32" x2="-4" y2="44" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="4" y1="32" x2="4" y2="44" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
                        {/* Shoes */}
                        <ellipse cx="-4" cy="46" rx="4" ry="2" fill="#1f2937" />
                        <ellipse cx="4" cy="46" rx="4" ry="2" fill="#1f2937" />
                    </g>

                    {/* Resident (smaller, cardigan + cane) — right */}
                    <g transform="translate(120 113)">
                        {/* Head */}
                        <circle cx="0" cy="-7" r="8" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                        {/* White hair (silver tone) */}
                        <path d="M -7 -9 Q -7 -14 0 -15 Q 7 -14 7 -9 Q 6 -12 0 -12 Q -6 -12 -7 -9 Z" fill="#e5e7eb" />
                        {/* Glasses */}
                        <circle cx="-3" cy="-7" r="2.2" fill="none" stroke="#374151" strokeWidth="0.7" />
                        <circle cx="3" cy="-7" r="2.2" fill="none" stroke="#374151" strokeWidth="0.7" />
                        <line x1="-0.8" y1="-7" x2="0.8" y2="-7" stroke="#374151" strokeWidth="0.7" />
                        {/* Cardigan body (warm beige) */}
                        <path d="M -7 1 Q -9 16 -7 28 L 7 28 Q 9 16 7 1 Z" fill="#fbbf24" opacity="0.85" />
                        {/* Cardigan front line */}
                        <line x1="0" y1="1" x2="0" y2="28" stroke="#92400e" strokeWidth="0.4" opacity="0.5" />
                        {/* Buttons */}
                        <circle cx="0" cy="8" r="0.8" fill="#92400e" />
                        <circle cx="0" cy="14" r="0.8" fill="#92400e" />
                        <circle cx="0" cy="20" r="0.8" fill="#92400e" />
                        {/* Outer arm holding cane */}
                        <path d="M 7 3 Q 12 10 14 18" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                        {/* Inner arm — links to caregiver */}
                        <path d="M -7 3 Q -12 10 -14 16" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                        {/* Cane */}
                        <g className="cane" transform="translate(15 18)">
                            <line x1="0" y1="0" x2="-1" y2="22" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
                            <path d="M 0 0 Q 3 -2 4 1" fill="none" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
                        </g>
                        {/* Legs */}
                        <line x1="-3" y1="28" x2="-3" y2="40" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
                        <line x1="3" y1="28" x2="3" y2="40" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
                        {/* Slippers */}
                        <ellipse cx="-3" cy="42" rx="3.5" ry="1.8" fill="#7c2d12" />
                        <ellipse cx="3" cy="42" rx="3.5" ry="1.8" fill="#7c2d12" />
                    </g>
                </g>
            </svg>
        </div>
    );
}
