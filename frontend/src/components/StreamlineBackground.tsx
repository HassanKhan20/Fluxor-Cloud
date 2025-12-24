import { useEffect, useRef } from 'react';

interface StreamlineBackgroundProps {
    className?: string;
}

const StreamlineBackground: React.FC<StreamlineBackgroundProps> = ({ className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const streamCount = 20;
        const streamColor = 'rgba(30, 58, 138, 0.4)'; // Dark blue
        const glowColor = 'rgba(30, 58, 138, 0.15)';

        interface Stream {
            x: number;
            y: number;
            length: number;
            speed: number;
            width: number;
            opacity: number;
            angle: number;
        }

        let streams: Stream[] = [];

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            initStreams();
        };

        // Initialize streams
        const initStreams = () => {
            streams = [];
            for (let i = 0; i < streamCount; i++) {
                streams.push(createStream());
            }
        };

        const createStream = (): Stream => {
            const angle = -25 + (Math.random() * 10 - 5); // Slight angle variation around -25 degrees
            return {
                x: Math.random() * canvas.width * 1.5 - canvas.width * 0.25,
                y: -100 - Math.random() * 200,
                length: 150 + Math.random() * 300,
                speed: 2 + Math.random() * 3,
                width: 1 + Math.random() * 2,
                opacity: 0.2 + Math.random() * 0.4,
                angle: angle * (Math.PI / 180)
            };
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            streams.forEach((stream, index) => {
                // Calculate end point based on angle
                const endX = stream.x + Math.sin(stream.angle) * stream.length;
                const endY = stream.y + Math.cos(stream.angle) * stream.length;

                // Create gradient for stream
                const gradient = ctx.createLinearGradient(stream.x, stream.y, endX, endY);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.3, `rgba(30, 58, 138, ${stream.opacity * 0.5})`);
                gradient.addColorStop(0.5, `rgba(30, 58, 138, ${stream.opacity})`);
                gradient.addColorStop(0.7, `rgba(30, 58, 138, ${stream.opacity * 0.5})`);
                gradient.addColorStop(1, 'transparent');

                // Draw glow
                ctx.strokeStyle = glowColor;
                ctx.lineWidth = stream.width * 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(stream.x, stream.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw stream
                ctx.strokeStyle = gradient;
                ctx.lineWidth = stream.width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(stream.x, stream.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Move stream
                stream.x += Math.sin(stream.angle) * stream.speed;
                stream.y += Math.cos(stream.angle) * stream.speed;

                // Reset stream when it goes off screen
                if (stream.y > canvas.height + stream.length) {
                    streams[index] = createStream();
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        animate();

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
            style={{ opacity: 0.8 }}
        />
    );
};

export default StreamlineBackground;
