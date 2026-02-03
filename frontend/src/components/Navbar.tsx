import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Button from './Button';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    onBookDemo?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onBookDemo }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeHash, setActiveHash] = useState('');
    const location = useLocation();

    // Scroll Spy Logic
    useEffect(() => {
        const handleScroll = () => {
            const sections = [
                { id: 'features', hash: '#features' },
                { id: 'pricing', hash: '#pricing' }
            ];

            let found = false;
            // Check in reverse order so we match the bottom-most section first
            for (const section of [...sections].reverse()) {
                const element = document.getElementById(section.id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    // If near top of viewport (allowing for some offset)
                    if (rect.top <= 150) {
                        setActiveHash(section.hash);
                        found = true;
                        break;
                    }
                }
            }
            if (!found) setActiveHash('');
        };

        window.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/', hash: '' },
        { name: 'Features', path: '/', hash: '#features' },
        { name: 'Pricing', path: '/', hash: '#pricing' },
    ];

    const isActive = (path: string, hash: string) => {
        if (location.pathname !== '/') return false;
        return activeHash === hash;
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
        if (location.pathname === '/') {
            e.preventDefault();
            setActiveHash(hash);

            if (hash) {
                const element = document.querySelector(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    window.history.pushState(null, '', hash);
                }
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                window.history.pushState(null, '', '/');
            }
        }
        setIsOpen(false);
    };

    const handleBookDemo = () => {
        setIsOpen(false);
        if (onBookDemo) {
            onBookDemo();
        } else {
            window.location.href = '/?demo=true';
        }
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 py-4 transition-all duration-300"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <img src="/logo.png" alt="Fluxor Cloud Logo" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">FLUXOR</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={`${link.path}${link.hash}`}
                                onClick={(e) => handleNavClick(e, link.hash)}
                                className={`relative text-sm font-medium transition-colors duration-300 ${isActive(link.path, link.hash) ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                                    }`}
                            >
                                {link.name}
                                {isActive(link.path, link.hash) && (
                                    <motion.span
                                        layoutId="nav-underline"
                                        className="absolute -bottom-1 left-0 right-0 h-px bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Sign In
                        </Link>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBookDemo}
                            className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all"
                        >
                            Book Demo
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#0f172a] border-b border-white/10 overflow-hidden"
                    >
                        <div className="px-4 py-6 space-y-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={`${link.path}${link.hash}`}
                                    onClick={(e) => handleNavClick(e, link.hash)}
                                    className={`block py-2 text-lg font-medium ${isActive(link.path, link.hash) ? 'text-blue-400' : 'text-gray-300'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-white/10 space-y-3">
                                <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full text-center py-2 text-gray-300 hover:text-white">
                                    Sign In
                                </Link>
                                <Button variant="primary" size="md" className="w-full bg-blue-600 border-0" onClick={handleBookDemo}>
                                    Book a Demo
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
