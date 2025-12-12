import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Signup() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        storeName: '',
        storeAddress: '',
        currency: 'USD',
        timezone: 'UTC'
    });
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post('/auth/register', formData);
            localStorage.setItem('token', data.token);
            navigate('/dashboard');
        } catch (err: any) {
            alert(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleChange = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-[450px]">
                <CardHeader>
                    <CardTitle className="text-center font-bold text-xl">
                        {step === 1 ? 'Create Account' : 'Setup Your Store'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {step === 1 ? 'Step 1 of 2: Admin Details' : 'Step 2 of 2: Store Preferences'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={step === 1 ? nextStep : handleSignup} className="space-y-4">

                        {step === 1 && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" value={formData.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)} required placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('email', e.target.value)} required placeholder="store@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" value={formData.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('password', e.target.value)} required placeholder="••••••••" minLength={6} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <div className="p-2 border rounded bg-muted text-sm text-muted-foreground">
                                        Owner (Administrator)
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="storeName">Store Name</Label>
                                    <Input id="storeName" value={formData.storeName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('storeName', e.target.value)} required placeholder="My Awesome Mart" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="storeAddress">Store Address</Label>
                                    <Input id="storeAddress" value={formData.storeAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('storeAddress', e.target.value)} placeholder="123 Main St, City" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Currency</Label>
                                        <Select onValueChange={(val: string) => handleChange('currency', val)} defaultValue={formData.currency}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                                <SelectItem value="CAD">CAD ($)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Timezone</Label>
                                        <Select onValueChange={(val: string) => handleChange('timezone', val)} defaultValue={formData.timezone}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Timezone" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UTC">UTC</SelectItem>
                                                <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                                                <SelectItem value="America/Chicago">Central (US)</SelectItem>
                                                <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between gap-4 mt-6">
                            {step === 2 && (
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">Back</Button>
                            )}
                            <Button type="submit" className={step === 1 ? "w-full" : "w-2/3"} disabled={loading}>
                                {step === 1 ? 'Next: Store Setup' : (loading ? 'Creating...' : 'Launch Fluxor')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    {step === 1 && (
                        <p className="text-sm text-muted-foreground">
                            Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
                        </p>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
