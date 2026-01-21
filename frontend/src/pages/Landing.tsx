import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import FeatureCard from '../components/FeatureCard';
import AuroraBackground from '../components/AuroraBackground';

const Landing: React.FC = () => {
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

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

    const handleDemoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormLoading(true);

        const form = e.currentTarget;
        const formData = new FormData(form);

        try {
            const response = await fetch('https://formspree.io/f/mojjraqw', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                setFormSubmitted(true);
            }
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar onBookDemo={() => setShowDemoModal(true)} />

            {/* Demo Request Modal */}
            {showDemoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 relative">
                        <button
                            onClick={() => { setShowDemoModal(false); setFormSubmitted(false); }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        {!formSubmitted ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Book a Demo</h2>
                                <p className="text-gray-600 mb-6">Get early access to Fluxor Cloud. We'll reach out within 24 hours.</p>

                                <form onSubmit={handleDemoSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name (optional)</label>
                                        <input
                                            type="text"
                                            name="store"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Your store name"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        className="w-full"
                                        disabled={formLoading}
                                    >
                                        {formLoading ? 'Sending...' : 'Request Demo'}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">✓</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
                                <p className="text-gray-600">We'll be in touch within 24 hours to schedule your demo.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
                            <Button
                                variant="primary"
                                size="lg"
                                rightIcon={<ArrowRight size={20} />}
                                onClick={() => setShowDemoModal(true)}
                            >
                                Book a Demo
                            </Button>
                            <Link to="/features">
                                <Button variant="secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
                                    Learn More
                                </Button>
                            </Link>
                        </div>

                        {/* Trust Badge - Rating Only */}
                        <div className="pt-8 border-t border-white/20">
                            <div className="flex items-center gap-2 justify-center">
                                <span className="text-yellow-400 text-xl">★★★★★</span>
                                <span className="text-sm font-medium text-gray-300">4.9/5 from early testers</span>
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
                        Join store owners who are getting early access to Fluxor Cloud.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="primary"
                            size="lg"
                            rightIcon={<ArrowRight size={20} />}
                            onClick={() => setShowDemoModal(true)}
                        >
                            Book a Demo
                        </Button>
                        <Link to="/features">
                            <Button variant="secondary" size="lg" className="border-gray-600 text-white hover:border-white hover:bg-white/10">
                                View Features
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
