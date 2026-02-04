import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms: React.FC = () => {
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
                            <FileText className="text-blue-400" size={32} />
                            <h1 className="text-4xl font-bold">Terms of Service</h1>
                        </div>

                        <p className="text-gray-400 mb-8">Last updated: February 2026</p>

                        <div className="prose prose-invert prose-lg max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Agreement to Terms</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    By accessing or using Fluxor Cloud, you agree to be bound by these Terms of Service.
                                    If you do not agree to these terms, please do not use our services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Service Description</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Fluxor Cloud provides store management software including inventory tracking,
                                    sales analytics, vendor intelligence, and AI-assisted insights for retail
                                    convenience stores.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">User Responsibilities</h2>
                                <ul className="text-gray-300 space-y-2 list-disc list-inside">
                                    <li>Maintain the confidentiality of your account credentials</li>
                                    <li>Provide accurate and complete information</li>
                                    <li>Use the service in compliance with applicable laws</li>
                                    <li>Not attempt to access other users' data or disrupt the service</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Data Ownership</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    You retain full ownership of all business data you upload to Fluxor Cloud.
                                    We act solely as a data processor on your behalf. Your data will never be
                                    sold or shared with third parties for marketing purposes.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">AI Features Disclaimer</h2>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                    <p className="text-gray-300 leading-relaxed">
                                        Fluxor Cloud includes AI-powered features for analytics and insights.
                                        These features are provided as decision-support tools only.
                                        AI-generated suggestions should be reviewed before acting upon them.
                                        We do not guarantee the accuracy of AI predictions or recommendations,
                                        and users are responsible for their own business decisions.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Service Availability</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    We strive to maintain high availability but do not guarantee uninterrupted
                                    access. Scheduled maintenance will be communicated in advance when possible.
                                    We are not liable for any losses due to service interruptions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    Fluxor Cloud is provided "as is" without warranties of any kind.
                                    Our liability is limited to the amount you paid for the service in the
                                    12 months preceding any claim.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    You may cancel your account at any time. Upon cancellation, your data
                                    will be retained for 30 days to allow for export, after which it will
                                    be permanently deleted.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    For questions about these terms, contact us at{' '}
                                    <a href="mailto:legal@fluxorcloud.com" className="text-blue-400 hover:underline">
                                        legal@fluxorcloud.com
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

export default Terms;
