import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import FeatureCard from '../components/FeatureCard';

const Landing: React.FC = () => {
    const features = [
        {
            icon: <Package size={28} />,
            title: 'Smart Inventory',
            description: 'Real-time stock tracking with automatic low-stock alerts. Never run out of your best sellers again.',
        },
        {
            icon: <BarChart3 size={28} />,
            title: 'Sales Insights',
            description: 'Understand your sales patterns with beautiful charts and actionable analytics.',
        },
        {
            icon: <Bot size={28} />,
            title: 'AI Assistant',
            description: 'Ask questions in plain English. Get instant answers about your store performance.',
        },
        {
            icon: <TrendingUp size={28} />,
            title: 'Demand Forecasting',
            description: 'Predict what to order and when. AI-powered recommendations to optimize your inventory.',
        },
        {
            icon: <FileText size={28} />,
            title: 'Invoice OCR',
            description: 'Snap a photo of supplier invoices. We extract the data automatically.',
        },
        {
            icon: <Zap size={28} />,
            title: 'One-Click Import',
            description: 'Import your POS data in seconds. We support all major point-of-sale systems.',
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-white -z-10" />

                {/* Decorative Blobs */}
                <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#005CFF]/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FECF33]/10 rounded-full blur-3xl -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left Content */}
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-[#005CFF] text-sm font-medium mb-6
                              opacity-0 animate-[fadeInDown_0.6s_ease_forwards]">
                                <Zap size={16} />
                                <span>AI-Powered Store Management</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6
                             opacity-0 animate-[fadeInUp_0.6s_ease_forwards] animation-delay-100">
                                AI-Powered Operations for{' '}
                                <span className="text-[#005CFF]">Small Stores</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0
                            opacity-0 animate-[fadeInUp_0.6s_ease_forwards]"
                                style={{ animationDelay: '200ms' }}>
                                Fluxor Cloud gives shop owners real insights, forecasting, and an AI assistant — all in one beautiful dashboard.
                                No spreadsheets. No guesswork.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start
                              opacity-0 animate-[fadeInUp_0.6s_ease_forwards]"
                                style={{ animationDelay: '300ms' }}>
                                <Link to="/signup">
                                    <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                                        Get Started Free
                                    </Button>
                                </Link>
                                <Link to="/#features">
                                    <Button variant="secondary" size="lg">
                                        Learn More
                                    </Button>
                                </Link>
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-12 pt-8 border-t border-gray-100
                              opacity-0 animate-[fadeIn_0.6s_ease_forwards]"
                                style={{ animationDelay: '500ms' }}>
                                <p className="text-sm text-gray-500 mb-4">Trusted by convenience stores worldwide</p>
                                <div className="flex items-center gap-6 justify-center lg:justify-start text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white" />
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">500+ stores</span>
                                    </div>
                                    <div className="h-6 w-px bg-gray-200" />
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400">★★★★★</span>
                                        <span className="text-sm font-medium text-gray-600">4.9/5</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Content - Dashboard Preview */}
                        <div className="relative opacity-0 animate-[slideInRight_0.8s_ease_forwards]"
                            style={{ animationDelay: '400ms' }}>
                            <div className="relative">
                                {/* Main Dashboard Card */}
                                <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <p className="text-sm text-gray-500">Total Revenue</p>
                                            <p className="text-3xl font-bold text-gray-900">$24,892</p>
                                        </div>
                                        <div className="text-green-500 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">
                                            +12.5%
                                        </div>
                                    </div>

                                    {/* Chart Placeholder */}
                                    <div className="h-48 bg-gradient-to-t from-blue-50 to-transparent rounded-xl flex items-end justify-around p-4">
                                        {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                                            <div
                                                key={i}
                                                className="w-8 bg-[#005CFF] rounded-t-lg transition-all duration-500 hover:bg-[#0047CC]"
                                                style={{ height: `${height}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Floating Cards */}
                                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100
                                animate-[float_3s_ease-in-out_infinite]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Sales Today</p>
                                            <p className="font-bold text-gray-900">$1,847</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100
                                animate-[float_3s_ease-in-out_infinite]"
                                    style={{ animationDelay: '1s' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Package className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Low Stock</p>
                                            <p className="font-bold text-gray-900">3 items</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 lg:py-32 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6
                           opacity-0 animate-[fadeInUp_0.6s_ease_forwards]">
                            Everything you need to run a{' '}
                            <span className="text-[#005CFF]">smarter store</span>
                        </h2>
                        <p className="text-lg text-gray-600 opacity-0 animate-[fadeInUp_0.6s_ease_forwards]"
                            style={{ animationDelay: '100ms' }}>
                            Powerful features designed specifically for convenience store owners.
                            No technical expertise required.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={feature.title}
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                                delay={index * 100}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 lg:py-32 bg-[#0B0B0B]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Ready to transform your store?
                    </h2>
                    <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
                        Join hundreds of store owners who are already using Fluxor Cloud to make smarter decisions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                                Start Free Trial
                            </Button>
                        </Link>
                        <Link to="/contact">
                            <Button variant="secondary" size="lg" className="border-gray-600 text-white hover:border-white hover:bg-white/10">
                                Talk to Sales
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
