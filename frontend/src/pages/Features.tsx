import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, Shield, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

const Features: React.FC = () => {
    const navigate = useNavigate();
    const goToDemo = () => navigate('/demo');

    const mainFeatures = [
        {
            id: 'inventory',
            icon: <Package size={32} />,
            title: 'Smart Inventory Management',
            description: 'Track every product in real-time. Get automatic alerts when stock is running low. Never lose a sale because of out-of-stock items.',
            benefits: ['Real-time stock tracking', 'Low-stock alerts', 'Automatic reorder suggestions', 'Barcode scanning support'],
            image: '/feature_inventory.png',
        },
        {
            id: 'analytics',
            icon: <BarChart3 size={32} />,
            title: 'Sales Analytics & Insights',
            description: 'Understand your business like never before. Beautiful charts show you what sells, when it sells, and how to sell more.',
            benefits: ['Daily/weekly/monthly reports', 'Top-selling products', 'Revenue trends', 'Profit margin analysis'],
            image: '/feature_analytics.png',
        },
        {
            id: 'ai-assistant',
            icon: <Bot size={32} />,
            title: 'AI-Powered Assistant',
            description: 'Ask questions in plain English. "What was my best selling item last week?" Get instant, accurate answers.',
            benefits: ['Natural language queries', 'Instant insights', 'Actionable recommendations', '24/7 availability'],
            image: '/feature_ai.png',
        },
        {
            id: 'forecasting',
            icon: <TrendingUp size={32} />,
            title: 'Demand Forecasting',
            description: 'Let AI predict what you need to order and when. Reduce waste, optimize stock, and maximize profits.',
            benefits: ['AI-powered predictions', 'Seasonal trends', 'Waste reduction', 'Optimal stock levels'],
            image: '/feature_forecast.png',
        },
        {
            id: 'invoice-ocr',
            icon: <FileText size={32} />,
            title: 'Invoice OCR',
            description: 'Snap a photo of any supplier invoice. We automatically extract product names, quantities, and prices.',
            benefits: ['Photo to data in seconds', 'Automatic product matching', 'Cost tracking', 'Supplier management'],
            image: '/feature_invoice.png',
        },
        {
            id: 'data-import',
            icon: <Zap size={32} />,
            title: 'One-Click Data Import',
            description: 'Already using a POS system? Import your existing sales data in one click. We support all major systems.',
            benefits: ['CSV/Excel import', 'POS integrations', 'Historical data import', 'Zero data entry'],
            image: '/feature_import.png',
        },
    ];

    const additionalFeatures = [
        { icon: <Shield size={24} />, title: 'Bank-Level Security', desc: 'Your data is encrypted and secure' },
        { icon: <Clock size={24} />, title: '99.9% Uptime', desc: 'Always available when you need it' },
        { icon: <Users size={24} />, title: 'Multi-User Access', desc: 'Add your team with role-based permissions' },
    ];

    return (
        <div className="min-h-screen bg-[#0f172a] text-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                        Powerful features for <span className="text-blue-500">smarter stores</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8" style={{ lineHeight: '1.7' }}>
                        Everything you need to run your convenience store more efficiently. No technical expertise required.
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        rightIcon={<ArrowRight size={20} />}
                        onClick={goToDemo}
                    >
                        View Demo
                    </Button>
                </div>
            </section>

            {/* Main Features */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-24">
                        {mainFeatures.map((feature, index) => (
                            <div
                                id={feature.id}
                                key={feature.title}
                                className={`grid lg:grid-cols-2 gap-12 items-center scroll-mt-24 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                            >
                                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                                            {feature.icon}
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-4">
                                        {feature.title}
                                    </h2>
                                    <p className="text-lg text-gray-400 mb-6" style={{ lineHeight: '1.7' }}>
                                        {feature.description}
                                    </p>
                                    <ul className="space-y-3">
                                        {feature.benefits.map((benefit) => (
                                            <li key={benefit} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-300">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={`bg-white/5 border border-white/10 rounded-2xl h-80 flex items-center justify-center overflow-hidden ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                                    <img
                                        src={feature.image}
                                        alt={feature.title}
                                        className="w-full h-full object-cover rounded-2xl opacity-80 hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Additional Features */}
            <section className="py-16 bg-[#1e293b]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        And so much more...
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {additionalFeatures.map((feature) => (
                            <div key={feature.title} className="bg-[#0f172a] rounded-xl p-6 text-center border border-white/5 hover:border-blue-500/30 transition-colors">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-400" style={{ lineHeight: '1.6' }}>{feature.desc}</p>
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
                        Book a demo and see how Fluxor can transform your store.
                    </p>
                    <button
                        className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-lg"
                        onClick={goToDemo}
                    >
                        View Demo
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Features;
