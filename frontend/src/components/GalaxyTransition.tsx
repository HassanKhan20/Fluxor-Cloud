import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface TransitionContextType {
    navigateWithZoom: (path: string) => void;
}

const TransitionContext = createContext<TransitionContextType>({
    navigateWithZoom: () => { },
});

export const useGalaxyTransition = () => useContext(TransitionContext);

export const GalaxyTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [viewState, setViewState] = useState<'idle' | 'zooming-out' | 'flying' | 'arriving'>('idle');
    const [targetPath, setTargetPath] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const navigateWithZoom = (path: string) => {
        if (location.pathname === path) return;
        setTargetPath(path);
        setViewState('zooming-out');
    };

    useEffect(() => {
        if (viewState === 'zooming-out') {
            const timer = setTimeout(() => setViewState('flying'), 300); // was 600
            return () => clearTimeout(timer);
        }
        if (viewState === 'flying') {
            const timer = setTimeout(() => setViewState('arriving'), 500); // was 1200
            return () => clearTimeout(timer);
        }
        if (viewState === 'arriving') {
            const timer = setTimeout(() => {
                if (targetPath) {
                    navigate(targetPath);
                    setViewState('idle');
                }
            }, 300); // was 600
            return () => clearTimeout(timer);
        }
    }, [viewState, targetPath, navigate]);

    useEffect(() => {
        if (viewState === 'idle') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let clouds: Cloud[] = [];

        class Cloud {
            x: number;
            y: number;
            z: number;
            size: number;
            rotation: number;
            opacity: number;

            constructor() {
                this.x = (Math.random() - 0.5) * canvas!.width * 3;
                this.y = (Math.random() - 0.5) * canvas!.height * 3;
                this.z = Math.random() * 2000 + 1000; // Start far away
                this.size = Math.random() * 300 + 200;
                this.rotation = Math.random() * Math.PI * 2;
                this.opacity = 0;
            }

            update(speed: number) {
                this.z -= speed;
                if (this.z < 100) {
                    this.z = 3000; // Reset to back
                    this.x = (Math.random() - 0.5) * canvas!.width * 3;
                    this.y = (Math.random() - 0.5) * canvas!.height * 3;
                    this.opacity = 0;
                }

                // Fade in/out logic
                if (this.z < 500) this.opacity = Math.max(0, this.opacity - 0.05);
                else if (this.z > 2500) this.opacity = Math.max(0, this.opacity - 0.05);
                else this.opacity = Math.min(0.6, this.opacity + 0.02);
            }

            draw() {
                if (!ctx) return;
                const perspective = 500;
                const scale = perspective / (this.z || 1);
                const screenX = canvas!.width / 2 + this.x * scale;
                const screenY = canvas!.height / 2 + this.y * scale;
                const screenSize = this.size * scale;

                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;

                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, screenSize);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, screenSize, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            clouds = Array.from({ length: 60 }, () => new Cloud());
        };

        window.addEventListener('resize', resize);
        resize();

        const render = () => {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Speed based on state
            let speed = 40;
            if (viewState === 'zooming-out') speed = 60; // Increased
            if (viewState === 'flying') speed = 100; // Increased
            if (viewState === 'arriving') speed = 150; // Increased

            clouds.sort((a, b) => b.z - a.z); // Draw back to front
            clouds.forEach(cloud => {
                cloud.update(speed);
                cloud.draw();
            });

            animationId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [viewState]);

    return (
        <TransitionContext.Provider value={{ navigateWithZoom }}>
            <div className="relative bg-[#0f172a] min-h-screen overflow-hidden">
                {/* Content */}
                <motion.div
                    animate={{
                        scale: viewState === 'idle' ? 1 : 1.5,
                        opacity: viewState === 'idle' ? 1 : 0,
                        filter: viewState !== 'idle' ? 'blur(20px)' : 'none',
                    }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="origin-center w-full h-full"
                >
                    {children}
                </motion.div>

                {/* Cloud Tunnel Overlay */}
                {viewState !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="fixed inset-0 z-[100] pointer-events-none"
                    >
                        <canvas ref={canvasRef} className="w-full h-full" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 1 }}
                                className="text-center"
                            >
                                <h2 className="text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
                                    Loading...
                                </h2>
                                <p className="text-blue-200 tracking-[0.5em] uppercase text-sm font-medium drop-shadow-md">
                                    Preparing Your Workspace
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </div>
        </TransitionContext.Provider>
    );
};
