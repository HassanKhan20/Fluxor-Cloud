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
    HelpCircle,
    Save,
    LogOut,
    ChevronLeft,
    Lock,
    Mail,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { API_URL } from '@/lib/api';

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
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Change password state
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
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
        setSaveError('');
        setSaveSuccess(false);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: userInfo.name })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to save');
            }
            const data = await res.json();
            const stored = localStorage.getItem('user');
            const parsed = stored ? JSON.parse(stored) : {};
            localStorage.setItem('user', JSON.stringify({ ...parsed, name: data.user.name }));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess(false);

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to change password');
            }
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePassword(false);
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err: any) {
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:text-blue-600"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                            <p className="text-gray-500 mt-1">Manage your account and preferences</p>
                        </div>
                    </div>

                    {/* Profile */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Profile</CardTitle>
                                    <CardDescription>Manage your personal information</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                    <Input
                                        value={userInfo.name}
                                        onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                                        placeholder="Your name"
                                        className="max-w-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <div className="flex items-center gap-2 max-w-md">
                                        <Input value={userInfo.email} disabled className="flex-1" />
                                        <Mail className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                </div>
                                {saveError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{saveError}</p>}
                                {saveSuccess && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Profile saved successfully.</p>}
                                <Button onClick={handleSaveProfile} disabled={saving}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security — Change Password */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Security</CardTitle>
                                    <CardDescription>Password and authentication</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-w-md">
                                {passwordSuccess && (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />Password changed successfully.
                                    </p>
                                )}
                                {!showChangePassword ? (
                                    <Button variant="outline" onClick={() => setShowChangePassword(true)} className="w-full justify-between">
                                        <span className="flex items-center gap-2"><Lock className="w-4 h-4" />Change Password</span>
                                    </Button>
                                ) : (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        </div>
                                        {passwordError && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{passwordError}</p>}
                                        <div className="flex gap-2">
                                            <Button onClick={handleChangePassword} disabled={changingPassword}>
                                                {changingPassword ? 'Changing...' : 'Update Password'}
                                            </Button>
                                            <Button variant="outline" onClick={() => { setShowChangePassword(false); setPasswordError(''); }}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Notifications</CardTitle>
                                    <CardDescription>Choose what alerts you receive</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
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
                                            className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Help */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <HelpCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Help & Support</CardTitle>
                                    <CardDescription>Get help with Fluxor Cloud</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-w-md">
                                <a href="mailto:support@fluxorcloud.com" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="font-medium">Contact Support</span>
                                    <span className="text-sm text-gray-500">support@fluxorcloud.com</span>
                                </a>
                            </div>
                        </CardContent>
                    </Card>

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
