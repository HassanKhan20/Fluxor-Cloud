import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Privacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            <main className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>

                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-blue-400" size={32} />
                            <h1 className="text-4xl font-bold">Privacy Policy</h1>
                        </div>

                        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

                        <div className="prose prose-invert prose-lg max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Overview</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Fluxor Cloud ("we", "our", "us") is committed to protecting your privacy.
                                    This policy explains how we collect, use, and safeguard your information
                                    when you use our store management platform.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
                                <ul className="text-gray-300 space-y-2 list-disc list-inside">
                                    <li><strong>Account Information:</strong> Name, email address, and password when you register</li>
                                    <li><strong>Business Data:</strong> Store information, product catalogs, sales records, and inventory data you upload</li>
                                    <li><strong>Usage Data:</strong> How you interact with our platform to improve our services</li>
                                    <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
                                <ul className="text-gray-300 space-y-2 list-disc list-inside">
                                    <li>Provide and maintain our store management services</li>
                                    <li>Process and display your business analytics</li>
                                    <li>Send important service notifications</li>
                                    <li>Improve our platform based on usage patterns</li>
                                    <li>Respond to your support requests</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    We implement industry-standard security measures including encrypted data
                                    transmission (TLS), secure cloud infrastructure, and strict access controls.
                                    Your business data is isolated at the store level—no other customer can
                                    access your information.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
                                <p className="text-gray-300 leading-relaxed mb-4">You have the right to:</p>
                                <ul className="text-gray-300 space-y-2 list-disc list-inside">
                                    <li>Access and export your data at any time</li>
                                    <li>Request correction of inaccurate information</li>
                                    <li>Delete your account and associated data</li>
                                    <li>Opt out of non-essential communications</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    For privacy-related questions, contact us at{' '}
                                    <a href="mailto:privacy@fluxorcloud.com" className="text-blue-400 hover:underline">
                                        privacy@fluxorcloud.com
                                    </a>
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Privacy;
