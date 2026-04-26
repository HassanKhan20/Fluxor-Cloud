import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Boxes,
    Upload,
    Receipt,
    LineChart,
    Settings,
    LogOut,
    Menu,
    X,
    Truck,
    UserCheck,
    ShoppingCart,
} from 'lucide-react';
import StreamlineAnimation from './StreamlineAnimation';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface NavGroup {
    label: string;
    items: { id: number; icon: React.ReactNode; label: string; path: string }[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMounted(true);
    }, []);

    const navGroups: NavGroup[] = [
        {
            label: 'Overview',
            items: [
                { id: 0, icon: <LayoutDashboard size={17} />, label: 'Dashboard', path: '/dashboard' },
                { id: 4, icon: <LineChart size={17} />, label: 'Analytics', path: '/analytics' },
            ],
        },
        {
            label: 'Operations',
            items: [
                { id: 1, icon: <Boxes size={17} />, label: 'Inventory', path: '/products' },
                { id: 2, icon: <Upload size={17} />, label: 'Import Sales', path: '/sales' },
                { id: 3, icon: <Receipt size={17} />, label: 'Invoices', path: '/invoices' },
                { id: 7, icon: <ShoppingCart size={17} />, label: 'Reorder', path: '/reorder' },
            ],
        },
        {
            label: 'Network',
            items: [
                { id: 5, icon: <Truck size={17} />, label: 'Vendors', path: '/vendors' },
                { id: 6, icon: <UserCheck size={17} />, label: 'Staff', path: '/staff' },
            ],
        },
    ];

    const isActive = (path: string) => location.pathname === path;

    const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => (
        <div
            className="flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm"
            style={{ width: size, height: size }}
        >
            <span className="font-display font-bold text-white tracking-tighter" style={{ fontSize: size * 0.5 }}>
                F
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-ink-50 flex font-sans">
            <StreamlineAnimation key={location.pathname} />

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-ink-200 z-50 flex items-center px-4">
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 -ml-2 text-ink-600 hover:text-ink-900 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <Link to="/dashboard" className="flex items-center gap-2 ml-2">
                    <Logo size={28} />
                    <span className="font-display text-[15px] font-semibold tracking-tight text-ink-900">Fluxor</span>
                </Link>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-200 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-14 flex items-center justify-between px-5 border-b border-ink-200">
                    <Link to="/dashboard" className="flex items-center gap-2.5">
                        <Logo size={28} />
                        <div className="flex flex-col leading-tight">
                            <span className="font-display text-[15px] font-semibold text-ink-900 tracking-tight">Fluxor</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">Cloud</span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 -mr-2 text-ink-500 hover:text-ink-900"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    {navGroups.map(group => (
                        <div key={group.label} className="mb-5">
                            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map(item => (
                                    <Link
                                        key={`mobile-${item.id}`}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive(item.path)
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                                            }`}
                                    >
                                        <span className="flex-shrink-0">{item.icon}</span>
                                        <span className="font-medium text-[13px]">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-ink-200 space-y-0.5">
                    <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-ink-600 hover:bg-ink-50 hover:text-ink-900 transition-colors"
                    >
                        <Settings size={17} />
                        <span className="font-medium text-[13px]">Settings</span>
                    </Link>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-ink-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                        <LogOut size={17} />
                        <span className="font-medium text-[13px]">Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside
                key={`sidebar-${mounted}`}
                className="hidden lg:flex w-60 bg-white border-r border-ink-200 flex-col fixed h-full z-40"
            >
                <div className="h-16 flex items-center px-5 border-b border-ink-200">
                    <Link to="/dashboard" className="flex items-center gap-2.5">
                        <Logo size={32} />
                        <div className="flex flex-col leading-tight">
                            <span className="font-display text-base font-semibold text-ink-900 tracking-tight">Fluxor</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">Cloud</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-5 overflow-y-auto">
                    {navGroups.map(group => (
                        <div key={group.label} className="mb-5">
                            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map(item => (
                                    <Link
                                        key={`desktop-${item.id}`}
                                        to={item.path}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isActive(item.path)
                                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                            : 'text-ink-600 font-medium hover:bg-ink-50 hover:text-ink-900'
                                            }`}
                                    >
                                        <span className="flex-shrink-0">{item.icon}</span>
                                        <span className="text-[13px] tracking-tight">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-ink-200 space-y-0.5">
                    <Link
                        to="/settings"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink-600 hover:bg-ink-50 hover:text-ink-900 transition-colors"
                    >
                        <Settings size={17} />
                        <span className="font-medium text-[13px]">Settings</span>
                    </Link>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-ink-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                        <LogOut size={17} />
                        <span className="font-medium text-[13px]">Sign out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">{children}</main>
        </div>
    );
};

export default DashboardLayout;
