import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Button from './Button';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeHash, setActiveHash] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setActiveHash('');
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/', hash: '' },
        { name: 'Features', path: '/', hash: '#features' },
        { name: 'Demo', path: '/demo', hash: '' },
        { name: 'About', path: '/', hash: '#about' },
    ];

    const isActive = (path: string, hash: string) => {
        // For hash links on landing page
        if (hash && location.pathname === '/') {
            return activeHash === hash;
        }
        // For page routes
        if (!hash && path !== '/') {
            return location.pathname === path;
        }
        // For home
        if (path === '/' && !hash) {
            return location.pathname === '/' && !activeHash;
        }
        return false;
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: { name: string; path: string; hash: string }) => {
        e.preventDefault();
        setIsOpen(false);

        // If we are on the landing page
        if (location.pathname === '/') {
            if (link.hash) {
                // Scroll to section
                const element = document.querySelector(link.hash);
                if (element) {
                    const offset = 80; // Navbar height
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                    setActiveHash(link.hash);
                    window.history.pushState(null, '', link.hash);
                }
            } else {
                // Scroll to top (Home)
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveHash('');
                window.history.pushState(null, '', '/');
            }
        } else {
            // Not on landing page? Navigate there with hash
            navigate('/' + link.hash);
        }
    };

    const handleBookDemo = () => {
        setIsOpen(false);
        navigate('/demo');
    };

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-ink-200/70 py-3 transition-all duration-300 font-sans"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
                            <span className="font-display text-white text-base font-bold tracking-tighter">F</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="font-display text-[17px] font-semibold tracking-tight text-ink-900 group-hover:text-indigo-700 transition-colors">Fluxor</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">Cloud</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-7">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={`${link.path}${link.hash}`}
                                onClick={(e) => handleNavClick(e, link)}
                                className={`relative text-[13.5px] font-medium tracking-tight transition-colors duration-200 ${isActive(link.path, link.hash) ? 'text-indigo-700' : 'text-ink-600 hover:text-ink-900'
                                    }`}
                            >
                                {link.name}
                                {isActive(link.path, link.hash) && (
                                    <motion.span
                                        layoutId="nav-underline"
                                        className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-indigo-600 rounded-full"
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-[13.5px] font-medium tracking-tight text-ink-600 hover:text-ink-900 transition-colors">
                            Sign In
                        </Link>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBookDemo}
                            className="bg-ink-900 hover:bg-ink-800 text-white border-0 transition-all text-[13.5px] font-medium tracking-tight px-4 h-9"
                        >
                            View Demo
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-ink-600 hover:text-ink-900 transition-colors"
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
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
                        className="md:hidden bg-white border-b border-ink-200 overflow-hidden"
                    >
                        <div className="px-4 py-5 space-y-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={`${link.path}${link.hash}`}
                                    onClick={(e) => handleNavClick(e, link)}
                                    className={`block py-2 text-base font-medium tracking-tight ${isActive(link.path, link.hash) ? 'text-indigo-700' : 'text-ink-700'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-ink-200 space-y-2.5">
                                <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full text-center py-2 text-ink-600 hover:text-ink-900">
                                    Sign In
                                </Link>
                                <Button variant="primary" size="md" className="w-full bg-ink-900 hover:bg-ink-800 border-0" onClick={handleBookDemo}>
                                    View Demo
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
