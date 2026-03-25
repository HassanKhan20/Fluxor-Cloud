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
                bg-white/80 backdrop-blur-md border border-blue-100/80
                shadow-[0_8px_32px_0_rgba(59,130,246,0.08)]
                ${className}
            `}
        >
            {/* Glossy sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default GlassCard;
