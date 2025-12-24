import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { api } from '../lib/api';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            // Store user info for personalized experience
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
            navigate('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0B0B0B] relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#005CFF]/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#FECF33]/20 rounded-full blur-3xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#005CFF] rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">F</span>
                        </div>
                        <span className="text-xl font-bold text-white">
                            Fluxor<span className="text-[#005CFF]">Cloud</span>
                        </span>
                    </Link>

                    {/* Main Content */}
                    <div className="max-w-md">
                        <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
                            Welcome back to your store command center
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            Access real-time insights, manage inventory, and let AI help you make smarter decisions.
                        </p>
                    </div>

                    {/* Testimonial */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <p className="text-gray-300 italic mb-4">
                            "Fluxor Cloud has completely changed how I run my store.
                            The AI insights alone have saved me thousands."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                            <div>
                                <p className="font-medium text-white">Sarah Chen</p>
                                <p className="text-sm text-gray-500">QuickMart Owner</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <Link to="/">
                            <img src="/fluxor-logo.png" alt="Fluxor Cloud" className="h-12 w-auto" />
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
                        <p className="text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-[#005CFF] font-medium hover:underline">
                                Create one
                            </Link>
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3 mb-8">
                        <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl
                               text-gray-700 font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
                            <Chrome size={20} />
                            Continue with Google
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">or continue with email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <Input
                            type="email"
                            label="Email address"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={<Mail size={20} />}
                            required
                        />

                        <Input
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            leftIcon={<Lock size={20} />}
                            required
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-[#005CFF] focus:ring-[#005CFF]"
                                />
                                <span className="text-sm text-gray-600">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-sm text-[#005CFF] font-medium hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                            rightIcon={!isLoading && <ArrowRight size={20} />}
                        >
                            Sign in
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="mt-8 text-center text-sm text-gray-500">
                        By signing in, you agree to our{' '}
                        <Link to="/terms" className="text-[#005CFF] hover:underline">Terms</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-[#005CFF] hover:underline">Privacy Policy</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
