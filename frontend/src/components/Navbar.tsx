import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Button from './Button';

interface NavbarProps {
    onBookDemo?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onBookDemo }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { name: 'Home', path: '/', hash: '' },
        { name: 'Features', path: '/', hash: '#features' },
        { name: 'Pricing', path: '/', hash: '#pricing' },
        { name: 'About', path: '/', hash: '#about' },
    ];

    const isActive = (path: string, hash: string) => {
        if (location.pathname !== '/') return false;
        if (path === '/' && hash === '' && !location.hash) return true;
        return location.hash === hash;
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
        if (location.pathname === '/') {
            e.preventDefault();
            if (hash) {
                const element = document.querySelector(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    // Update hash in URL without jumping
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
            // If not on landing page, navigate to landing and open modal
            window.location.href = '/?demo=true';
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-blue-200 to-blue-400 backdrop-blur-lg border-b border-blue-200/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        {/* Premium Cloud + Hexagon Network Logo */}
                        <svg viewBox="0 0 40 40" className="h-12 w-12">
                            <defs>
                                <linearGradient id="navCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#1E3A5F" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                            {/* Cloud silhouette */}
                            <path d="M32 22c0-4.4-3.6-8-8-8-1.5 0-2.9.4-4.1 1.1C18.5 12.3 15.5 10 12 10c-4.4 0-8 3.6-8 8 0 .4 0 .8.1 1.2C1.7 20.1 0 22.4 0 25c0 3.3 2.7 6 6 6h24c3.3 0 6-2.7 6-6 0-2.6-1.7-4.8-4-5.6 0-.1 0-.3 0-.4z"
                                fill="url(#navCloudGrad)" transform="translate(4, 5) scale(0.8)" />
                            {/* Hexagon network - centered */}
                            <g transform="translate(20, 20)">
                                <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="none" stroke="white" strokeWidth="1.2" opacity="0.95" />
                                <circle cx="0" cy="-6" r="1.5" fill="white" />
                                <circle cx="5.2" cy="-3" r="1.5" fill="white" />
                                <circle cx="5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="0" cy="6" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="-3" r="1.5" fill="white" />
                                <line x1="0" y1="-6" x2="0" y2="6" stroke="white" strokeWidth="0.5" opacity="0.6" />
                                <line x1="-5.2" y1="-3" x2="5.2" y2="3" stroke="white" strokeWidth="0.5" opacity="0.6" />
                                <line x1="-5.2" y1="3" x2="5.2" y2="-3" stroke="white" strokeWidth="0.5" opacity="0.6" />
                            </g>
                        </svg>
                        {/* Typography */}
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight text-blue-800" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>FLUXOR</span>
                            <span className="text-xs font-medium tracking-widest text-blue-500" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>CLOUD</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={`${link.path}${link.hash}`}
                                onClick={(e) => handleNavClick(e, link.hash)}
                                className={`relative text-sm font-medium transition-all duration-300 py-2 ${isActive(link.path, link.hash)
                                    ? 'text-blue-900'
                                    : 'text-blue-700 hover:text-blue-900'
                                    }`}
                            >
                                {link.name}
                                {/* Underglow effect for active state */}
                                <span className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full transition-all duration-300 ${isActive(link.path, link.hash)
                                    ? 'bg-blue-600 shadow-[0_0_8px_2px_rgba(37,99,235,0.5)]'
                                    : 'bg-transparent'
                                    }`} />
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA - Sign In + Book a Demo */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="secondary" size="sm">
                                Sign In
                            </Button>
                        </Link>
                        <Button variant="primary" size="sm" onClick={handleBookDemo}>
                            Book a Demo
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 shadow-lg transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
            >
                <div className="px-4 py-6 space-y-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={`${link.path}${link.hash}`}
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => handleNavClick(e, link.hash)}
                            className={`block py-2 text-lg font-medium ${isActive(link.path, link.hash)
                                ? 'text-[#005CFF]'
                                : 'text-gray-600'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <Link to="/login" onClick={() => setIsOpen(false)}>
                            <Button variant="secondary" size="md" className="w-full">
                                Sign In
                            </Button>
                        </Link>
                        <Button variant="primary" size="md" className="w-full" onClick={handleBookDemo}>
                            Book a Demo
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
