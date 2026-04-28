// Residents page — roster + dietary profile + care plan, all in one inline editor.

import { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    X,
    Search,
    AlertTriangle,
    Utensils,
    Activity,
    User,
    Archive,
    Edit,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import WarmthIllustration from '@/components/WarmthIllustration';
import { retirementApi, type Resident, type DietaryProfile, type CarePlan } from '@/lib/retirementApi';

const TEXTURES = [
    { value: 'regular', label: 'Regular' },
    { value: 'mechanical_soft', label: 'Mechanical Soft' },
    { value: 'pureed', label: 'Pureed' },
    { value: 'thickened_liquids', label: 'Thickened Liquids' },
];
const INCONTINENCE = [
    { value: 'none', label: 'None' },
    { value: 'nighttime_only', label: 'Nighttime only' },
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'full', label: 'Full' },
];
const MOBILITY = [
    { value: 'independent', label: 'Independent' },
    { value: 'walker', label: 'Walker' },
    { value: 'wheelchair', label: 'Wheelchair' },
    { value: 'bedbound', label: 'Bedbound' },
];
const ISOLATION = [
    { value: 'none', label: 'None' },
    { value: 'contact', label: 'Contact' },
    { value: 'droplet', label: 'Droplet' },
    { value: 'airborne', label: 'Airborne' },
];

export default function Residents() {
    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Partial<Resident> | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    async function refresh() {
        setLoading(true);
        try {
            const r = await retirementApi.listResidents();
            setResidents(r.residents);
        } catch (e: any) {
            showToast(e.message || 'Failed to load');
        } finally { setLoading(false); }
    }
    useEffect(() => { refresh(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return residents;
        return residents.filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.room ?? '').toLowerCase().includes(q) ||
            (r.dietaryProfile?.allergens ?? '').toLowerCase().includes(q)
        );
    }, [residents, search]);

    async function save() {
        if (!editing || !editing.name) { showToast('Name required'); return; }
        try {
            if (editing.id) {
                await retirementApi.updateResident(editing.id, editing);
            } else {
                await retirementApi.createResident(editing);
            }
            setEditing(null);
            await refresh();
            showToast('Saved');
        } catch (e: any) { showToast(e.message || 'Save failed'); }
    }

    async function archive(id: string) {
        if (!confirm('Archive this resident? Their meal history will be preserved.')) return;
        await retirementApi.archiveResident(id);
        await refresh();
        showToast('Archived');
    }

    function startNew() {
        setEditing({
            name: '', room: '',
            dietaryProfile: { texture: 'regular' },
            carePlan: { incontinenceLevel: 'none', mobility: 'independent', isolationPrecautions: 'none' },
        });
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* Header — with a small warmth vignette on the right */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Care</p>
                            <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tightest mt-1.5 leading-tight">Residents</h1>
                            <p className="text-[13.5px] text-ink-600 mt-1.5 max-w-2xl">
                                Single source of truth for every resident's room, dietary needs, and care plan. Drives meal planning, tray tickets, and supply forecasting.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block">
                                <WarmthIllustration size="md" />
                            </div>
                            <button
                                onClick={startNew}
                                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> New resident
                            </button>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Metric label="Active residents" value={String(residents.length)} sublabel="in roster" />
                        <Metric label="Diabetic" value={String(residents.filter(r => r.dietaryProfile?.diabetic).length)} sublabel="dietary tracking" />
                        <Metric label="Texture-modified" value={String(residents.filter(r => r.dietaryProfile?.texture && r.dietaryProfile.texture !== 'regular').length)} sublabel="soft / pureed / thickened" />
                        <Metric label="Allergens on file" value={String(residents.filter(r => r.dietaryProfile?.allergens).length)} sublabel="watch list" tone={residents.filter(r => r.dietaryProfile?.allergens).length > 0 ? 'amber' : 'default'} />
                    </div>

                    {/* Search */}
                    <div className="bg-white border border-ink-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-ink-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, room, or allergen"
                            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-ink-500"
                        />
                        {search && <button onClick={() => setSearch('')} className="text-ink-400 hover:text-ink-700"><X className="w-3.5 h-3.5" /></button>}
                    </div>

                    {/* Resident list */}
                    {loading ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">Loading…</div>
                    ) : residents.length === 0 ? (
                        <div className="bg-white border border-emerald-100 rounded-2xl p-12 text-center">
                            <div className="flex justify-center mb-4">
                                <WarmthIllustration size="lg" scenic />
                            </div>
                            <p className="font-display text-[16px] font-semibold text-ink-900 tracking-tight">A quiet morning, ready for your first resident</p>
                            <p className="text-[12.5px] text-ink-500 mt-1.5 max-w-md mx-auto">Add their name, room, dietary needs, and care plan — and we will take care of meal planning and supply ordering from there.</p>
                            <button onClick={startNew} className="mt-5 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
                                <Plus className="w-3.5 h-3.5" /> Welcome a resident
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">No matches for "{search}".</div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filtered.map(r => <ResidentCard key={r.id} resident={r} onEdit={() => setEditing(r)} onArchive={() => archive(r.id)} />)}
                        </div>
                    )}
                </div>

                {editing && (
                    <ResidentEditor
                        editing={editing}
                        setEditing={setEditing}
                        onSave={save}
                        onCancel={() => setEditing(null)}
                    />
                )}
                {toast && (
                    <div className="fixed bottom-6 right-6 bg-ink-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium z-50 animate-fade-in">
                        {toast}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function Metric({ label, value, sublabel, tone = 'default' }: { label: string; value: string; sublabel?: string; tone?: 'default' | 'amber' | 'red' }) {
    const cls = tone === 'red' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-ink-900';
    return (
        <div className="bg-white border border-ink-200 rounded-2xl px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">{label}</p>
            <p className={`font-display text-[28px] font-semibold tabular-nums tracking-tightest leading-none mt-2 ${cls}`}>{value}</p>
            {sublabel && <p className="text-[11.5px] text-ink-500 mt-1.5">{sublabel}</p>}
        </div>
    );
}

function ResidentCard({ resident, onEdit, onArchive }: { resident: Resident; onEdit: () => void; onArchive: () => void }) {
    const dp = resident.dietaryProfile;
    const cp = resident.carePlan;
    const flags: { label: string; tone: string }[] = [];
    if (dp?.diabetic) flags.push({ label: 'Diabetic', tone: 'bg-amber-50 text-amber-700 border-amber-200' });
    if (dp?.lowSodium) flags.push({ label: 'Low Na', tone: 'bg-blue-50 text-blue-700 border-blue-200' });
    if (dp?.renal) flags.push({ label: 'Renal', tone: 'bg-rose-50 text-rose-700 border-rose-200' });
    if (dp?.cardiac) flags.push({ label: 'Cardiac', tone: 'bg-rose-50 text-rose-700 border-rose-200' });
    if (dp?.glutenFree) flags.push({ label: 'GF', tone: 'bg-violet-50 text-violet-700 border-violet-200' });
    if (dp?.vegetarian) flags.push({ label: 'Veg', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
    if (dp?.texture && dp.texture !== 'regular') flags.push({ label: dp.texture.replace('_', ' '), tone: 'bg-indigo-50 text-indigo-700 border-indigo-200' });

    return (
        <div className="bg-white border border-ink-200 rounded-2xl p-4 hover:border-ink-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="font-display text-[14.5px] font-semibold text-ink-900 tracking-tight truncate">{resident.name}</div>
                        <div className="text-[11.5px] text-ink-500 tabular-nums">{resident.room ? `Room ${resident.room}` : 'No room assigned'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={onEdit} className="w-7 h-7 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center" aria-label="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={onArchive} className="w-7 h-7 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center" aria-label="Archive"><Archive className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                    {flags.map(f => (
                        <span key={f.label} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${f.tone}`}>{f.label}</span>
                    ))}
                </div>
            )}

            {dp?.allergens && (
                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-rose-700 bg-rose-50/60 border border-rose-100 rounded-lg px-2 py-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><strong className="font-semibold">Allergens:</strong> {dp.allergens}</span>
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-2 gap-2 text-[11.5px]">
                <div>
                    <span className="text-ink-400 flex items-center gap-1"><Utensils className="w-3 h-3" /> Texture</span>
                    <div className="text-ink-700 font-medium mt-0.5 capitalize">{dp?.texture?.replace('_', ' ') ?? 'regular'}</div>
                </div>
                <div>
                    <span className="text-ink-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Care</span>
                    <div className="text-ink-700 font-medium mt-0.5 capitalize">
                        {cp?.incontinenceLevel === 'none' ? 'Independent' : cp?.incontinenceLevel?.replace('_', ' ') ?? '—'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResidentEditor({ editing, setEditing, onSave, onCancel }: {
    editing: Partial<Resident>;
    setEditing: (r: Partial<Resident>) => void;
    onSave: () => void;
    onCancel: () => void;
}) {
    const dp: DietaryProfile = editing.dietaryProfile ?? {};
    const cp: CarePlan = editing.carePlan ?? {};

    function patchDp(p: Partial<DietaryProfile>) {
        setEditing({ ...editing, dietaryProfile: { ...dp, ...p } as DietaryProfile });
    }
    function patchCp(p: Partial<CarePlan>) {
        setEditing({ ...editing, carePlan: { ...cp, ...p } as CarePlan });
    }

    return (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="font-display text-[16px] font-semibold text-ink-900 tracking-tight">{editing.id ? 'Edit resident' : 'New resident'}</h3>
                    <button onClick={onCancel} className="text-ink-500 hover:text-ink-900"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Identity */}
                    <Section title="Identity">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2"><Field label="Full name"><Input value={editing.name || ''} onChange={v => setEditing({ ...editing, name: v })} /></Field></div>
                            <Field label="Room"><Input value={editing.room || ''} onChange={v => setEditing({ ...editing, room: v })} /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Admission date"><Input type="date" value={(editing.admissionDate ?? '').toString().slice(0, 10)} onChange={v => setEditing({ ...editing, admissionDate: v || null })} /></Field>
                        </div>
                        <Field label="Notes"><Input value={editing.notes || ''} onChange={v => setEditing({ ...editing, notes: v })} /></Field>
                    </Section>

                    {/* Dietary */}
                    <Section title="Dietary profile">
                        <div className="flex flex-wrap gap-2">
                            <Toggle label="Diabetic" checked={!!dp.diabetic} onChange={v => patchDp({ diabetic: v })} />
                            <Toggle label="Low sodium" checked={!!dp.lowSodium} onChange={v => patchDp({ lowSodium: v })} />
                            <Toggle label="Renal" checked={!!dp.renal} onChange={v => patchDp({ renal: v })} />
                            <Toggle label="Cardiac" checked={!!dp.cardiac} onChange={v => patchDp({ cardiac: v })} />
                            <Toggle label="Gluten-free" checked={!!dp.glutenFree} onChange={v => patchDp({ glutenFree: v })} />
                            <Toggle label="Vegetarian" checked={!!dp.vegetarian} onChange={v => patchDp({ vegetarian: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Texture"><Select value={dp.texture || 'regular'} options={TEXTURES} onChange={v => patchDp({ texture: v as any })} /></Field>
                            <Field label="Allergens (comma separated)"><Input value={dp.allergens || ''} onChange={v => patchDp({ allergens: v })} placeholder="peanuts, shellfish" /></Field>
                        </div>
                        <Field label="Dislikes / preferences"><Input value={dp.dislikes || ''} onChange={v => patchDp({ dislikes: v })} placeholder="No onions; tea with one sugar" /></Field>
                    </Section>

                    {/* Care plan */}
                    <Section title="Care plan">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Incontinence"><Select value={cp.incontinenceLevel || 'none'} options={INCONTINENCE} onChange={v => patchCp({ incontinenceLevel: v as any })} /></Field>
                            <Field label="Mobility"><Select value={cp.mobility || 'independent'} options={MOBILITY} onChange={v => patchCp({ mobility: v as any })} /></Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Isolation"><Select value={cp.isolationPrecautions || 'none'} options={ISOLATION} onChange={v => patchCp({ isolationPrecautions: v as any })} /></Field>
                            <Field label="Brief changes / day"><Input type="number" value={String(cp.briefChangesPerDay ?? 0)} onChange={v => patchCp({ briefChangesPerDay: parseInt(v) || 0 })} /></Field>
                            <Field label="Fluid goal (ml)"><Input type="number" value={cp.fluidGoalMl != null ? String(cp.fluidGoalMl) : ''} onChange={v => patchCp({ fluidGoalMl: v ? parseInt(v) : null })} /></Field>
                        </div>
                        <Field label="Care notes"><Input value={cp.notes || ''} onChange={v => patchCp({ notes: v })} /></Field>
                    </Section>
                </div>

                <div className="px-6 py-4 border-t border-ink-100 flex justify-end gap-2 sticky bottom-0 bg-white">
                    <button onClick={onCancel} className="text-[12.5px] font-medium text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-100">Cancel</button>
                    <button onClick={onSave} className="text-[12.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg">Save resident</button>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">{title}</h4>
            <div className="space-y-3">{children}</div>
        </div>
    );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11.5px] font-medium text-ink-700 mb-1">{label}</label>
            {children}
        </div>
    );
}
function Input({ value, onChange, type = 'text', placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300" />
    );
}
function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300">
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button onClick={() => onChange(!checked)} className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${checked ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300'}`}>
            {label}
        </button>
    );
}
