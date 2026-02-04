import React, { useState, useEffect } from 'react';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, Check, LayoutDashboard, Brain, X } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import HeroBackground from '../components/HeroBackground';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

const Landing: React.FC = () => {
    const [showDemoModal, setShowDemoModal] = useState(false);
    const { scrollY } = useScroll();
    const location = useLocation();

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
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">
            <Navbar onBookDemo={() => setShowDemoModal(true)} />

            {/* Background Layer */}
            <div className="fixed inset-0 z-0">
                <HeroBackground />
                <motion.div
                    className="absolute inset-0 pointer-events-none bg-[#0f172a]/30"
                    style={{ backdropFilter: `blur(${bgBlur})` }}
                />
            </div>

            <main className="relative z-10 w-full overflow-hidden">

                {/* HERO SECTION */}
                <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
                    <motion.div
                        style={{ opacity: heroOpacity, scale: heroScale }}
                        className="max-w-5xl mx-auto text-center space-y-8"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="flex flex-col items-center mb-12"
                        >
                            <h1 className="text-7xl md:text-9xl font-bold font-outfit tracking-tighter text-white mb-2">FLUXOR</h1>
                            <span className="text-2xl md:text-4xl font-space tracking-[0.3em] text-blue-400 font-light uppercase mb-12">Cloud</span>

                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm mb-8">
                                <Zap size={16} className="text-blue-400" />
                                <span className="text-sm font-medium text-blue-200">AI-Powered Store Management</span>
                            </div>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
                        >
                            Smart Operations for <span className="text-blue-500">Small Stores</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                        >
                            Real insights, smart forecasting, and an AI assistant all in one beautiful
                            dashboard. No spreadsheets. No guesswork.
                        </motion.p>

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
                                onClick={() => setShowDemoModal(true)}
                            >
                                Book a Demo
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                className="bg-white/5 border-white/30 hover:bg-white/10 text-white h-14 px-8 text-lg hover:border-white/50 backdrop-blur-lg"
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
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-500"
                    >
                        <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center p-1">
                            <div className="w-1 h-2 bg-gray-400 rounded-full" />
                        </div>
                    </motion.div>
                </section>

                {/* VISUAL SHOWCASE SECTION (Floating Glass Panels) */}
                <section id="features" className="py-32 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">

                        {/* Feature 1 */}
                        <AnimatedSection className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="flex-1 space-y-6">
                                <div className="p-3 bg-blue-500/10 rounded-xl w-fit">
                                    <LayoutDashboard className="text-blue-400" size={32} />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white">Command Center</h2>
                                <p className="text-xl text-gray-400 leading-relaxed">
                                    A unified dashboard that gives you a bird's eye view of your entire operation.
                                    Track sales, inventory, and staff performance in real-time with zero latency.
                                </p>
                                <ul className="space-y-4 pt-4">
                                    {['Real-time metrics', 'Multi-location support', 'Dark mode interface'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-gray-300">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <Check size={14} className="text-blue-400" />
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
                                <div className="p-3 bg-violet-500/10 rounded-xl w-fit">
                                    <Brain className="text-violet-400" size={32} />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold text-white">AI That Works</h2>
                                <p className="text-xl text-gray-400 leading-relaxed">
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
                            <h2 className="text-3xl md:text-5xl font-bold text-white">Everything You Need</h2>
                            <p className="text-lg text-gray-400">Complete toolkit for modern retail</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((feature, i) => (
                                <AnimatedSection key={i} delay={i * 0.1} className="h-full">
                                    <GlassCard className="p-8 h-full hover:border-blue-500/30 transition-colors">
                                        <div className="mb-6">{feature.icon}</div>
                                        <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                                        <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                                    </GlassCard>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section >

                {/* PRICING */}
                < section id="pricing" className="py-32 relative" >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <AnimatedSection className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Simple Pricing</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">Start small, upgrade as you grow.</p>
                        </AnimatedSection>

                        <div className="max-w-5xl mx-auto">
                            <AnimatedSection>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-[#00BFFF]/20 blur-[100px] rounded-full opacity-50 pointer-events-none" />
                                    <GlassCard className="relative p-12 border-[#00BFFF]/30 bg-[#00BFFF]/5 overflow-hidden">
                                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                                            {/* LEFT SIDE: Hook & CTA */}
                                            <div className="flex-1 text-center lg:text-left space-y-8">
                                                <div>
                                                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#00BFFF] text-white font-bold text-sm tracking-wide mb-6 shadow-[0_0_15px_rgba(0,191,255,0.5)]">
                                                        First Month Free
                                                    </span>
                                                    <h3 className="text-3xl font-bold text-white mb-2">One Plan. Complete Control.</h3>
                                                </div>

                                                <div className="flex items-baseline justify-center lg:justify-start gap-2">
                                                    <span className="text-6xl md:text-7xl font-bold text-white tracking-tighter">$45</span>
                                                    <span className="text-xl text-gray-400">/mo</span>
                                                </div>

                                                <div className="space-y-3">
                                                    <Button
                                                        variant="primary"
                                                        size="lg"
                                                        className="w-full bg-gradient-to-r from-[#00BFFF] to-blue-600 hover:from-[#00ACE6] hover:to-blue-500 border-0 h-16 text-xl font-bold shadow-[0_0_30px_rgba(0,191,255,0.4)]"
                                                        onClick={() => setShowDemoModal(true)}
                                                    >
                                                        Start 30-Day Trial
                                                    </Button>
                                                    <p className="text-sm text-gray-400 text-center">Cancel anytime. No credit card required.</p>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE: Feature Stack */}
                                            <div className="flex-1 lg:border-l border-white/10 lg:pl-12 w-full">
                                                <h4 className="text-xl font-semibold text-white mb-8 flex items-center gap-3">
                                                    Everything included:
                                                </h4>
                                                <ul className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                                                    {[
                                                        'Unlimited Products',
                                                        'Demand Forecasting',
                                                        'AI Insights & Reordering',
                                                        'Multi-store Support',
                                                        'API Access',
                                                        '24/7 Priority Support'
                                                    ].map((feature) => (
                                                        <li key={feature} className="flex items-center gap-3 text-gray-300">
                                                            <div className="w-6 h-6 rounded-full bg-[#00BFFF]/20 flex items-center justify-center flex-shrink-0">
                                                                <Check size={14} className="text-[#00BFFF]" />
                                                            </div>
                                                            <span className="font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            </AnimatedSection>
                        </div>
                    </div >
                </section >

                {/* FINAL CTA */}
                < section className="py-32 relative overflow-hidden" >
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <AnimatedSection>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight text-white">
                                Ready to <span className="text-blue-500">transform your store</span>?
                            </h2>
                            <p className="text-xl text-gray-400 mb-12">
                                Join the waiting list and be the first to experience the future.
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="h-16 px-12 text-lg bg-white text-black hover:bg-gray-200 border-0 shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                                onClick={() => setShowDemoModal(true)}
                            >
                                Get Early Access
                            </Button>
                        </AnimatedSection>
                    </div>
                </section >

                <Footer />
            </main >

            {/* DEMO MODAL */}
            {
                showDemoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-lg">
                        <GlassCard className="max-w-lg w-full mx-4 p-10 relative border-blue-500/30 bg-[#0f172a]/95 shadow-[0_0_60px_rgba(59,130,246,0.3)]">
                            <button
                                onClick={() => setShowDemoModal(false)}
                                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={28} width={28} />
                            </button>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
                                    <Zap size={14} className="text-blue-400" />
                                    <span className="text-xs font-medium text-blue-300 uppercase tracking-wider">Free Demo</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                                    Schedule Your Demo
                                </h2>
                                <p className="text-gray-400 text-lg">
                                    See how Fluxor Cloud can transform your store operations.
                                </p>
                            </div>
                            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setShowDemoModal(false); }}>
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="w-full bg-white/5 border border-white/20 rounded-xl px-5 py-4 text-white text-lg placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full justify-center h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-0 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all"
                                >
                                    Request Demo
                                </Button>
                                <p className="text-center text-sm text-gray-500">
                                    We'll reach out within 24 hours to schedule your personalized demo.
                                </p>
                            </form>
                        </GlassCard>
                    </div>
                )
            }
        </div >
    );
};

export default Landing;
