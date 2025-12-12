import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, Shield, Clock, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

const Features: React.FC = () => {
    const mainFeatures = [
        {
            icon: <Package size={32} />,
            title: 'Smart Inventory Management',
            description: 'Track every product in real-time. Get automatic alerts when stock is running low. Never lose a sale because of out-of-stock items.',
            benefits: ['Real-time stock tracking', 'Low-stock alerts', 'Automatic reorder suggestions', 'Barcode scanning support'],
        },
        {
            icon: <BarChart3 size={32} />,
            title: 'Sales Analytics & Insights',
            description: 'Understand your business like never before. Beautiful charts show you what sells, when it sells, and how to sell more.',
            benefits: ['Daily/weekly/monthly reports', 'Top-selling products', 'Revenue trends', 'Profit margin analysis'],
        },
        {
            icon: <Bot size={32} />,
            title: 'AI-Powered Assistant',
            description: 'Ask questions in plain English. "What was my best selling item last week?" Get instant, accurate answers.',
            benefits: ['Natural language queries', 'Instant insights', 'Actionable recommendations', '24/7 availability'],
        },
        {
            icon: <TrendingUp size={32} />,
            title: 'Demand Forecasting',
            description: 'Let AI predict what you need to order and when. Reduce waste, optimize stock, and maximize profits.',
            benefits: ['AI-powered predictions', 'Seasonal trends', 'Waste reduction', 'Optimal stock levels'],
        },
        {
            icon: <FileText size={32} />,
            title: 'Invoice OCR',
            description: 'Snap a photo of any supplier invoice. We automatically extract product names, quantities, and prices.',
            benefits: ['Photo to data in seconds', 'Automatic product matching', 'Cost tracking', 'Supplier management'],
        },
        {
            icon: <Zap size={32} />,
            title: 'One-Click Data Import',
            description: 'Already using a POS system? Import your existing sales data in one click. We support all major systems.',
            benefits: ['CSV/Excel import', 'POS integrations', 'Historical data import', 'Zero data entry'],
        },
    ];

    const additionalFeatures = [
        { icon: <Shield size={24} />, title: 'Bank-Level Security', desc: 'Your data is encrypted and secure' },
        { icon: <Clock size={24} />, title: '99.9% Uptime', desc: 'Always available when you need it' },
        { icon: <Users size={24} />, title: 'Multi-User Access', desc: 'Add your team with role-based permissions' },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        Powerful features for <span className="text-blue-600">smarter stores</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8" style={{ lineHeight: '1.7' }}>
                        Everything you need to run your convenience store more efficiently. No technical expertise required.
                    </p>
                    <Link to="/signup">
                        <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                            Get Started Free
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Main Features */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-24">
                        {mainFeatures.map((feature, index) => (
                            <div
                                key={feature.title}
                                className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                            >
                                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                                        {feature.icon}
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                                        {feature.title}
                                    </h2>
                                    <p className="text-lg text-gray-600 mb-6" style={{ lineHeight: '1.7' }}>
                                        {feature.description}
                                    </p>
                                    <ul className="space-y-3">
                                        {feature.benefits.map((benefit) => (
                                            <li key={benefit} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-700">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={`bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl h-80 flex items-center justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                                    <div className="text-gray-400 text-center">
                                        <div className="text-6xl mb-2">{feature.icon}</div>
                                        <p className="text-sm">Feature Preview</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Additional Features */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        And so much more...
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {additionalFeatures.map((feature) => (
                            <div key={feature.title} className="bg-white rounded-xl p-6 text-center border border-gray-100">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-600" style={{ lineHeight: '1.6' }}>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-blue-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                        Ready to try these features?
                    </h2>
                    <p className="text-lg text-blue-100 mb-8" style={{ lineHeight: '1.7' }}>
                        Start your free trial today. No credit card required.
                    </p>
                    <Link to="/signup">
                        <Button variant="dark" size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                            Get Started Free
                        </Button>
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Features;
