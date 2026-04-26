import { useState, useEffect } from 'react';
import { UserCheck, Plus, X, Clock, AlertTriangle, TrendingUp, CheckCircle, ChevronDown, ChevronUp, Edit, Trash2, Flag, ShieldAlert, Phone, Mail } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';

interface StaffMember { id: string; name: string; role: string; phone?: string; email?: string; hireDate?: string; isActive: boolean; shifts: any[]; }
interface Shift { id: string; staffId: string; startTime: string; endTime?: string; salesTotal?: number; notes?: string; staff: { id: string; name: string; role: string }; flags: StaffFlag[]; }
interface StaffFlag { id: string; type: string; severity: string; title: string; description: string; value?: number; isResolved: boolean; createdAt: string; shift?: { staff?: { name: string } }; }
interface Performance { id: string; name: string; role: string; totalShifts: number; totalHours: number; totalSales: number; avgSalesPerShift: number; salesPerHour: number; openFlags: number; }

type Tab = 'team' | 'shifts' | 'flags' | 'performance';

export default function Staff() {
    const [tab, setTab] = useState<Tab>('team');
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [flags, setFlags] = useState<StaffFlag[]>([]);
    const [performance, setPerformance] = useState<Performance[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showAddShift, setShowAddShift] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [expandedShift, setExpandedShift] = useState<string | null>(null);

    const [staffForm, setStaffForm] = useState({ name: '', role: 'CASHIER', phone: '', email: '', hireDate: '' });
    const [shiftForm, setShiftForm] = useState({ staffId: '', startTime: '', endTime: '', notes: '' });
    const [flagForm, setFlagForm] = useState({ staffId: '', title: '', description: '', severity: 'warning' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token') || '';

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [s, sh, f, p] = await Promise.all([
                api.get('/staff', token),
                api.get('/staff/shifts?limit=30', token),
                api.get('/staff/flags', token),
                api.get('/staff/performance', token)
            ]);
            setStaffList(s);
            setShifts(sh);
            setFlags(f);
            setPerformance(p);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const saveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            if (editingStaff) {
                await api.put(`/staff/${editingStaff.id}`, staffForm, token);
            } else {
                await api.post('/staff', staffForm, token);
            }
            setShowAddStaff(false); setEditingStaff(null);
            setStaffForm({ name: '', role: 'CASHIER', phone: '', email: '', hireDate: '' });
            await loadAll();
        } catch (e: any) { setError(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const deleteStaff = async (id: string) => {
        if (!confirm('Remove this staff member?')) return;
        await api.delete(`/staff/${id}`, token);
        await loadAll();
    };

    const saveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            await api.post('/staff/shifts', shiftForm, token);
            setShowAddShift(false);
            setShiftForm({ staffId: '', startTime: '', endTime: '', notes: '' });
            await loadAll();
        } catch (e: any) { setError(e.message || 'Failed to save shift'); }
        setSaving(false);
    };

    const saveFlag = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            await api.post('/staff/flags', flagForm, token);
            setShowFlagModal(false);
            setFlagForm({ staffId: '', title: '', description: '', severity: 'warning' });
            await loadAll();
        } catch (e: any) { setError(e.message || 'Failed to save flag'); }
        setSaving(false);
    };

    const resolveFlag = async (id: string) => {
        await api.patch(`/staff/flags/${id}/resolve`, { resolvedNote: 'Resolved by owner' }, token);
        await loadAll();
    };

    const runShrinkageCheck = async () => {
        try {
            const res = await api.post('/staff/shrinkage-check', {}, token);
            alert(`Shrinkage check complete. ${res.flagged?.length || 0} issue(s) flagged.`);
            await loadAll();
        } catch (e) { alert('Shrinkage check failed'); }
    };

    const severityColor = (s: string) => s === 'critical' ? 'text-red-600 bg-red-50 border-red-200' : s === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-blue-600 bg-blue-50 border-blue-200';
    const roleColor = (r: string) => r === 'MANAGER' ? 'bg-purple-100 text-purple-700' : r === 'SUPERVISOR' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';

    const openEditStaff = (member: StaffMember) => {
        setEditingStaff(member);
        setStaffForm({ name: member.name, role: member.role, phone: member.phone || '', email: member.email || '', hireDate: member.hireDate ? member.hireDate.split('T')[0] : '' });
        setShowAddStaff(true);
    };

    const criticalFlags = flags.filter(f => f.severity === 'critical').length;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <UserCheck size={24} className="text-blue-600" />
                            Staff Management
                        </h1>
                        <p className="text-gray-500 mt-1">Track your team, log shifts, and monitor performance flags</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={runShrinkageCheck} className="flex items-center gap-2 px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-sm hover:bg-amber-100 transition-colors">
                            <ShieldAlert size={15} /> Shrinkage Check
                        </button>
                        <button onClick={() => { setShowFlagModal(true); setError(''); }} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            <Flag size={15} /> Add Flag
                        </button>
                        <button onClick={() => setShowAddShift(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            <Clock size={15} /> Log Shift
                        </button>
                        <button onClick={() => { setShowAddStaff(true); setEditingStaff(null); setStaffForm({ name: '', role: 'CASHIER', phone: '', email: '', hireDate: '' }); setError(''); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            <Plus size={15} /> Add Staff
                        </button>
                    </div>
                </div>

                {/* Alert banner */}
                {criticalFlags > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
                        <p className="text-red-700 font-medium">{criticalFlags} critical flag{criticalFlags > 1 ? 's' : ''} need your attention</p>
                        <button onClick={() => setTab('flags')} className="ml-auto text-sm text-red-600 underline">View flags</button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {(['team', 'shifts', 'flags', 'performance'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                            {t}
                            {t === 'flags' && flags.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{flags.length}</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* TEAM TAB */}
                        {tab === 'team' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {staffList.length === 0 ? (
                                    <div className="col-span-3 text-center py-16 text-gray-400">
                                        <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                                        <p>No staff added yet. Add your first team member.</p>
                                    </div>
                                ) : staffList.map(member => (
                                    <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {member.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{member.name}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(member.role)}`}>{member.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openEditStaff(member)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit size={14} /></button>
                                                <button onClick={() => deleteStaff(member.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        {member.phone && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{member.phone}</p>}
                                        {member.email && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{member.email}</p>}
                                        <p className="text-xs text-gray-400 mt-2">{member.shifts.length} recent shift{member.shifts.length !== 1 ? 's' : ''}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SHIFTS TAB */}
                        {tab === 'shifts' && (
                            <div className="space-y-3">
                                {shifts.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <Clock size={40} className="mx-auto mb-3 opacity-30" />
                                        <p>No shifts logged yet.</p>
                                    </div>
                                ) : shifts.map(shift => (
                                    <div key={shift.id} className="bg-white rounded-xl border border-gray-200">
                                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                                                    {shift.staff?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{shift.staff?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(shift.startTime).toLocaleString()} {shift.endTime ? `→ ${new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '(ongoing)'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {shift.salesTotal !== undefined && shift.salesTotal !== null && (
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900">${shift.salesTotal.toFixed(2)}</p>
                                                        <p className="text-xs text-gray-500">sales</p>
                                                    </div>
                                                )}
                                                {shift.flags.length > 0 && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full">
                                                        <AlertTriangle size={11} /> {shift.flags.length}
                                                    </span>
                                                )}
                                                {expandedShift === shift.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                            </div>
                                        </div>
                                        {expandedShift === shift.id && (
                                            <div className="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl space-y-2">
                                                {shift.notes && <p className="text-sm text-gray-600">Notes: {shift.notes}</p>}
                                                {shift.flags.length > 0 ? shift.flags.map(f => (
                                                    <div key={f.id} className={`p-3 rounded-lg border text-sm ${severityColor(f.severity)}`}>
                                                        <p className="font-medium">{f.title}</p>
                                                        <p className="mt-0.5 opacity-80">{f.description}</p>
                                                    </div>
                                                )) : <p className="text-sm text-gray-400">No flags on this shift.</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* FLAGS TAB */}
                        {tab === 'flags' && (
                            <div className="space-y-3">
                                {flags.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <CheckCircle size={40} className="mx-auto mb-3 opacity-30 text-green-500" />
                                        <p className="text-green-600 font-medium">No open flags — all clear!</p>
                                    </div>
                                ) : flags.map(flag => (
                                    <div key={flag.id} className={`p-4 rounded-xl border ${severityColor(flag.severity)}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold">{flag.title}</p>
                                                    <p className="text-sm mt-0.5 opacity-80">{flag.description}</p>
                                                    <p className="text-xs mt-1 opacity-60">{new Date(flag.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => resolveFlag(flag.id)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-white border border-current rounded-lg text-xs font-medium hover:opacity-80 transition-opacity">
                                                <CheckCircle size={13} /> Resolve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PERFORMANCE TAB */}
                        {tab === 'performance' && (
                            <div className="space-y-4">
                                {performance.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                                        <p>Log shifts to see performance data.</p>
                                    </div>
                                ) : performance.map((p, i) => (
                                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">{i + 1}</span>
                                            <div>
                                                <p className="font-semibold text-gray-900">{p.name}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor(p.role)}`}>{p.role}</span>
                                            </div>
                                            {p.openFlags > 0 && (
                                                <span className="ml-auto flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full">
                                                    <AlertTriangle size={11} /> {p.openFlags} flag{p.openFlags > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Shifts (30d)', value: p.totalShifts },
                                                { label: 'Hours Worked', value: `${p.totalHours}h` },
                                                { label: 'Total Sales', value: `$${p.totalSales.toLocaleString()}` },
                                                { label: 'Sales/Hour', value: `$${p.salesPerHour.toFixed(2)}` }
                                            ].map(m => (
                                                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 mb-0.5">{m.label}</p>
                                                    <p className="font-bold text-gray-900">{m.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ADD/EDIT STAFF MODAL */}
                {showAddStaff && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
                                <button onClick={() => { setShowAddStaff(false); setEditingStaff(null); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                            </div>
                            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                            <form onSubmit={saveStaff} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input required value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900">
                                        <option value="CASHIER">Cashier</option>
                                        <option value="SUPERVISOR">Supervisor</option>
                                        <option value="MANAGER">Manager</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="optional" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                                        <input type="date" value={staffForm.hireDate} onChange={e => setStaffForm({ ...staffForm, hireDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="optional" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => { setShowAddStaff(false); setEditingStaff(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* LOG SHIFT MODAL */}
                {showAddShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">Log Shift</h2>
                                <button onClick={() => setShowAddShift(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                            </div>
                            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                            <form onSubmit={saveShift} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                                    <select required value={shiftForm.staffId} onChange={e => setShiftForm({ ...shiftForm, staffId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900">
                                        <option value="">Select staff...</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                        <input type="datetime-local" required value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <input type="datetime-local" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <input value={shiftForm.notes} onChange={e => setShiftForm({ ...shiftForm, notes: e.target.value })} placeholder="optional" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <p className="text-xs text-gray-400">Sales during this time window will be auto-calculated and performance flags run automatically.</p>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShowAddShift(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Log Shift'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MANUAL FLAG MODAL */}
                {showFlagModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">Add Manual Flag</h2>
                                <button onClick={() => setShowFlagModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                            </div>
                            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                            <form onSubmit={saveFlag} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member (optional)</label>
                                    <select value={flagForm.staffId} onChange={e => setFlagForm({ ...flagForm, staffId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900">
                                        <option value="">General / Store-wide</option>
                                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                                    <select value={flagForm.severity} onChange={e => setFlagForm({ ...flagForm, severity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900">
                                        <option value="info">Info</option>
                                        <option value="warning">Warning</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input required value={flagForm.title} onChange={e => setFlagForm({ ...flagForm, title: e.target.value })} placeholder="e.g. Register short by $20" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea value={flagForm.description} onChange={e => setFlagForm({ ...flagForm, description: e.target.value })} rows={3} placeholder="What happened?" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none" />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setShowFlagModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Add Flag'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
