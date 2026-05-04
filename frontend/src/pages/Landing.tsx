import React, { useEffect } from 'react';
import { ArrowRight, BarChart3, Package, Bot, TrendingUp, FileText, Zap, Check, LayoutDashboard, Shield, Lock, Database, Activity, Sparkles, Target, HeartHandshake } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import HeroBackground from '../components/HeroBackground';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';
import { DashboardMockup, AIAssistantMockup } from '../components/LandingMockups';

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
                <section className="relative min-h-[88vh] md:min-h-screen flex items-center justify-center px-4 pt-24 md:pt-20 pb-16 md:pb-0">
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
                            <h1 className="font-display text-6xl md:text-8xl font-semibold text-ink-900 mb-2 tracking-tightest">Fluxor</h1>
                            <span className="font-mono text-[11px] md:text-xs tracking-[0.32em] text-indigo-600 uppercase font-medium mb-8">Cloud Operations Platform</span>

                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 backdrop-blur-sm mb-6">
                                <Shield size={13} className="text-indigo-600" strokeWidth={2.25} />
                                <span className="text-[11px] font-medium text-indigo-700 tracking-wide">Enterprise-Grade Tools for Local Stores</span>
                            </div>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="font-display text-3xl md:text-5xl font-semibold text-ink-900 mb-5 tracking-tight leading-[1.08]"
                        >
                            Enterprise-grade operations,<br className="hidden md:block" />
                            <span className="text-indigo-600">built for independent stores.</span>
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="text-[15px] md:text-lg text-ink-600 max-w-xl mx-auto leading-relaxed"
                        >
                            The analytics and automation trusted by national chains — engineered specifically for convenience stores. Reliable, secure, and designed for real-world operations.
                        </motion.p>

                        {/* Trust Strip */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-7 text-[11px] font-medium text-ink-500 uppercase tracking-[0.1em]"
                        >
                            <div className="flex items-center gap-1.5">
                                <Lock size={11} className="text-emerald-600" strokeWidth={2.5} />
                                <span>Secure Infrastructure</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Database size={11} className="text-indigo-600" strokeWidth={2.5} />
                                <span>Tenant Data Isolation</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Shield size={11} className="text-violet-600" strokeWidth={2.5} />
                                <span>Role-Based Access</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Activity size={11} className="text-rose-600" strokeWidth={2.5} />
                                <span>Real-Time Analytics</span>
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
                                className="bg-ink-900 hover:bg-ink-800 border-0 h-12 px-7 text-[15px] font-medium tracking-tight"
                                rightIcon={<ArrowRight size={18} />}
                                onClick={goToDemo}
                            >
                                View Live Demo
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                className="bg-white border-ink-200 hover:bg-ink-50 text-ink-700 h-12 px-7 text-[15px] font-medium tracking-tight hover:border-ink-300"
                                onClick={() => {
                                    const element = document.querySelector('#features');
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                            >
                                Explore Features
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

                {/* VISUAL SHOWCASE SECTION */}
                <section id="features" className="py-16 md:py-32 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-40">

                        {/* Feature 1 — Command Center */}
                        <AnimatedSection className="grid lg:grid-cols-12 items-center gap-12 lg:gap-16">
                            <div className="lg:col-span-5 space-y-7">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                                    <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2.25} />
                                    <span className="font-mono text-[10px] font-semibold text-indigo-700 uppercase tracking-[0.14em]">Command Center</span>
                                </div>

                                <h2 className="font-display text-4xl md:text-5xl font-semibold text-ink-900 tracking-tightest leading-[1.05]">
                                    Every metric that matters.<br />
                                    <span className="text-indigo-600">Zero noise.</span>
                                </h2>

                                <p className="text-[15px] text-ink-600 leading-relaxed">
                                    A daily briefing built around your store's reality — revenue,
                                    transactions, inventory health, and the issues that need a decision before noon.
                                </p>

                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    {[
                                        { label: 'Faster decisions', value: '4.2×' },
                                        { label: 'Avg setup', value: '< 5 min' },
                                        { label: 'Stockouts cut', value: '−38%' },
                                    ].map(stat => (
                                        <div key={stat.label} className="border-l-2 border-indigo-600 pl-3">
                                            <div className="font-display text-xl font-semibold text-ink-900 tracking-tight tabular-nums">{stat.value}</div>
                                            <div className="text-[11px] text-ink-500 leading-tight mt-0.5">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <ul className="space-y-3 pt-2">
                                    {[
                                        'Real-time KPIs across every register',
                                        'Multi-location consolidated rollup',
                                        'Briefings tuned to each role',
                                    ].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-ink-700">
                                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <Check size={12} className="text-indigo-600" strokeWidth={3} />
                                            </div>
                                            <span className="text-[14.5px]">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="lg:col-span-7 relative">
                                <div className="absolute -inset-8 bg-gradient-to-tr from-indigo-400/15 via-indigo-300/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                                <div className="relative h-[300px] sm:h-[380px] md:h-[480px]">
                                    <DashboardMockup />
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Feature 2 — AI Assistant */}
                        <AnimatedSection direction="left" className="grid lg:grid-cols-12 items-center gap-12 lg:gap-16">
                            <div className="lg:col-span-7 relative order-2 lg:order-1">
                                <div className="absolute -inset-8 bg-gradient-to-tl from-violet-400/15 via-indigo-300/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                                <div className="relative h-[300px] sm:h-[380px] md:h-[480px]">
                                    <AIAssistantMockup />
                                </div>
                            </div>

                            <div className="lg:col-span-5 space-y-7 order-1 lg:order-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
                                    <Sparkles className="w-3.5 h-3.5 text-violet-600" strokeWidth={2.25} />
                                    <span className="font-mono text-[10px] font-semibold text-violet-700 uppercase tracking-[0.14em]">AI Assistant</span>
                                </div>

                                <h2 className="font-display text-4xl md:text-5xl font-semibold text-ink-900 tracking-tightest leading-[1.05]">
                                    Ask in plain English.<br />
                                    <span className="text-violet-600">Get an answer that ships.</span>
                                </h2>

                                <p className="text-[15px] text-ink-600 leading-relaxed">
                                    Diagnose drops, draft purchase orders, and surface the next best action — without
                                    a query language, a dashboard config, or a data team.
                                </p>

                                <div className="space-y-2.5">
                                    {[
                                        { q: 'Why did beverages drop yesterday?', a: 'Coke 20oz stockout at 2:14pm — $214 lost.' },
                                        { q: 'Draft a reorder for PepsiCo.', a: '3 SKUs · $186.40 ready to send.' },
                                        { q: 'Which vendor has the worst margin?', a: 'Coca-Cola Co — 28%, 3.2% waste.' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-ink-200 hover:border-violet-300 hover:shadow-sm transition-all">
                                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-medium text-ink-900 truncate">{item.q}</div>
                                                <div className="text-[12px] text-ink-500 truncate">{item.a}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </section >

                {/* FEATURE GRID */}
                < section className="py-16 md:py-24 relative" >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-10 md:mb-16 space-y-4">
                            <h2 className="font-display text-3xl md:text-5xl font-semibold text-ink-900 tracking-tight leading-[1.05]">Everything You Need</h2>
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
                < section id="demo" className="py-16 md:py-32 relative" >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <AnimatedSection className="text-center mb-10 md:mb-12">
                            <h2 className="font-display text-3xl md:text-5xl font-semibold mb-6 text-ink-900 tracking-tight leading-[1.05]">See it in action</h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">An interactive walkthrough of the entire platform — dashboard, analytics, AI insights, inventory, vendors, and more.</p>
                        </AnimatedSection>

                        <div className="max-w-3xl mx-auto">
                            <AnimatedSection>
                                <GlassCard className="relative p-6 sm:p-10 md:p-12 border-indigo-200 bg-indigo-50/40 text-center">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 border border-indigo-200">
                                            <Zap size={13} className="text-indigo-600" strokeWidth={2.25} />
                                            <span className="font-mono text-[10px] font-semibold text-indigo-700 uppercase tracking-[0.14em]">Live Product Tour</span>
                                        </div>
                                        <h3 className="font-display text-3xl font-semibold text-ink-900 tracking-tight">Watch Fluxor Cloud run an entire store.</h3>
                                        <p className="text-ink-600 max-w-lg">Auto-paced walkthrough of every feature. No signup, no email — just press play.</p>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="bg-ink-900 hover:bg-ink-800 border-0 h-12 px-7 text-[15px] font-medium tracking-tight"
                                            rightIcon={<ArrowRight size={18} />}
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
                <section id="about" className="py-16 md:py-32 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Story */}
                        <AnimatedSection className="mb-16 md:mb-32">
                            <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-center">
                                <div>
                                    <h2 className="font-display text-3xl md:text-5xl font-semibold text-ink-900 mb-6 md:mb-8 tracking-tight leading-[1.05]">Built for Real Stores</h2>
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
                                                { title: 'Customer First', desc: 'Every feature starts with your needs.', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50' },
                                                { title: 'Simplicity', desc: 'Powerful tech should feel simple.', icon: Target, color: 'text-blue-600 bg-blue-50' },
                                                { title: 'Innovation', desc: 'Democratizing AI for everyone.', icon: Sparkles, color: 'text-violet-600 bg-violet-50' },
                                            ].map((val, i) => {
                                                const Icon = val.icon;
                                                return (
                                                    <div key={i} className="flex gap-4">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${val.color}`}>
                                                            <Icon className="w-5 h-5" strokeWidth={2} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-gray-900 font-medium">{val.title}</h4>
                                                            <p className="text-sm text-gray-600">{val.desc}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </GlassCard>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="py-16 md:py-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-50/50 to-transparent pointer-events-none" />
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <AnimatedSection>
                            <h2 className="font-display text-4xl md:text-6xl font-semibold mb-6 tracking-tightest text-ink-900 leading-[1.04]">
                                Ready to <span className="text-indigo-600">transform your store</span>?
                            </h2>
                            <p className="text-lg text-ink-600 mb-12 max-w-xl mx-auto">
                                Join the waiting list and be among the first stores to operate with enterprise-grade intelligence.
                            </p>
                            <Button
                                variant="primary"
                                size="lg"
                                className="h-13 px-8 text-[15px] font-medium tracking-tight bg-ink-900 text-white hover:bg-ink-800 border-0"
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
