import React, { useEffect, useRef } from 'react';

interface ParticleFlowProps {
    targetRef: React.RefObject<HTMLElement>;
}

const ParticleFlow: React.FC<ParticleFlowProps> = ({ targetRef }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let particles: Particle[] = [];

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        interface Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            targetX: number;
            targetY: number;
            life: number;
            maxLife: number;
        }

        const getTargetPosition = () => {
            if (targetRef.current && canvas) {
                const rect = targetRef.current.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                return {
                    x: rect.left - canvasRect.left + rect.width / 2,
                    y: rect.top - canvasRect.top + rect.height / 2,
                };
            }
            return { x: canvas.width / 2, y: canvas.height / 3 };
        };

        const createParticle = (): Particle => {
            const target = getTargetPosition();
            const side = Math.floor(Math.random() * 4);
            let x: number, y: number;

            // Spawn from edges
            switch (side) {
                case 0: // top
                    x = Math.random() * canvas.width;
                    y = -20;
                    break;
                case 1: // right
                    x = canvas.width + 20;
                    y = Math.random() * canvas.height;
                    break;
                case 2: // bottom
                    x = Math.random() * canvas.width;
                    y = canvas.height + 20;
                    break;
                default: // left
                    x = -20;
                    y = Math.random() * canvas.height;
            }

            const maxLife = 100 + Math.random() * 100;

            return {
                x,
                y,
                size: 2 + Math.random() * 3,
                speedX: 0,
                speedY: 0,
                opacity: 0.6 + Math.random() * 0.4,
                targetX: target.x + (Math.random() - 0.5) * 80,
                targetY: target.y + (Math.random() - 0.5) * 40,
                life: 0,
                maxLife,
            };
        };

        // Initialize particles
        for (let i = 0; i < 60; i++) {
            const p = createParticle();
            p.life = Math.random() * p.maxLife; // Stagger initial positions
            particles.push(p);
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, index) => {
                // Move towards target
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Accelerate towards target
                const acceleration = 0.02 + (1 - dist / 500) * 0.03;
                p.speedX += dx * acceleration * 0.01;
                p.speedY += dy * acceleration * 0.01;

                // Damping
                p.speedX *= 0.98;
                p.speedY *= 0.98;

                p.x += p.speedX;
                p.y += p.speedY;
                p.life++;

                // Calculate opacity based on distance and life
                const lifeRatio = p.life / p.maxLife;
                const distOpacity = Math.max(0, 1 - dist / 100);
                const baseOpacity = p.opacity * (1 - lifeRatio * 0.5);
                const finalOpacity = dist < 50 ? baseOpacity * (1 - distOpacity) : baseOpacity;

                // Draw particle with glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
                ctx.fill();

                // Add subtle glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity * 0.3})`;
                ctx.fill();

                // Draw trail
                if (p.speedX !== 0 || p.speedY !== 0) {
                    const trailLength = Math.min(20, Math.sqrt(p.speedX ** 2 + p.speedY ** 2) * 3);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.speedX * trailLength, p.y - p.speedY * trailLength);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${finalOpacity * 0.4})`;
                    ctx.lineWidth = p.size * 0.5;
                    ctx.stroke();
                }

                // Reset particle when it reaches target or dies
                if (dist < 30 || p.life > p.maxLife) {
                    particles[index] = createParticle();
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [targetRef]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
        />
    );
};

export default ParticleFlow;
