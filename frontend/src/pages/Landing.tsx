import React, { useEffect } from 'react';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, Check, LayoutDashboard, Brain, Shield, Lock, Database, Activity } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import HeroBackground from '../components/HeroBackground';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

const Landing: React.FC = () => {
    const { scrollY } = useScroll();
    const location = useLocation();
    const navigate = useNavigate();
    const goToDemo = () => navigate('/demo');

    useEffect(() => {
        if (location.hash) {
            const element = document.querySelector(location.hash);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [location]);

    // Parallax & Fade effects for Hero
    const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
    const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);
    const bgBlur = useTransform(scrollY, [0, 500], ["0px", "10px"]);

    const features = [
        {
            icon: <Package className="text-blue-400" size={32} />,
            title: 'Smart Inventory',
            description: 'Real-time stock tracking with automatic low-stock alerts. Never run out of your best sellers again.',
        },
        {
            icon: <BarChart3 className="text-violet-400" size={32} />,
            title: 'Sales Insights',
            description: 'Understand your sales patterns with beautiful charts and actionable analytics.',
        },
        {
            icon: <Bot className="text-cyan-400" size={32} />,
            title: 'AI Assistant',
            description: 'Ask questions in plain English. Get instant answers about your store performance.',
        },
        {
            icon: <TrendingUp className="text-emerald-400" size={32} />,
            title: 'Demand Forecasting',
            description: 'Predict what to order and when. AI-powered recommendations to optimize your inventory.',
        },
        {
            icon: <FileText className="text-amber-400" size={32} />,
            title: 'Invoice OCR',
            description: 'Snap a photo of supplier invoices. We extract the data automatically.',
        },
        {
            icon: <Zap className="text-rose-400" size={32} />,
            title: 'One-Click Import',
            description: 'Import your POS data in seconds. We support all major point-of-sale systems.',
        },
    ];



    return (
        <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] via-white to-white text-gray-900">
            <Navbar />

            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <HeroBackground />
                <motion.div
                    className="absolute inset-0 pointer-events-none bg-white/5"
                    style={{ backdropFilter: `blur(${bgBlur})` }}
                />
            </div>

            <main className="relative z-10 w-full overflow-hidden">

                {/* HERO SECTION */}
                <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
                    <motion.div
                        style={{ opacity: heroOpacity, scale: heroScale }}
                        className="max-w-4xl mx-auto text-center space-y-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="flex flex-col items-center mb-8"
                        >
                            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-gray-900 mb-2">FLUXOR</h1>
                            <span className="text-xl md:text-3xl tracking-[0.3em] text-blue-600 font-light uppercase mb-8">Cloud</span>

                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 backdrop-blur-sm mb-6">
                                <Shield size={14} className="text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">Enterprise-Grade Tools for Local Stores</span>
                            </div>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight"
                        >
                            Enterprise-grade insights. <span className="text-blue-600">Built for small stores.</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="text-base md:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed"
                        >
                            The same analytics and automation trusted by large retailers—built specifically for convenience stores. Reliable, secure, and designed for real-world operations.
                        </motion.p>

                        {/* Trust Strip */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-500"
                        >
                            <div className="flex items-center gap-1.5">
                                <Lock size={12} className="text-emerald-400" />
                                <span>Secure Cloud Infrastructure</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Database size={12} className="text-blue-400" />
                                <span>Store-Level Data Isolation</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Shield size={12} className="text-violet-400" />
                                <span>Role-Based Access</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Activity size={12} className="text-cyan-400" />
                                <span>Reliable Real-Time Analytics</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
                        >
                            <Button
                                variant="primary"
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] border-0 h-14 px-8 text-lg"
                                rightIcon={<ArrowRight />}
                                onClick={goToDemo}
                            >
                                View the Demo
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                className="bg-white border-gray-300 hover:bg-gray-50 text-gray-800 h-14 px-8 text-lg hover:border-gray-400"
                                onClick={() => {
                                    const element = document.querySelector('#features');
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                Learn More
                            </Button>
                        </motion.div>
                    </motion.div>

                    {/* Scroll Indicator */}
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-400"
                    >
                        <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center p-1">
                            <div className="w-1 h-2 bg-gray-300 rounded-full" />
                        </div>
                    </motion.div>
                </section>

                {/* VISUAL SHOWCASE SECTION (Floating Glass Panels) */}
                <section id="features" className="py-32 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">

                        {/* Feature 1 */}
                        <AnimatedSection className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="flex-1 space-y-6">
                                <div className="p-3 bg-blue-50 rounded-xl w-fit">
                                    <LayoutDashboard className="text-blue-600" size={32} />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-gray-900">Command Center</h2>
                                <p className="text-xl text-gray-600 leading-relaxed">
                                    A unified dashboard that gives you a bird's eye view of your entire operation.
                                    Track sales, inventory, and staff performance in real-time with zero latency.
                                </p>
                                <ul className="space-y-4 pt-4">
                                    {['Real-time metrics', 'Multi-location support', 'AI-powered interface'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-gray-700">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Check size={14} className="text-blue-600" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                <GlassCard className="h-[400px] border-blue-500/30 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                    <img
                                        src="/command_center_v2.png"
                                        alt="Fluxor Command Center UI"
                                        className="w-full h-full object-cover opacity-90 relative z-10"
                                    />
                                </GlassCard>
                            </div>
                        </AnimatedSection>

                        {/* Feature 2 (Reversed) */}
                        <AnimatedSection direction="left" className="flex flex-col lg:flex-row-reverse items-center gap-16">
                            <div className="flex-1 space-y-6">
                                <div className="p-3 bg-violet-50 rounded-xl w-fit">
                                    <Brain className="text-violet-600" size={32} />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-gray-900">AI That Works</h2>
                                <p className="text-xl text-gray-600 leading-relaxed">
                                    Move beyond simple charts. Our AI predicts demand, suggests reorders,
                                    and even drafts emails to suppliers. It's like having a dedicated analyst 24/7.
                                </p>
                            </div>
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                                <GlassCard className="h-[400px] border-violet-500/30 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
                                    <img
                                        src="/ai_dashboard.png"
                                        alt="Fluxor AI Interface"
                                        className="w-full h-full object-cover opacity-90 relative z-10"
                                    />
                                </GlassCard>
                            </div>
                        </AnimatedSection>
                    </div>
                </section >

                {/* FEATURE GRID */}
                < section className="py-24 relative" >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl md:text-5xl font-bold text-gray-900">Everything You Need</h2>
                            <p className="text-lg text-gray-600">Complete toolkit for modern retail</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, i) => (
                                <AnimatedSection key={i} delay={i * 0.1} className="h-full">
                                    <GlassCard className="p-8 h-full hover:border-blue-500/30 transition-colors">
                                        <div className="mb-6">{feature.icon}</div>
                                        <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                                    </GlassCard>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section >

                {/* DEMO CTA */}
                < section id="demo" className="py-32 relative" >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <AnimatedSection className="text-center mb-12">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">See it in action</h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">An interactive walkthrough of the entire platform — dashboard, analytics, AI insights, inventory, vendors, and more.</p>
                        </AnimatedSection>

                        <div className="max-w-3xl mx-auto">
                            <AnimatedSection>
                                <GlassCard className="relative p-12 border-blue-200 bg-blue-50/40 text-center">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200">
                                            <Zap size={14} className="text-blue-600" />
                                            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Live Product Tour</span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-900">Watch Fluxor Cloud run an entire store.</h3>
                                        <p className="text-gray-600 max-w-lg">Auto-paced walkthrough of every feature. No signup, no email — just press play.</p>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] border-0 h-14 px-8 text-lg"
                                            rightIcon={<ArrowRight />}
                                            onClick={goToDemo}
                                        >
                                            Launch Demo
                                        </Button>
                                    </div>
                                </GlassCard>
                            </AnimatedSection>
                        </div>
                    </div >
                </section >

                {/* ABOUT SECTION */}
                <section id="about" className="py-32 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Story */}
                        <AnimatedSection className="mb-32">
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8">Built for Real Stores</h2>
                                    <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                                        <p className="text-gray-700">
                                            In 2023, we spent months working in convenience stores to understand the real challenges owners face.
                                            Spreadsheets, gut feelings, and guesswork were running the show.
                                        </p>
                                        <p className="text-gray-700">
                                            We saw a gap. Big retailers had AI and supercomputers. Small stores had... nothing.
                                            Fluxor Cloud bridges that gap, bringing enterprise-grade intelligence to the people who power our neighborhoods.
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full opacity-30" />
                                    <GlassCard className="p-8 space-y-8">
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">Our Core Values</h3>
                                        <div className="space-y-6">
                                            {[
                                                { title: 'Customer First', desc: 'Every feature starts with your needs.', icon: '❤️' },
                                                { title: 'Simplicity', desc: 'Powerful tech should feel simple.', icon: '🎯' },
                                                { title: 'Innovation', desc: 'Democratizing AI for everyone.', icon: '⚡' },
                                            ].map((val, i) => (
                                                <div key={i} className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">
                                                        {val.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-gray-900 font-medium">{val.title}</h4>
                                                        <p className="text-sm text-gray-600">{val.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="py-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 to-transparent pointer-events-none" />
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <AnimatedSection>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-gray-900">
                                Ready to <span className="text-blue-600">transform your store</span>?
                            </h2>
                            <p className="text-xl text-gray-600 mb-12">
                                Join the waiting list and be the first to experience the future.
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="h-16 px-12 text-lg bg-blue-600 text-white hover:bg-blue-700 border-0 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                onClick={goToDemo}
                            >
                                Get Early Access
                            </Button>
                        </AnimatedSection>
                    </div>
                </section >

                <Footer />
            </main >
        </div >
    );
};

export default Landing;
