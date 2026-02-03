import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = true }) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
                relative overflow-hidden rounded-2xl
                bg-white/5 backdrop-blur-md border border-white/10
                shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
                ${className}
            `}
        >
            {/* Glossy sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default GlassCard;
