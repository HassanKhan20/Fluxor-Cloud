import { useEffect, useState } from 'react';

interface StreamlineAnimationProps {
    duration?: number; // Duration in ms before animation fades out
}

export default function StreamlineAnimation({ duration = 2000 }: StreamlineAnimationProps) {
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        // Start fading out after animation plays
        const fadeTimer = setTimeout(() => setFading(true), duration - 500);
        const hideTimer = setTimeout(() => setVisible(false), duration);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(hideTimer);
        };
    }, [duration]);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
            style={{ overflow: 'hidden' }}
        >
            {/* Gradient sweep from left to right */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.08) 20%, rgba(14, 165, 233, 0.12) 50%, rgba(59, 130, 246, 0.08) 80%, transparent 100%)',
                    animation: 'streamlineSweep 1.5s ease-out forwards'
                }}
            />

            {/* Light beam effect */}
            <div
                className="absolute top-0 h-full w-32"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: 'streamlineBeam 1.2s ease-in-out forwards'
                }}
            />

            {/* Subtle horizontal lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="30%" stopColor="rgba(59, 130, 246, 0.3)" />
                        <stop offset="70%" stopColor="rgba(14, 165, 233, 0.3)" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                {[...Array(5)].map((_, i) => (
                    <line
                        key={i}
                        x1="-100%"
                        y1={`${20 + i * 15}%`}
                        x2="200%"
                        y2={`${20 + i * 15}%`}
                        stroke="url(#lineGrad)"
                        strokeWidth="1"
                        style={{
                            animation: `streamlineLine 1s ease-out ${i * 0.1}s forwards`,
                            opacity: 0
                        }}
                    />
                ))}
            </svg>

            <style>{`
                @keyframes streamlineSweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes streamlineBeam {
                    0% { left: -10%; }
                    100% { left: 110%; }
                }
                @keyframes streamlineLine {
                    0% { 
                        transform: translateX(-50%);
                        opacity: 0;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% { 
                        transform: translateX(0%);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
