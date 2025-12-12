import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Target, Users, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

const About: React.FC = () => {
    const values = [
        {
            icon: <Heart size={28} />,
            title: 'Customer First',
            description: 'Every feature we build starts with one question: how does this help small store owners succeed?',
        },
        {
            icon: <Target size={28} />,
            title: 'Simplicity',
            description: 'Powerful technology should be easy to use. We hide the complexity so you can focus on your business.',
        },
        {
            icon: <Zap size={28} />,
            title: 'Innovation',
            description: 'We bring enterprise-grade AI and analytics to small businesses at a fraction of the cost.',
        },
        {
            icon: <Users size={28} />,
            title: 'Community',
            description: 'We learn from our users every day. Your feedback shapes our product roadmap.',
        },
    ];

    const team = [
        { name: 'Alex Chen', role: 'CEO & Co-Founder', bio: 'Former small business owner who knows the pain firsthand.' },
        { name: 'Sarah Johnson', role: 'CTO & Co-Founder', bio: 'Ex-Google engineer passionate about AI for small business.' },
        { name: 'Mike Williams', role: 'Head of Product', bio: 'Built products used by millions at Shopify.' },
        { name: 'Emily Davis', role: 'Head of Customer Success', bio: 'Dedicated to making every customer successful.' },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        We believe small stores deserve <span className="text-blue-600">big technology</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto" style={{ lineHeight: '1.7' }}>
                        Fluxor Cloud was born from a simple observation: convenience stores and small shops power our communities, but they're often left behind by technology.
                    </p>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-20">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Story</h2>
                    <div className="space-y-6">
                        <p className="text-lg text-gray-600" style={{ lineHeight: '1.8' }}>
                            In 2023, our founders spent time working in convenience stores and small grocery shops to understand the challenges owners face every day. What they found was eye-opening: store owners were making critical decisions based on gut feeling, spending hours on spreadsheets, and struggling to keep up with larger competitors.
                        </p>
                        <p className="text-lg text-gray-600" style={{ lineHeight: '1.8' }}>
                            They saw a gap. Enterprise retailers had access to sophisticated analytics, demand forecasting, and AI tools. Small stores had none of this — until now.
                        </p>
                        <p className="text-lg text-gray-600" style={{ lineHeight: '1.8' }}>
                            Fluxor Cloud brings the power of AI and modern analytics to the people who need it most: the hardworking entrepreneurs who keep our neighborhoods running. We're leveling the playing field, one store at a time.
                        </p>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {values.map((value) => (
                            <div key={value.title} className="text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                                    {value.icon}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{value.title}</h3>
                                <p className="text-sm text-gray-600" style={{ lineHeight: '1.6' }}>{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="py-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Meet the Team</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {team.map((member) => (
                            <div key={member.name} className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4" />
                                <h3 className="font-bold text-gray-900">{member.name}</h3>
                                <p className="text-sm text-blue-600 mb-2">{member.role}</p>
                                <p className="text-sm text-gray-600" style={{ lineHeight: '1.6' }}>{member.bio}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-20 bg-gray-900">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div>
                            <p className="text-5xl font-bold text-white mb-2">500+</p>
                            <p className="text-gray-400">Stores using Fluxor</p>
                        </div>
                        <div>
                            <p className="text-5xl font-bold text-white mb-2">$2M+</p>
                            <p className="text-gray-400">Revenue tracked monthly</p>
                        </div>
                        <div>
                            <p className="text-5xl font-bold text-white mb-2">4.9/5</p>
                            <p className="text-gray-400">Average customer rating</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                        Ready to join our mission?
                    </h2>
                    <p className="text-lg text-gray-600 mb-8" style={{ lineHeight: '1.7' }}>
                        Whether you're a store owner looking to grow, or someone who wants to help build the future of small business technology.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                                Start Free Trial
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button variant="secondary" size="lg">
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

export default About;
