import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Heart } from 'lucide-react';
import { useGalaxyTransition } from './GalaxyTransition';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const { navigateWithZoom } = useGalaxyTransition();
    const location = useLocation();

    const footerLinks = {
        product: [
            { name: 'Features', path: '/features' },
            { name: 'Demo', path: '/demo' },
            { name: 'About', path: '/about' },
        ],
        legal: [
            { name: 'Privacy', path: '/privacy' },
            { name: 'Terms', path: '/terms' },
        ],
    };

    return (
        <footer className="bg-ink-50 border-t border-ink-200 text-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Top Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
                                <span className="font-display text-white text-base font-bold tracking-tighter">F</span>
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="font-display text-base font-semibold tracking-tight text-ink-900">Fluxor</span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">Cloud</span>
                            </div>
                        </Link>
                        <p className="text-ink-600 mb-6 max-w-xs text-[14px] leading-relaxed">
                            Operations intelligence for independent convenience stores. Real-time analytics, AI-driven decisions, and zero spreadsheets.
                        </p>
                        <a
                            href="mailto:support@fluxorcloud.com"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-100 hover:bg-ink-900 text-ink-700 hover:text-white transition-colors duration-200 text-[13px] font-medium tracking-tight"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            support@fluxorcloud.com
                        </a>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-display font-semibold text-ink-900 text-[13.5px] mb-4 tracking-tight">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <button
                                        onClick={() => {
                                            if (location.pathname === link.path) {
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            } else {
                                                navigateWithZoom(link.path);
                                            }
                                        }}
                                        className="text-[13.5px] text-ink-600 hover:text-ink-900 transition-colors duration-200"
                                    >
                                        {link.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-display font-semibold text-ink-900 text-[13.5px] mb-4 tracking-tight">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-[13.5px] text-ink-600 hover:text-ink-900 transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © {currentYear} Fluxor Cloud. All rights reserved.
                    </p>
                    <p className="text-gray-400 text-sm flex items-center gap-1.5">
                        Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for small business owners
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
