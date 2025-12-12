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
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-[#005CFF] rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-xl">F</span>
                            </div>
                            <span className="text-xl font-bold">
                                Fluxor<span className="text-[#005CFF]">Cloud</span>
                            </span>
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
