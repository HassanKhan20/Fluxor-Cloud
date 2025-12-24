import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import FeatureCard from '../components/FeatureCard';
import AuroraBackground from '../components/AuroraBackground';

const Landing: React.FC = () => {
    const features = [
        {
            icon: <Package size={28} />,
            title: 'Smart Inventory',
            description: 'Real-time stock tracking with automatic low-stock alerts. Never run out of your best sellers again.',
            href: '/features',
        },
        {
            icon: <BarChart3 size={28} />,
            title: 'Sales Insights',
            description: 'Understand your sales patterns with beautiful charts and actionable analytics.',
            href: '/features',
        },
        {
            icon: <Bot size={28} />,
            title: 'AI Assistant',
            description: 'Ask questions in plain English. Get instant answers about your store performance.',
            href: '/features',
        },
        {
            icon: <TrendingUp size={28} />,
            title: 'Demand Forecasting',
            description: 'Predict what to order and when. AI-powered recommendations to optimize your inventory.',
            href: '/features',
        },
        {
            icon: <FileText size={28} />,
            title: 'Invoice OCR',
            description: 'Snap a photo of supplier invoices. We extract the data automatically.',
            href: '/features',
        },
        {
            icon: <Zap size={28} />,
            title: 'One-Click Import',
            description: 'Import your POS data in seconds. We support all major point-of-sale systems.',
            href: '/features',
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
                {/* Aurora Animation Background */}
                <div className="absolute inset-0" style={{ zIndex: 0 }}>
                    <AuroraBackground />
                </div>

                {/* Diagonal shine/reflection in the middle */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 0,
                        background: 'linear-gradient(135deg, transparent 35%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 65%)'
                    }}
                />

                {/* Bottom fade to white */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" style={{ zIndex: 1 }} />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 2 }}>
                    {/* Centered Single Column Layout */}
                    <div className="max-w-3xl mx-auto text-center">
                        {/* FLUXOR Title */}
                        <div className="mb-8">
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                FLUXOR
                            </h2>
                            <p className="text-xl sm:text-2xl font-medium tracking-widest text-blue-900 mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                CLOUD
                            </p>
                        </div>

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-8 border border-white/20">
                            <Zap size={16} />
                            <span>AI-Powered Store Management</span>
                        </div>

                        {/* Heading */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6" style={{ lineHeight: '1.2' }}>
                            Smart Operations for <span className="text-blue-900">Small Stores</span>
                        </h1>

                        {/* Description */}
                        <p className="text-base sm:text-lg text-gray-600 mb-10 max-w-2xl mx-auto font-normal tracking-wide" style={{ lineHeight: '1.8', fontFamily: 'Outfit, Poppins, sans-serif' }}>
                            Real insights, smart forecasting, and an AI assistant all in one beautiful dashboard. No spreadsheets. No guesswork.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <Link to="/signup">
                                <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                                    Get Started Free
                                </Button>
                            </Link>
                            <Link to="/features">
                                <Button variant="secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
                                    Learn More
                                </Button>
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="pt-8 border-t border-white/20">
                            <p className="text-sm text-gray-400 mb-4">Trusted by convenience stores worldwide</p>
                            <div className="flex items-center gap-6 justify-center">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {/* Professional store logos with gradients */}
                                        <div className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                                                <span className="text-white text-[8px] font-black tracking-tight">MART</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-700 flex items-center justify-center">
                                                <span className="text-white text-[7px] font-black tracking-tight">QS</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                                                <span className="text-[10px]">☀️</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-800 flex items-center justify-center">
                                                <span className="text-white text-[7px] font-black tracking-tight">LG</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-300">500+ stores</span>
                                </div>
                                <div className="h-6 w-px bg-white/20" />
                                <div className="flex items-center gap-1">
                                    <span className="text-yellow-400">★★★★★</span>
                                    <span className="text-sm font-medium text-gray-300">4.9/5</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 lg:py-32 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                            Everything you need to run a <span className="text-blue-600">smarter store</span>
                        </h2>
                        <p className="text-lg text-gray-600" style={{ lineHeight: '1.7' }}>
                            Powerful features designed specifically for convenience store owners. No technical expertise required.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={feature.title}
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                                delay={index * 100}
                                href={feature.href}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 lg:py-32 bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Ready to transform your store?
                    </h2>
                    <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto" style={{ lineHeight: '1.7' }}>
                        Join hundreds of store owners who are already using Fluxor Cloud to make smarter decisions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                                Start Free Trial
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button variant="secondary" size="lg" className="border-gray-600 text-white hover:border-white hover:bg-white/10">
                                View Pricing
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Landing;
