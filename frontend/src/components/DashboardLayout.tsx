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
    ChefHat,
    HeartHandshake,
    ClipboardList,
    Printer,
} from 'lucide-react';
import StreamlineAnimation from './StreamlineAnimation';
import { useFacility } from './FacilityTypeGate';

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
    const { isRetirement } = useFacility();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Two distinct nav layouts depending on facility type. Retirement-home
    // facilities don't see Sales / Reorder / Vendors as the primary actions —
    // their world is residents, meals, and supplies.
    const navGroups: NavGroup[] = isRetirement
        ? [
            {
                label: 'Overview',
                items: [
                    { id: 0, icon: <LayoutDashboard size={17} />, label: 'Dashboard', path: '/dashboard' },
                ],
            },
            {
                label: 'Care',
                items: [
                    { id: 10, icon: <HeartHandshake size={17} />, label: 'Residents', path: '/residents' },
                ],
            },
            {
                label: 'Kitchen',
                items: [
                    { id: 8, icon: <ChefHat size={17} />, label: 'Menu & Plan', path: '/kitchen' },
                    { id: 11, icon: <ClipboardList size={17} />, label: 'Today\'s Prep', path: '/kitchen/prep' },
                    { id: 12, icon: <Printer size={17} />, label: 'Tray Tickets', path: '/kitchen/tray-tickets' },
                ],
            },
            {
                label: 'Supply',
                items: [
                    { id: 1, icon: <Boxes size={17} />, label: 'Inventory', path: '/products' },
                    { id: 3, icon: <Receipt size={17} />, label: 'Invoices', path: '/invoices' },
                    { id: 5, icon: <Truck size={17} />, label: 'Vendors', path: '/vendors' },
                ],
            },
            {
                label: 'Team',
                items: [
                    { id: 6, icon: <UserCheck size={17} />, label: 'Staff', path: '/staff' },
                ],
            },
        ]
        : [
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
        <svg viewBox="0 0 40 40" style={{ width: size, height: size }} className="flex-shrink-0">
            <defs>
                <linearGradient id="layoutCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1E3A5F" />
                    <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
            </defs>
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
                                            ? (isRetirement ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700')
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
                                            ? (isRetirement
                                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                                : 'bg-indigo-50 text-indigo-700 font-semibold')
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
