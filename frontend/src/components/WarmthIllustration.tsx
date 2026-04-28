// Small, warm inline-SVG vignettes for retirement-home pages.
// Each variant is hand-drawn to match a specific page's purpose. All animations
// run on CSS keyframes (no JS) and respect prefers-reduced-motion.

export type WarmthVariant =
    | 'caregiving'  // Residents page: caregiver + resident with floating hearts
    | 'morning'     // Dashboard:      sunrise over a small care home with birds
    | 'kitchen'     // Menu & Plan:    pot with steam + ingredients
    | 'prep'        // Today's Prep:   clipboard with checks + chef hat
    | 'tray';       // Tray Tickets:   serving tray with cloche + steam

interface WarmthIllustrationProps {
    variant?: WarmthVariant;
    size?: 'sm' | 'md' | 'lg';
    /** Adds sun + hill background (used on empty states). Caregiving only. */
    scenic?: boolean;
}

const SHARED_CSS = `
@keyframes warmth-bob       { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-2px);} }
@keyframes warmth-arm       { 0%,100%{ transform:rotate(-4deg);} 50%{ transform:rotate(4deg);} }
@keyframes warmth-cane      { 0%,100%{ transform:rotate(0deg);}  50%{ transform:rotate(3deg);} }
@keyframes warmth-rise      { 0%{ transform:translateY(0) scale(0.8); opacity:0;} 20%{ opacity:1;} 100%{ transform:translateY(-30px) scale(1); opacity:0;} }
@keyframes warmth-pulse     { 0%,100%{ transform:scale(1);}      50%{ transform:scale(1.05);} }
@keyframes warmth-steam     { 0%{ transform:translateY(0) scaleX(1); opacity:0;} 25%{ opacity:0.7;} 100%{ transform:translateY(-22px) scaleX(0.6); opacity:0;} }
@keyframes warmth-lift      { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-1.5px);} }
@keyframes warmth-bird      { 0%{ transform:translateX(-30px) translateY(0); opacity:0;} 15%{ opacity:1;} 80%{ opacity:1;} 100%{ transform:translateX(60px) translateY(-6px); opacity:0;} }
@keyframes warmth-check     { 0%{ stroke-dashoffset:14; opacity:0;} 30%{ opacity:1;} 100%{ stroke-dashoffset:0; opacity:1;} }
@keyframes warmth-window    { 0%,100%{ fill:#fde68a;} 50%{ fill:#fef3c7;} }
@keyframes warmth-veg-spin  { 0%,100%{ transform:rotate(-5deg);} 50%{ transform:rotate(5deg);} }
@keyframes warmth-fade-loop { 0%,100%{ opacity:0.55;} 50%{ opacity:1;} }

.warmth-vignette .figure-pair       { animation: warmth-bob 3.4s ease-in-out infinite; transform-origin: bottom center; }
.warmth-vignette .arm-link          { animation: warmth-arm 3.4s ease-in-out infinite; transform-origin: 50% 0%; }
.warmth-vignette .cane              { animation: warmth-cane 3.4s ease-in-out infinite; transform-origin: top center; }
.warmth-vignette .floating-heart    { animation: warmth-rise 3.6s ease-out infinite; transform-origin: center; }
.warmth-vignette .floating-heart-2  { animation-delay: 1.2s; }
.warmth-vignette .floating-heart-3  { animation-delay: 2.4s; }
.warmth-vignette .sun               { animation: warmth-pulse 5s ease-in-out infinite; transform-origin: center; }
.warmth-vignette .care-window       { animation: warmth-window 4s ease-in-out infinite; }
.warmth-vignette .bird              { animation: warmth-bird 6s linear infinite; }
.warmth-vignette .bird-2            { animation-delay: 2.5s; }
.warmth-vignette .pot-lid           { animation: warmth-lift 2.6s ease-in-out infinite; transform-origin: center bottom; }
.warmth-vignette .steam             { animation: warmth-steam 2.8s ease-out infinite; transform-origin: bottom center; }
.warmth-vignette .steam-2           { animation-delay: 0.9s; }
.warmth-vignette .steam-3           { animation-delay: 1.8s; }
.warmth-vignette .veggie            { animation: warmth-veg-spin 3.4s ease-in-out infinite; transform-origin: center; }
.warmth-vignette .check-mark        { stroke-dasharray: 14; animation: warmth-check 2.4s ease-out infinite; }
.warmth-vignette .check-2           { animation-delay: 0.6s; }
.warmth-vignette .check-3           { animation-delay: 1.2s; }
.warmth-vignette .cloche            { animation: warmth-lift 3s ease-in-out infinite; transform-origin: center bottom; }
.warmth-vignette .glow              { animation: warmth-fade-loop 3s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
    .warmth-vignette * { animation: none !important; }
}
`;

export default function WarmthIllustration({ variant = 'caregiving', size = 'md', scenic = false }: WarmthIllustrationProps) {
    const dim = size === 'sm' ? 96 : size === 'md' ? 160 : 220;

    return (
        <div
            className="warmth-vignette relative inline-block"
            style={{ width: dim, height: dim }}
            aria-hidden="true"
        >
            <style>{SHARED_CSS}</style>
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
                <circle cx="100" cy="100" r="92" fill="url(#warmth-bg)" />

                {variant === 'caregiving' && <CaregivingScene scenic={scenic} />}
                {variant === 'morning'    && <MorningScene />}
                {variant === 'kitchen'    && <KitchenScene />}
                {variant === 'prep'       && <PrepScene />}
                {variant === 'tray'       && <TrayScene />}
            </svg>
        </div>
    );
}

// ============================================================================
// CAREGIVING — caregiver in scrubs + resident with cane, floating hearts
// ============================================================================
function CaregivingScene({ scenic }: { scenic: boolean }) {
    return (
        <>
            {scenic && (
                <>
                    <g className="sun">
                        <circle cx="148" cy="56" r="14" fill="url(#warmth-sun-grad)" />
                        <circle cx="148" cy="56" r="8" fill="#fbbf24" opacity="0.65" />
                    </g>
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

            <g className="figure-pair">
                {/* Caregiver */}
                <g transform="translate(80 110)">
                    <circle cx="0" cy="-8" r="9" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                    <path d="M -8 -10 Q -8 -16 0 -17 Q 8 -16 8 -10 Q 7 -13 0 -14 Q -7 -13 -8 -10 Z" fill="#78350f" opacity="0.85" />
                    <path d="M -8 0 Q -10 18 -8 32 L 8 32 Q 10 18 8 0 Z" fill="#10b981" />
                    <rect x="-5" y="6" width="10" height="6" rx="1" fill="#059669" opacity="0.5" />
                    <path d="M -8 2 Q -14 14 -12 26" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" />
                    <g className="arm-link">
                        <path d="M 8 2 Q 14 12 18 18" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" />
                    </g>
                    <line x1="-4" y1="32" x2="-4" y2="44" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="4" y1="32" x2="4" y2="44" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
                    <ellipse cx="-4" cy="46" rx="4" ry="2" fill="#1f2937" />
                    <ellipse cx="4" cy="46" rx="4" ry="2" fill="#1f2937" />
                </g>
                {/* Resident */}
                <g transform="translate(120 113)">
                    <circle cx="0" cy="-7" r="8" fill="#fde68a" stroke="#92400e" strokeWidth="0.6" />
                    <path d="M -7 -9 Q -7 -14 0 -15 Q 7 -14 7 -9 Q 6 -12 0 -12 Q -6 -12 -7 -9 Z" fill="#e5e7eb" />
                    <circle cx="-3" cy="-7" r="2.2" fill="none" stroke="#374151" strokeWidth="0.7" />
                    <circle cx="3" cy="-7" r="2.2" fill="none" stroke="#374151" strokeWidth="0.7" />
                    <line x1="-0.8" y1="-7" x2="0.8" y2="-7" stroke="#374151" strokeWidth="0.7" />
                    <path d="M -7 1 Q -9 16 -7 28 L 7 28 Q 9 16 7 1 Z" fill="#fbbf24" opacity="0.85" />
                    <line x1="0" y1="1" x2="0" y2="28" stroke="#92400e" strokeWidth="0.4" opacity="0.5" />
                    <circle cx="0" cy="8" r="0.8" fill="#92400e" />
                    <circle cx="0" cy="14" r="0.8" fill="#92400e" />
                    <circle cx="0" cy="20" r="0.8" fill="#92400e" />
                    <path d="M 7 3 Q 12 10 14 18" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                    <path d="M -7 3 Q -12 10 -14 16" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                    <g className="cane" transform="translate(15 18)">
                        <line x1="0" y1="0" x2="-1" y2="22" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M 0 0 Q 3 -2 4 1" fill="none" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
                    </g>
                    <line x1="-3" y1="28" x2="-3" y2="40" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
                    <line x1="3" y1="28" x2="3" y2="40" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
                    <ellipse cx="-3" cy="42" rx="3.5" ry="1.8" fill="#7c2d12" />
                    <ellipse cx="3" cy="42" rx="3.5" ry="1.8" fill="#7c2d12" />
                </g>
            </g>
        </>
    );
}

// ============================================================================
// MORNING — sunrise over a small care home, two birds drift across
// ============================================================================
function MorningScene() {
    return (
        <>
            {/* Sun */}
            <g className="sun">
                <circle cx="100" cy="78" r="22" fill="url(#warmth-sun-grad)" />
                <circle cx="100" cy="78" r="14" fill="#fbbf24" opacity="0.85" />
                {/* Soft rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                    <line key={a} x1="100" y1="78" x2="100" y2="60"
                        stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" opacity="0.55"
                        transform={`rotate(${a} 100 78)`} />
                ))}
            </g>

            {/* Birds drifting across (V shapes) */}
            <g className="bird" transform="translate(40 60)">
                <path d="M 0 0 L 4 -3 L 8 0" fill="none" stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" />
            </g>
            <g className="bird bird-2" transform="translate(20 80)">
                <path d="M 0 0 L 3 -2 L 6 0" fill="none" stroke="#1f2937" strokeWidth="1" strokeLinecap="round" />
            </g>

            {/* Hill */}
            <path d="M 0 156 Q 100 138 200 156 L 200 200 L 0 200 Z" fill="#a7f3d0" opacity="0.65" />
            <path d="M 0 164 Q 100 148 200 164" fill="none" stroke="#10b981" strokeOpacity="0.3" strokeWidth="1.2" />

            {/* Care home building */}
            <g transform="translate(70 110)">
                {/* Body */}
                <rect x="0" y="20" width="60" height="36" fill="#ffffff" stroke="#10b981" strokeWidth="1.4" rx="2" />
                {/* Roof */}
                <path d="M -4 22 L 30 4 L 64 22 Z" fill="#059669" />
                {/* Chimney */}
                <rect x="44" y="8" width="6" height="10" fill="#047857" />
                {/* Door */}
                <rect x="26" y="38" width="8" height="18" fill="#78350f" />
                <circle cx="32" cy="48" r="0.6" fill="#fbbf24" />
                {/* Windows (one with a soft glow loop) */}
                <rect className="care-window" x="6" y="28" width="10" height="8" fill="#fde68a" stroke="#92400e" strokeWidth="0.5" rx="0.5" />
                <rect x="44" y="28" width="10" height="8" fill="#dbeafe" stroke="#92400e" strokeWidth="0.5" rx="0.5" />
                {/* Heart on door */}
                <g transform="translate(30 32)">
                    <path d="M 0 2 C -2 0, -4 -1, -4 -3 C -4 -4.5, -3 -5.5, -1.5 -5.5 C -0.5 -5.5, 0 -4.5, 0 -3.5 C 0 -4.5, 0.5 -5.5, 1.5 -5.5 C 3 -5.5, 4 -4.5, 4 -3 C 4 -1, 2 0, 0 2 Z"
                        fill="#10b981" />
                </g>
            </g>

            {/* Foreground bush/flower */}
            <g transform="translate(40 152)">
                <circle cx="0" cy="0" r="7" fill="#34d399" opacity="0.8" />
                <circle cx="6" cy="2" r="5" fill="#10b981" opacity="0.85" />
            </g>
            <g transform="translate(160 156)">
                <circle cx="0" cy="0" r="6" fill="#34d399" opacity="0.8" />
                <circle cx="-5" cy="2" r="4" fill="#10b981" opacity="0.85" />
            </g>
        </>
    );
}

// ============================================================================
// KITCHEN — bouncing pot lid + steam wisps + a herb sprig + carrot
// ============================================================================
function KitchenScene() {
    return (
        <>
            {/* Soft hill */}
            <path d="M 0 170 Q 100 158 200 170 L 200 200 L 0 200 Z" fill="#d1fae5" opacity="0.6" />

            {/* Steam wisps — three at staggered delays */}
            <g className="steam" transform="translate(80 90)">
                <path d="M 0 0 Q -3 -6 0 -12 Q 3 -18 0 -24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
            </g>
            <g className="steam steam-2" transform="translate(100 86)">
                <path d="M 0 0 Q 3 -6 0 -12 Q -3 -18 0 -24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
            </g>
            <g className="steam steam-3" transform="translate(120 90)">
                <path d="M 0 0 Q -3 -6 0 -12 Q 3 -18 0 -24" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
            </g>

            {/* Pot — body + handles */}
            <g transform="translate(100 120)">
                {/* Handles */}
                <rect x="-44" y="6" width="10" height="4" rx="2" fill="#52525b" />
                <rect x="34" y="6" width="10" height="4" rx="2" fill="#52525b" />
                {/* Body */}
                <path d="M -38 4 Q -42 4 -42 8 L -38 38 Q -36 44 -28 44 L 28 44 Q 36 44 38 38 L 42 8 Q 42 4 38 4 Z" fill="#27272a" />
                {/* Body highlight */}
                <path d="M -34 8 L -32 38" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                {/* Rim */}
                <rect x="-40" y="2" width="80" height="6" rx="1.5" fill="#3f3f46" />
                {/* Lid */}
                <g className="pot-lid">
                    <ellipse cx="0" cy="2" rx="44" ry="5" fill="#52525b" />
                    <ellipse cx="0" cy="0" rx="44" ry="3" fill="#71717a" />
                    <rect x="-3" y="-7" width="6" height="6" rx="1.5" fill="#27272a" />
                </g>
            </g>

            {/* Floating ingredients beside the pot */}
            <g className="veggie" transform="translate(45 130)">
                {/* Carrot */}
                <path d="M 0 0 L 5 16 L -5 16 Z" fill="#f97316" />
                {/* Greens */}
                <path d="M 0 -2 L -3 -10 M 0 -2 L 0 -12 M 0 -2 L 3 -10" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <g className="veggie" transform="translate(160 128)" style={{ animationDelay: '0.8s' }}>
                {/* Herb sprig */}
                <line x1="0" y1="0" x2="0" y2="14" stroke="#065f46" strokeWidth="1.3" strokeLinecap="round" />
                <ellipse cx="-3" cy="3" rx="3" ry="2" fill="#10b981" />
                <ellipse cx="3" cy="3" rx="3" ry="2" fill="#10b981" />
                <ellipse cx="-3" cy="9" rx="3" ry="2" fill="#10b981" />
                <ellipse cx="3" cy="9" rx="3" ry="2" fill="#10b981" />
                <ellipse cx="0" cy="13" rx="3" ry="2" fill="#10b981" />
            </g>

            {/* Tiny chef hat top-right */}
            <g transform="translate(150 60)">
                <ellipse cx="0" cy="6" rx="11" ry="4" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                <path d="M -10 6 Q -12 -8 -4 -8 Q -2 -14 4 -10 Q 12 -10 10 4 Q 10 6 8 6 Z" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
            </g>
        </>
    );
}

// ============================================================================
// PREP — clipboard with checkmarks appearing one by one + small chef hat
// ============================================================================
function PrepScene() {
    return (
        <>
            {/* Soft floor */}
            <path d="M 0 170 Q 100 160 200 170 L 200 200 L 0 200 Z" fill="#d1fae5" opacity="0.6" />

            {/* Clipboard */}
            <g transform="translate(70 60)">
                {/* Clip */}
                <rect x="20" y="-4" width="20" height="8" rx="2" fill="#52525b" />
                <rect x="24" y="-2" width="12" height="4" rx="1" fill="#71717a" />
                {/* Board */}
                <rect x="0" y="4" width="60" height="84" rx="3" fill="#fef3c7" stroke="#92400e" strokeWidth="0.8" />
                {/* Inner page */}
                <rect x="6" y="12" width="48" height="72" rx="1" fill="#ffffff" />

                {/* Lines + checks */}
                {[0, 1, 2].map(i => (
                    <g key={i} transform={`translate(0 ${22 + i * 18})`}>
                        {/* Checkbox */}
                        <rect x="10" y="-4" width="8" height="8" rx="1" fill="none" stroke="#10b981" strokeWidth="1" />
                        {/* Animated check */}
                        <path
                            className={`check-mark ${i === 1 ? 'check-2' : i === 2 ? 'check-3' : ''}`}
                            d="M 11 0 L 13.5 2.5 L 17 -1.5"
                            stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                        />
                        {/* Line */}
                        <rect x="22" y="-1" width={i === 0 ? 22 : i === 1 ? 28 : 18} height="2" rx="1" fill="#fcd34d" opacity="0.7" />
                    </g>
                ))}
            </g>

            {/* Chef hat top-right */}
            <g transform="translate(155 70)">
                <ellipse cx="0" cy="10" rx="14" ry="5" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                <path d="M -12 10 Q -14 -8 -5 -8 Q -3 -16 5 -12 Q 14 -12 12 8 Q 12 10 10 10 Z" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                {/* Heart on the hat band */}
                <g transform="translate(0 14)">
                    <path d="M 0 2 C -2 0, -4 -1, -4 -3 C -4 -4.5, -3 -5.5, -1.5 -5.5 C -0.5 -5.5, 0 -4.5, 0 -3.5 C 0 -4.5, 0.5 -5.5, 1.5 -5.5 C 3 -5.5, 4 -4.5, 4 -3 C 4 -1, 2 0, 0 2 Z"
                        fill="#10b981" />
                </g>
            </g>

            {/* Pencil */}
            <g transform="translate(130 142) rotate(20)">
                <rect x="0" y="0" width="32" height="6" fill="#fbbf24" stroke="#92400e" strokeWidth="0.5" />
                <path d="M 32 0 L 38 3 L 32 6 Z" fill="#1f2937" />
                <rect x="-4" y="0" width="4" height="6" fill="#dc2626" />
            </g>
        </>
    );
}

// ============================================================================
// TRAY — serving tray with cloche, gentle steam, and a dish underneath
// ============================================================================
function TrayScene() {
    return (
        <>
            {/* Soft hill */}
            <path d="M 0 170 Q 100 158 200 170 L 200 200 L 0 200 Z" fill="#d1fae5" opacity="0.6" />

            {/* Steam wisps escaping from under the cloche */}
            <g className="steam" transform="translate(85 100)">
                <path d="M 0 0 Q -3 -6 0 -12 Q 3 -18 0 -24" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
            </g>
            <g className="steam steam-2" transform="translate(100 96)">
                <path d="M 0 0 Q 3 -6 0 -12 Q -3 -18 0 -24" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
            </g>
            <g className="steam steam-3" transform="translate(115 100)">
                <path d="M 0 0 Q -3 -6 0 -12 Q 3 -18 0 -24" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.65" />
            </g>

            {/* Cloche (lifted slightly via animation) */}
            <g className="cloche" transform="translate(100 120)">
                {/* Dome */}
                <path d="M -38 12 Q -38 -22 0 -22 Q 38 -22 38 12 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                {/* Highlight */}
                <path d="M -28 -6 Q -28 -16 -10 -18" fill="none" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                {/* Knob */}
                <circle cx="0" cy="-26" r="3" fill="#94a3b8" />
                <circle cx="0" cy="-26" r="1.2" fill="#475569" />
            </g>

            {/* Tray under cloche */}
            <g transform="translate(100 134)">
                <ellipse cx="0" cy="0" rx="56" ry="6" fill="#92400e" />
                <ellipse cx="0" cy="-2" rx="56" ry="5" fill="#b45309" />
                {/* Tray rim highlight */}
                <ellipse cx="0" cy="-2" rx="52" ry="3" fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.6" />
            </g>

            {/* Tray ticket / slip on the side */}
            <g transform="translate(40 78) rotate(-8)">
                <rect x="0" y="0" width="34" height="48" rx="1" fill="#ffffff" stroke="#d4d4d8" strokeWidth="0.8" />
                {/* Lines */}
                <rect x="4" y="6" width="20" height="2" rx="0.5" fill="#10b981" opacity="0.7" />
                <rect x="4" y="12" width="26" height="1.4" rx="0.5" fill="#9ca3af" />
                <rect x="4" y="16" width="22" height="1.4" rx="0.5" fill="#9ca3af" />
                <rect x="4" y="20" width="24" height="1.4" rx="0.5" fill="#9ca3af" />
                {/* Heart */}
                <g transform="translate(17 36)">
                    <path d="M 0 3 C -3 0, -6 -1, -6 -4 C -6 -6, -4.5 -7.5, -2.5 -7.5 C -1 -7.5, 0 -6.5, 0 -5.5 C 0 -6.5, 1 -7.5, 2.5 -7.5 C 4.5 -7.5, 6 -6, 6 -4 C 6 -1, 3 0, 0 3 Z"
                        fill="#10b981" opacity="0.85" />
                </g>
            </g>

            {/* Small heart-shaped glow on the cloche knob */}
            <g className="glow" transform="translate(140 70)">
                <path d="M 0 4 C -3.5 0, -7 -1.5, -7 -5 C -7 -7, -5.5 -8.5, -3.5 -8.5 C -2 -8.5, -0.5 -7.5, 0 -6 C 0.5 -7.5, 2 -8.5, 3.5 -8.5 C 5.5 -8.5, 7 -7, 7 -5 C 7 -1.5, 3.5 0, 0 4 Z"
                    fill="#34d399" opacity="0.85" />
            </g>
        </>
    );
}
