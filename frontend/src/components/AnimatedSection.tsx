import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedSectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'left' | 'right' | 'none';
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
    children,
    className = '',
    delay = 0,
    direction = 'up'
}) => {
    const variants = {
        hidden: {
            opacity: 0,
            y: direction === 'up' ? 50 : 0,
            x: direction === 'left' ? -50 : direction === 'right' ? 50 : 0
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            transition: {
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1] as const, // Custom easeOutQuint-ish
                delay
            }
        }
    };

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={variants}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedSection;
