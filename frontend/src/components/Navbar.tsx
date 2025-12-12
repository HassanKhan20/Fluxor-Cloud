import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Button from './Button';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Features', path: '/#features' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'About', path: '/about' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#005CFF] rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">F</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                            Fluxor<span className="text-[#005CFF]">Cloud</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`text-sm font-medium transition-colors duration-200 ${isActive(link.path)
                                        ? 'text-[#005CFF]'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="primary" size="sm">
                                Get Started
                            </Button>
                        </Link>
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
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className={`block py-2 text-lg font-medium ${isActive(link.path)
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
                        <Link to="/signup" onClick={() => setIsOpen(false)}>
                            <Button variant="primary" size="md" className="w-full">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
