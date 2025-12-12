import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';

const Pricing: React.FC = () => {
    const plans = [
        {
            name: 'Starter',
            price: 0,
            description: 'Perfect for trying out Fluxor Cloud',
            features: [
                'Up to 100 products',
                'Basic sales analytics',
                'CSV data import',
                'Email support',
                '1 user account',
            ],
            cta: 'Start Free',
            popular: false,
        },
        {
            name: 'Pro',
            price: 19,
            description: 'Best for growing convenience stores',
            features: [
                'Unlimited products',
                'Advanced analytics & charts',
                'AI-powered insights',
                'Invoice OCR (50/month)',
                'Priority email support',
                'Up to 3 user accounts',
                'Data export',
            ],
            cta: 'Start Free Trial',
            popular: true,
        },
        {
            name: 'Business',
            price: 49,
            description: 'For multi-location stores',
            features: [
                'Everything in Pro',
                'Unlimited Invoice OCR',
                'AI demand forecasting',
                'AI Chat Assistant',
                'Phone & chat support',
                'Unlimited users',
                'Multi-store dashboard',
                'API access',
            ],
            cta: 'Contact Sales',
            popular: false,
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium mb-6">
                        <Zap size={16} />
                        <span>Simple, transparent pricing</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        Plans that grow with your store
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto" style={{ lineHeight: '1.7' }}>
                        Start free and upgrade as you grow. No hidden fees. Cancel anytime.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative rounded-2xl p-8 ${plan.popular
                                        ? 'bg-blue-600 text-white shadow-xl scale-105'
                                        : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                                    } transition-all duration-300`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-gray-900 text-sm font-semibold rounded-full">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                                        {plan.name}
                                    </h3>
                                    <p className={`text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-500'}`} style={{ lineHeight: '1.6' }}>
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                                        ${plan.price}
                                    </span>
                                    <span className={plan.popular ? 'text-blue-100' : 'text-gray-500'}>/month</span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-white/20' : 'bg-green-100'
                                                }`}>
                                                <Check size={12} className={plan.popular ? 'text-white' : 'text-green-600'} />
                                            </div>
                                            <span className={`text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <Link to="/signup">
                                    <Button
                                        variant={plan.popular ? 'dark' : 'primary'}
                                        size="lg"
                                        className={`w-full ${plan.popular ? 'bg-white text-blue-600 hover:bg-gray-100' : ''}`}
                                        rightIcon={<ArrowRight size={18} />}
                                    >
                                        {plan.cta}
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                q: 'Can I try Fluxor Cloud for free?',
                                a: 'Yes! Our Starter plan is completely free forever. You can also try Pro with a 14-day free trial.',
                            },
                            {
                                q: 'What payment methods do you accept?',
                                a: 'We accept all major credit cards, PayPal, and for Business plans, we also offer invoicing.',
                            },
                            {
                                q: 'Can I change plans later?',
                                a: 'Absolutely. You can upgrade or downgrade at any time. Changes take effect immediately.',
                            },
                            {
                                q: 'Is my data secure?',
                                a: 'Yes. We use bank-level encryption and your data is stored securely in the cloud with daily backups.',
                            },
                        ].map((faq, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                                <p className="text-gray-600" style={{ lineHeight: '1.7' }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Pricing;
