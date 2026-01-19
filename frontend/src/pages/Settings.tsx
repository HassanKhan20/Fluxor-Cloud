import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bell,
    User,
    Shield,
    CreditCard,
    HelpCircle,
    ChevronRight,
    Save,
    LogOut
} from 'lucide-react';

interface UserInfo {
    name: string;
    email: string;
}

export default function Settings() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState({
        lowStock: true,
        salesSummary: true,
        aiInsights: true,
    });
    const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load user info
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setUserInfo({ name: user.name || '', email: user.email || '' });
            } catch (e) {
                console.error('Failed to parse user info');
            }
        }
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 500));
        localStorage.setItem('user', JSON.stringify(userInfo));
        setSaving(false);
    };

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const settingsSections = [
        {
            title: 'Profile',
            description: 'Manage your personal information',
            icon: <User className="w-5 h-5" />,
            content: (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Display Name
                        </label>
                        <Input
                            value={userInfo.name}
                            onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                            placeholder="Your name"
                            className="max-w-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <Input
                            value={userInfo.email}
                            onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                            placeholder="your@email.com"
                            className="max-w-md"
                            disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            )
        },
        {
            title: 'Notifications',
            description: 'Choose what alerts you receive',
            icon: <Bell className="w-5 h-5" />,
            content: (
                <div className="space-y-3 max-w-md">
                    {[
                        { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Get notified when products run low' },
                        { key: 'salesSummary', label: 'Daily Sales Summary', desc: 'Receive daily sales overview' },
                        { key: 'aiInsights', label: 'AI Insights', desc: 'Get AI-powered recommendations' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">{item.label}</p>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                            <button
                                onClick={() => setNotifications({
                                    ...notifications,
                                    [item.key]: !notifications[item.key as keyof typeof notifications]
                                })}
                                className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            )
        },
        {
            title: 'Security',
            description: 'Password and authentication settings',
            icon: <Shield className="w-5 h-5" />,
            content: (
                <div className="space-y-4 max-w-md">
                    <Button variant="outline" className="w-full justify-between">
                        Change Password
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                        Two-Factor Authentication
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                        Active Sessions
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )
        },
        {
            title: 'Billing',
            description: 'Manage your subscription and payment',
            icon: <CreditCard className="w-5 h-5" />,
            content: (
                <div className="space-y-4 max-w-md">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-blue-700">Free Plan</p>
                                <p className="text-sm text-blue-600">Basic features included</p>
                            </div>
                            <Button size="sm">Upgrade</Button>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full justify-between">
                        Payment Methods
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                        Billing History
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )
        },
        {
            title: 'Help & Support',
            description: 'Get help with Fluxor Cloud',
            icon: <HelpCircle className="w-5 h-5" />,
            content: (
                <div className="space-y-4 max-w-md">
                    <Button variant="outline" className="w-full justify-between">
                        Documentation
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                        Contact Support
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                        Report a Bug
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                            <p className="text-gray-500 mt-1">Manage your account and preferences</p>
                        </div>
                    </div>

                    {/* Settings Sections */}
                    {settingsSections.map((section, index) => (
                        <Card key={index} className="dark:bg-gray-800">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                        {section.icon}
                                    </div>
                                    <div>
                                        <CardTitle className="dark:text-white">{section.title}</CardTitle>
                                        <CardDescription className="dark:text-gray-400">{section.description}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {section.content}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Sign Out */}
                    <Card className="border-red-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                        <LogOut className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Sign Out</p>
                                        <p className="text-sm text-gray-500">Sign out of your account</p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
                                    Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
