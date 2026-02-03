import { useEffect, useRef } from 'react';

const HeroBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            color: string;

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.size = Math.random() * 2;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.color = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`; // Brighter white dots
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0) this.x = canvas!.width;
                if (this.x > canvas!.width) this.x = 0;
                if (this.y < 0) this.y = canvas!.height;
                if (this.y > canvas!.height) this.y = 0;
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < 150; i++) { // Increased count for visibility
                particles.push(new Particle());
            }
        };

        const drawGrid = () => {
            if (!ctx) return;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Slightly brighter grid
            ctx.lineWidth = 1;
            const gridSize = 50;
            const offsetX = (time * 10) % gridSize;
            const offsetY = (time * 10) % gridSize;

            for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x + offsetX, 0);
                ctx.lineTo(x + offsetX, canvas.height);
                ctx.stroke();
            }

            for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y + offsetY);
                ctx.lineTo(canvas.width, y + offsetY);
                ctx.stroke();
            }
        };

        const animate = () => {
            if (!ctx) return;
            ctx.fillStyle = '#0f172a'; // Lighter Navy Blue (Slate 900)
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drawGrid();

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Energy Lines
            const waveCount = 3;
            for (let i = 0; i < waveCount; i++) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.1 - i * 0.02})`; // Light Blue
                ctx.lineWidth = 2;
                for (let x = 0; x < canvas.width; x += 10) {
                    const y = canvas.height / 2 + Math.sin(x * 0.005 + time * 2 + i) * 100 * Math.sin(time);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            time += 0.01;
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
};

export default HeroBackground;
