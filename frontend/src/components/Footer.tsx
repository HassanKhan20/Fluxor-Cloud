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
        <footer className="bg-gray-50 border-t border-gray-200 text-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Top Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-3 mb-4">
                            {/* Premium Cloud + Hexagon Network Logo */}
                            <svg viewBox="0 0 40 40" className="h-10 w-10 flex-shrink-0">
                                <defs>
                                    <linearGradient id="footerCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3B82F6" />
                                        <stop offset="100%" stopColor="#60A5FA" />
                                    </linearGradient>
                                </defs>
                                <path d="M32 22c0-4.4-3.6-8-8-8-1.5 0-2.9.4-4.1 1.1C18.5 12.3 15.5 10 12 10c-4.4 0-8 3.6-8 8 0 .4 0 .8.1 1.2C1.7 20.1 0 22.4 0 25c0 3.3 2.7 6 6 6h24c3.3 0 6-2.7 6-6 0-2.6-1.7-4.8-4-5.6 0-.1 0-.3 0-.4z"
                                    fill="url(#footerCloudGrad)" transform="translate(4, 5) scale(0.8)" />
                                <g transform="translate(20, 20)">
                                    <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.9" />
                                    <circle cx="0" cy="-6" r="1.5" fill="#3B82F6" />
                                    <circle cx="5.2" cy="-3" r="1.5" fill="#3B82F6" />
                                    <circle cx="5.2" cy="3" r="1.5" fill="#3B82F6" />
                                    <circle cx="0" cy="6" r="1.5" fill="#3B82F6" />
                                    <circle cx="-5.2" cy="3" r="1.5" fill="#3B82F6" />
                                    <circle cx="-5.2" cy="-3" r="1.5" fill="#3B82F6" />
                                </g>
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold font-outfit tracking-tight text-gray-900">FLUXOR</span>
                                <span className="text-xs font-medium font-space tracking-widest text-blue-600">CLOUD</span>
                            </div>
                        </Link>
                        <p className="text-gray-600 mb-6 max-w-xs">
                            AI-powered operations management for small convenience stores. Smarter insights, better decisions.
                        </p>
                        <a
                            href="mailto:support@fluxorcloud.com"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-blue-600 text-gray-600 hover:text-white transition-all duration-200 text-sm font-medium"
                        >
                            <Mail className="w-4 h-4" />
                            support@fluxorcloud.com
                        </a>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
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
                                        className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                    >
                                        {link.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
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
