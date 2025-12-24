import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { name: 'Features', path: '/#features' },
            { name: 'Pricing', path: '/pricing' },
            { name: 'Integrations', path: '/integrations' },
            { name: 'Changelog', path: '/changelog' },
        ],
        company: [
            { name: 'About', path: '/about' },
            { name: 'Blog', path: '/blog' },
            { name: 'Careers', path: '/careers' },
            { name: 'Contact', path: '/contact' },
        ],
        resources: [
            { name: 'Documentation', path: '/docs' },
            { name: 'Help Center', path: '/help' },
            { name: 'API Reference', path: '/api' },
            { name: 'Status', path: '/status' },
        ],
        legal: [
            { name: 'Privacy', path: '/privacy' },
            { name: 'Terms', path: '/terms' },
            { name: 'Security', path: '/security' },
        ],
    };

    const socialLinks = [
        { icon: <Twitter size={20} />, url: 'https://twitter.com/fluxorcloud' },
        { icon: <Linkedin size={20} />, url: 'https://linkedin.com/company/fluxorcloud' },
        { icon: <Github size={20} />, url: 'https://github.com/fluxorcloud' },
        { icon: <Mail size={20} />, url: 'mailto:hello@fluxorcloud.com' },
    ];

    return (
        <footer className="bg-[#0B0B0B] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Top Section */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
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
                                    <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="none" stroke="white" strokeWidth="1" opacity="0.9" />
                                    <circle cx="0" cy="-6" r="1.5" fill="white" />
                                    <circle cx="5.2" cy="-3" r="1.5" fill="white" />
                                    <circle cx="5.2" cy="3" r="1.5" fill="white" />
                                    <circle cx="0" cy="6" r="1.5" fill="white" />
                                    <circle cx="-5.2" cy="3" r="1.5" fill="white" />
                                    <circle cx="-5.2" cy="-3" r="1.5" fill="white" />
                                </g>
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight text-white">FLUXOR</span>
                                <span className="text-xs font-medium tracking-widest text-blue-400">CLOUD</span>
                            </div>
                        </Link>
                        <p className="text-gray-400 mb-6 max-w-xs">
                            AI-powered operations management for small convenience stores. Smarter insights, better decisions.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center
                             text-gray-400 hover:text-white hover:bg-[#005CFF] transition-all duration-200"
                                >
                                    {link.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-white transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Company</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-white transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Resources</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-white transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-gray-400 hover:text-white transition-colors duration-200"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-400 text-sm">
                        © {currentYear} Fluxor Cloud. All rights reserved.
                    </p>
                    <p className="text-gray-500 text-sm">
                        Made with ❤️ for small business owners
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
