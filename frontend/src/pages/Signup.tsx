import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Store, ArrowRight, ArrowLeft, Chrome, MapPin, DollarSign, Clock } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { api } from '../lib/api';

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        storeName: '',
        storeAddress: '',
        currency: 'USD',
        timezone: 'UTC',
    });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await api.post('/auth/register', formData);
            localStorage.setItem('token', data.token);
            navigate('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#005CFF] to-[#0047CC] relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Floating Elements */}
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-[#FECF33]/20 rounded-full blur-3xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                            <span className="text-[#005CFF] font-bold text-xl">F</span>
                        </div>
                        <span className="text-xl font-bold text-white">
                            FluxorCloud
                        </span>
                    </Link>

                    {/* Main Content */}
                    <div className="max-w-md">
                        <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
                            Start your journey to smarter store management
                        </h1>
                        <p className="text-blue-100 text-lg leading-relaxed mb-8">
                            Join 500+ store owners who trust Fluxor Cloud to run their business smarter.
                        </p>

                        {/* Features List */}
                        <div className="space-y-4">
                            {[
                                'Free 14-day trial, no credit card',
                                'Setup in under 5 minutes',
                                'Import your existing data easily',
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-white">
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex items-center gap-4 text-white/80 text-sm">
                        <span className="text-yellow-300">★★★★★</span>
                        <span>Rated 4.9/5 by store owners</span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-[#005CFF] rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-xl">F</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900">
                                Fluxor<span className="text-[#005CFF]">Cloud</span>
                            </span>
                        </Link>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-[#005CFF]' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step === 1 ? 'bg-[#005CFF] text-white' : step > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {step > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-sm font-medium hidden sm:inline">Account</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-200" />
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#005CFF]' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step === 2 ? 'bg-[#005CFF] text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                2
                            </div>
                            <span className="text-sm font-medium hidden sm:inline">Store</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {step === 1 ? 'Create your account' : 'Set up your store'}
                        </h2>
                        <p className="text-gray-600">
                            {step === 1 ? (
                                <>Already have an account? <Link to="/login" className="text-[#005CFF] font-medium hover:underline">Sign in</Link></>
                            ) : (
                                'Tell us about your store'
                            )}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={step === 1 ? nextStep : handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <>
                                {/* Social Signup */}
                                <button type="button" className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl
                                   text-gray-700 font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
                                    <Chrome size={20} />
                                    Continue with Google
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500">or</span>
                                    </div>
                                </div>

                                <Input
                                    label="Full name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    leftIcon={<User size={20} />}
                                    required
                                />

                                <Input
                                    type="email"
                                    label="Email address"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    leftIcon={<Mail size={20} />}
                                    required
                                />

                                <Input
                                    type="password"
                                    label="Password"
                                    placeholder="At least 8 characters"
                                    value={formData.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    leftIcon={<Lock size={20} />}
                                    helperText="Must be at least 8 characters"
                                    required
                                />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Input
                                    label="Store name"
                                    placeholder="My Awesome Store"
                                    value={formData.storeName}
                                    onChange={(e) => updateField('storeName', e.target.value)}
                                    leftIcon={<Store size={20} />}
                                    required
                                />

                                <Input
                                    label="Store address (optional)"
                                    placeholder="123 Main St, City"
                                    value={formData.storeAddress}
                                    onChange={(e) => updateField('storeAddress', e.target.value)}
                                    leftIcon={<MapPin size={20} />}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => updateField('currency', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900
                                   focus:border-[#005CFF] focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-200"
                                            >
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="CAD">CAD ($)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <select
                                                value={formData.timezone}
                                                onChange={(e) => updateField('timezone', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white text-gray-900
                                   focus:border-[#005CFF] focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-200"
                                            >
                                                <option value="UTC">UTC</option>
                                                <option value="America/New_York">Eastern</option>
                                                <option value="America/Chicago">Central</option>
                                                <option value="America/Los_Angeles">Pacific</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex gap-4 pt-2">
                            {step === 2 && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => setStep(1)}
                                    leftIcon={<ArrowLeft size={20} />}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="flex-1"
                                isLoading={isLoading}
                                rightIcon={!isLoading && <ArrowRight size={20} />}
                            >
                                {step === 1 ? 'Continue' : 'Create Account'}
                            </Button>
                        </div>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-gray-500">
                        By creating an account, you agree to our{' '}
                        <Link to="/terms" className="text-[#005CFF] hover:underline">Terms</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-[#005CFF] hover:underline">Privacy Policy</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
