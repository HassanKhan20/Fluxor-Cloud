// Onboarding modal — runs once per store. Asks the user what kind of facility
// they're operating, then sets `facilityType` server-side and unlocks the
// matching app surface (sidebar, dashboards, etc).

import { useEffect, useState, createContext, useContext } from 'react';
import { Building2, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
import { retirementApi, type FacilityType, type FacilityConfig } from '@/lib/retirementApi';

interface FacilityCtx {
    facility: FacilityConfig | null;
    refresh: () => Promise<void>;
    isRetirement: boolean;
    isStore: boolean;
}
const Ctx = createContext<FacilityCtx>({ facility: null, refresh: async () => {}, isRetirement: false, isStore: true });
export const useFacility = () => useContext(Ctx);

export function FacilityProvider({ children }: { children: React.ReactNode }) {
    const [facility, setFacility] = useState<FacilityConfig | null>(null);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        try {
            const f = await retirementApi.getFacility();
            setFacility(f);
        } catch {
            setFacility(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // Only fetch facility config when we have an auth token; otherwise skip
        // (login / signup pages don't need this).
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        refresh();
    }, []);

    const value: FacilityCtx = {
        facility,
        refresh,
        isRetirement: facility?.facilityType === 'RETIREMENT_HOME',
        isStore: !facility || facility.facilityType === 'CONVENIENCE_STORE',
    };

    return (
        <Ctx.Provider value={value}>
            {children}
            {!loading && facility && !facility.facilityTypeSet && <FacilityTypeModal onChosen={refresh} />}
        </Ctx.Provider>
    );
}

function FacilityTypeModal({ onChosen }: { onChosen: () => Promise<void> }) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function pick(type: FacilityType) {
        setBusy(true); setErr(null);
        try {
            await retirementApi.setFacility(type);
            await onChosen();
        } catch (e: any) {
            setErr(e.message || 'Failed to save');
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-ink-950/60 backdrop-blur-md flex items-center justify-center p-6 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-7 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
                    <div className="relative">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">Welcome to Fluxor</p>
                        <h2 className="font-display text-[28px] font-semibold tracking-tightest mt-1.5 leading-[1.1]">What kind of facility are you running?</h2>
                        <p className="text-white/80 text-[13.5px] mt-2 max-w-xl">
                            We'll tailor the entire app — sidebar, dashboards, automations — to match. You can change this later from Settings.
                        </p>
                    </div>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-3">
                    <button
                        onClick={() => pick('CONVENIENCE_STORE')}
                        disabled={busy}
                        className="text-left rounded-2xl border-2 border-ink-200 hover:border-indigo-500 hover:bg-indigo-50/40 p-5 transition-all group disabled:opacity-60"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 className="w-5 h-5" />
                            </span>
                            <span className="font-display text-[18px] font-semibold text-ink-900 tracking-tight">Convenience Store</span>
                        </div>
                        <p className="text-[12.5px] text-ink-600 leading-relaxed">
                            Retail operation that sells products to customers. POS-driven. Tracks sales, vendors, inventory turnover.
                        </p>
                        <ul className="mt-3 space-y-1 text-[11.5px] text-ink-500">
                            <li>· Sales import + POS connectors</li>
                            <li>· Vendor intelligence + reorder center</li>
                            <li>· Daily revenue + transaction analytics</li>
                            <li>· Inventory turnover + low-stock alerts</li>
                        </ul>
                        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
                            Choose this <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </button>

                    <button
                        onClick={() => pick('RETIREMENT_HOME')}
                        disabled={busy}
                        className="text-left rounded-2xl border-2 border-ink-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-5 transition-all group disabled:opacity-60"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <HeartHandshake className="w-5 h-5" />
                            </span>
                            <span className="font-display text-[18px] font-semibold text-ink-900 tracking-tight">Retirement Home</span>
                        </div>
                        <p className="text-[12.5px] text-ink-600 leading-relaxed">
                            Senior living, assisted living, or skilled nursing. Flat-fee residents. Set menus. Predictable consumption.
                        </p>
                        <ul className="mt-3 space-y-1 text-[11.5px] text-ink-500">
                            <li>· Resident roster + dietary profiles</li>
                            <li>· Menu planning + tablet meal logger</li>
                            <li>· Census-driven food forecasting</li>
                            <li>· Auto-emailed weekly vendor POs</li>
                            <li>· Tray tickets + production prep sheet</li>
                            <li>· Care-plan-driven supply reordering</li>
                        </ul>
                        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" /> New
                        </div>
                    </button>
                </div>
                {err && <p className="px-6 pb-4 text-[12px] text-rose-700">{err}</p>}
                <p className="px-6 pb-5 text-[11px] text-ink-400">You can change this any time from Settings → Facility type.</p>
            </div>
        </div>
    );
}
