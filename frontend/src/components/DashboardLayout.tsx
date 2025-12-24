import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Package, Upload, TrendingUp, LineChart, Settings, LogOut, Menu } from 'lucide-react';
import StreamlineAnimation from './StreamlineAnimation';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { icon: <BarChart3 size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <Package size={20} />, label: 'Inventory', path: '/products' },
        { icon: <Upload size={20} />, label: 'Import Sales', path: '/sales' },
        { icon: <TrendingUp size={20} />, label: 'Invoices', path: '/invoices' },
        { icon: <LineChart size={20} />, label: 'Analytics', path: '/analytics' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* One-time page load animation */}
            <StreamlineAnimation key={location.pathname} />
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 fixed h-full z-40`}
                onMouseEnter={() => setSidebarOpen(true)}
                onMouseLeave={() => setSidebarOpen(false)}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2">
                        {/* Premium Cloud + Hexagon Network Logo */}
                        <svg viewBox="0 0 40 40" className="h-10 w-10 flex-shrink-0">
                            <defs>
                                <linearGradient id="layoutCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#1E3A5F" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                            </defs>
                            {/* Light blue background */}
                            <rect x="0" y="0" width="40" height="40" rx="10" fill="#E0F2FE" />
                            <path d="M32 22c0-4.4-3.6-8-8-8-1.5 0-2.9.4-4.1 1.1C18.5 12.3 15.5 10 12 10c-4.4 0-8 3.6-8 8 0 .4 0 .8.1 1.2C1.7 20.1 0 22.4 0 25c0 3.3 2.7 6 6 6h24c3.3 0 6-2.7 6-6 0-2.6-1.7-4.8-4-5.6 0-.1 0-.3 0-.4z"
                                fill="url(#layoutCloudGrad)" transform="translate(4, 5) scale(0.8)" />
                            <g transform="translate(20, 20)">
                                <polygon points="0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3" fill="none" stroke="white" strokeWidth="1.2" opacity="0.95" />
                                <circle cx="0" cy="-6" r="1.5" fill="white" />
                                <circle cx="5.2" cy="-3" r="1.5" fill="white" />
                                <circle cx="5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="0" cy="6" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="3" r="1.5" fill="white" />
                                <circle cx="-5.2" cy="-3" r="1.5" fill="white" />
                            </g>
                        </svg>
                        {sidebarOpen && (
                            <div className="flex flex-col">
                                <span className="text-base font-bold tracking-tight text-slate-800">FLUXOR</span>
                                <span className="text-[10px] font-medium tracking-widest text-blue-500">CLOUD</span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive(item.path)
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            {sidebarOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="p-3 border-t border-gray-100 space-y-1">
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                        <Settings size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Settings</span>}
                    </Link>
                    <button
                        onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="font-medium text-sm">Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content - with margin for sidebar */}
            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
