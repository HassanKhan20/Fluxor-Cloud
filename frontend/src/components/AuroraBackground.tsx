import { useEffect, useRef } from 'react';

interface AuroraBackgroundProps {
    className?: string;
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        let lastFrame = 0;
        const targetFPS = 30; // Limit to 30 FPS for better performance
        const frameInterval = 1000 / targetFPS;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const drawAurora = (timestamp: number) => {
            // Throttle to target FPS
            const elapsed = timestamp - lastFrame;
            if (elapsed < frameInterval) {
                animationRef.current = requestAnimationFrame(drawAurora);
                return;
            }
            lastFrame = timestamp - (elapsed % frameInterval);

            // Slightly lighter blue background
            ctx.fillStyle = '#60a5fa'; // Blue-400 (lighter)
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw 3 waves (reduced from 5)
            for (let wave = 0; wave < 3; wave++) {
                ctx.save();
                ctx.globalCompositeOperation = 'multiply';

                // Use simpler solid colors instead of gradients
                ctx.fillStyle = wave % 2 === 0
                    ? 'rgba(30, 64, 175, 0.25)'
                    : 'rgba(29, 78, 216, 0.2)';

                ctx.beginPath();

                const amplitude = 60 + wave * 25;
                const frequency = 0.003 - wave * 0.0003;
                const yOffset = canvas.height * 0.60 + wave * 35;
                const phaseShift = time * (0.5 + wave * 0.1) + wave * Math.PI * 0.3;

                ctx.moveTo(-50, canvas.height + 50);

                // Increase step size for fewer calculations
                for (let x = -50; x <= canvas.width + 50; x += 15) {
                    const y = yOffset +
                        Math.sin(x * frequency + phaseShift) * amplitude +
                        Math.sin(x * frequency * 2 + phaseShift) * (amplitude * 0.3);

                    if (x === -50) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.lineTo(canvas.width + 50, canvas.height + 50);
                ctx.lineTo(-50, canvas.height + 50);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            time += 0.02;
            animationRef.current = requestAnimationFrame(drawAurora);
        };

        animationRef.current = requestAnimationFrame(drawAurora);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${className}`}
        />
    );
};

export default AuroraBackground;
