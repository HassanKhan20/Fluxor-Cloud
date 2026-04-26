import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ChefHat,
    Calendar,
    Truck,
    Receipt,
    Plus,
    Sparkles,
    Send,
    Check,
    X,
    Trash2,
    Mail,
    AlertCircle,
    BarChart3,
    Clipboard,
    Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { kitchenApi, type MenuItem, type MealPlan, type Vendor, type PurchaseOrder, type ForecastResult } from '@/lib/kitchenApi';
import { api } from '@/lib/api';

type Tab = 'overview' | 'menu' | 'plan' | 'orders' | 'vendors';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeek(d: Date): Date {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - x.getUTCDay());
    return x;
}
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function fmtMoney(n: number) { return `$${n.toFixed(2)}`; }
function statusTone(status: string): 'green' | 'amber' | 'red' | 'indigo' | 'gray' {
    if (status === 'SENT' || status === 'RECEIVED') return 'green';
    if (status === 'DRAFT' || status === 'PENDING_REVIEW') return 'amber';
    if (status === 'FAILED' || status === 'CANCELLED') return 'red';
    if (status === 'APPROVED') return 'indigo';
    return 'gray';
}
const toneClasses = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gray: 'bg-ink-100 text-ink-700 border-ink-200',
};

export default function Kitchen() {
    const [tab, setTab] = useState<Tab>('overview');
    const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [plans, setPlans] = useState<MealPlan[]>([]);
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [forecast, setForecast] = useState<ForecastResult | null>(null);
    const [products, setProducts] = useState<Array<{ id: string; name: string; unit?: string | null; costPrice?: number }>>([]);
    const [config, setConfig] = useState<{ kitchenMode: boolean; weeklyOrderDay: number; servingsBuffer: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    async function refresh() {
        setLoading(true);
        try {
            const [m, v, p, o, f, pr, cfg] = await Promise.all([
                kitchenApi.listMenuItems().catch(() => ({ menuItems: [] })),
                kitchenApi.listVendors().catch(() => ({ vendors: [] })),
                kitchenApi.listMealPlans(ymd(weekStart)).catch(() => ({ plans: [], weekStart: '', weekEnd: '' })),
                kitchenApi.listPurchaseOrders().catch(() => ({ purchaseOrders: [] })),
                kitchenApi.previewForecast(ymd(weekStart)).catch(() => null),
                api.get('/products?limit=500', localStorage.getItem('token') || '').catch(() => ({ products: [] })),
                kitchenApi.getConfig().catch(() => null),
            ]);
            setMenuItems(m.menuItems || []);
            setVendors(v.vendors || []);
            setPlans(p.plans || []);
            setPos(o.purchaseOrders || []);
            setForecast(f);
            setProducts((pr.products || pr || []).map((x: any) => ({ id: x.id, name: x.name, unit: x.unit, costPrice: x.costPrice })));
            setConfig(cfg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, [weekStart]);

    async function enableKitchen(loadStarterPack: boolean) {
        setBusy(true);
        try {
            const r = await kitchenApi.enableKitchen({ loadStarterPack });
            showToast(loadStarterPack
                ? `Kitchen enabled · ${r.starterPack?.menuItemsCreated ?? 0} dishes, ${r.starterPack?.productsCreated ?? 0} ingredients seeded`
                : 'Kitchen enabled');
            await refresh();
        } catch (e: any) { showToast(e.message || 'Failed to enable'); }
        finally { setBusy(false); }
    }

    async function loadPack() {
        setBusy(true);
        try {
            const r = await kitchenApi.loadStarterPack();
            showToast(`Loaded · ${r.result.menuItemsCreated} new dishes, ${r.result.productsCreated} new ingredients`);
            await refresh();
        } catch (e: any) { showToast(e.message || 'Failed to load'); }
        finally { setBusy(false); }
    }

    // Show the onboarding banner whenever the catalog looks empty OR kitchen
    // mode is explicitly off. Robust to a missing /config response.
    const isEmpty = menuItems.length === 0 && vendors.length === 0;
    const kitchenOff = config?.kitchenMode === false;
    const needsOnboarding = !loading && (isEmpty || kitchenOff);

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-ink-100/60 font-sans">
                <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">Kitchen</p>
                            <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tightest mt-1.5 leading-tight">Recipes, plans &amp; weekly orders</h1>
                            <p className="text-[13.5px] text-ink-600 mt-1.5 max-w-2xl">
                                Define menu items once, plan the week, log meals served. Fluxor turns recipes × meal plans into draft purchase orders and emails them to your vendors automatically.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={loadPack}
                                disabled={busy}
                                className="flex items-center gap-1.5 text-[12.5px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                            >
                                <Zap className="w-3.5 h-3.5" /> Load starter pack
                            </button>
                            <Link
                                to="/kitchen/log"
                                className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-700 bg-white border border-ink-200 hover:border-ink-300 px-3 py-2 rounded-lg transition-colors"
                            >
                                <Clipboard className="w-3.5 h-3.5" /> Tablet logger
                            </Link>
                            <button
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        const r = await kitchenApi.generateDrafts(ymd(weekStart));
                                        showToast(`Generated ${r.created} draft order${r.created === 1 ? '' : 's'}`);
                                        await refresh();
                                    } catch (e: any) {
                                        showToast(e.message || 'Failed to generate');
                                    } finally { setBusy(false); }
                                }}
                                disabled={busy}
                                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg transition-colors disabled:opacity-60"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Run weekly forecast
                            </button>
                        </div>
                    </div>

                    {/* Onboarding banner */}
                    {needsOnboarding && (
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-7 text-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.5)] relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
                            <div className="relative max-w-3xl">
                                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-200">Get started in 30 seconds</p>
                                <h2 className="font-display text-[26px] font-semibold tracking-tightest mt-1.5 leading-[1.1]">
                                    {config?.kitchenMode ? 'Load a starter pack so you can start cooking — literally.' : 'Turn on Kitchen mode to automate weekly ordering.'}
                                </h2>
                                <p className="text-white/80 text-[13.5px] mt-2 max-w-xl">
                                    {config?.kitchenMode
                                        ? 'Seeds 4 vendors, 27 common ingredients with par levels and case sizes, and 10 retirement-home menu items with full recipes. Idempotent — safe to re-run.'
                                        : 'Enables recipe forecasting, weekly meal planning, and automated vendor PO emails. We\'ll also seed a starter pack of vendors, ingredients, and menu items so you don\'t start from a blank screen.'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-5">
                                    {config?.kitchenMode ? (
                                        <button
                                            onClick={loadPack}
                                            disabled={busy}
                                            className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-700 bg-white hover:bg-white/90 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Load starter pack
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => enableKitchen(true)}
                                                disabled={busy}
                                                className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-700 bg-white hover:bg-white/90 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Enable + load starter pack
                                            </button>
                                            <button
                                                onClick={() => enableKitchen(false)}
                                                disabled={busy}
                                                className="text-[13px] font-medium text-white/85 hover:text-white px-3 py-2.5"
                                            >
                                                Enable empty (I'll set up everything myself)
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="bg-white border border-ink-200 rounded-2xl px-2 py-1.5 inline-flex gap-1 overflow-x-auto">
                        {[
                            { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                            { key: 'menu', label: 'Menu Items', icon: <ChefHat className="w-3.5 h-3.5" /> },
                            { key: 'plan', label: 'Meal Plan', icon: <Calendar className="w-3.5 h-3.5" /> },
                            { key: 'orders', label: 'Purchase Orders', icon: <Receipt className="w-3.5 h-3.5" /> },
                            { key: 'vendors', label: 'Vendors', icon: <Truck className="w-3.5 h-3.5" /> },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key as Tab)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium tracking-tight transition-colors whitespace-nowrap ${
                                    tab === t.key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                                }`}
                            >
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center text-[13px] text-ink-500">Loading kitchen data…</div>
                    ) : (
                        <>
                            {tab === 'overview' && (
                                <OverviewTab forecast={forecast} pos={pos} weekStart={weekStart} setWeekStart={setWeekStart} menuItems={menuItems} plans={plans} />
                            )}
                            {tab === 'menu' && (
                                <MenuTab menuItems={menuItems} products={products} onRefresh={refresh} showToast={showToast} onLoadPack={loadPack} busy={busy} />
                            )}
                            {tab === 'plan' && (
                                <PlanTab weekStart={weekStart} setWeekStart={setWeekStart} menuItems={menuItems} plans={plans} onRefresh={refresh} showToast={showToast} />
                            )}
                            {tab === 'orders' && (
                                <OrdersTab pos={pos} onRefresh={refresh} showToast={showToast} />
                            )}
                            {tab === 'vendors' && (
                                <VendorsTab vendors={vendors} onRefresh={refresh} showToast={showToast} />
                            )}
                        </>
                    )}
                </div>

                {toast && (
                    <div className="fixed bottom-6 right-6 bg-ink-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium z-50 animate-fade-in">
                        {toast}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================
function OverviewTab({ forecast, pos, weekStart, setWeekStart, menuItems, plans }: {
    forecast: ForecastResult | null;
    pos: PurchaseOrder[];
    weekStart: Date;
    setWeekStart: (d: Date) => void;
    menuItems: MenuItem[];
    plans: MealPlan[];
}) {
    const draftCount = pos.filter(p => p.status === 'DRAFT').length;
    const sentCount = pos.filter(p => p.status === 'SENT').length;
    const failedCount = pos.filter(p => p.status === 'FAILED').length;
    const plannedServings = plans.reduce((s, p) => s + p.plannedServings, 0);

    return (
        <div className="space-y-4">
            {/* Week selector */}
            <div className="bg-white border border-ink-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-ink-500" />
                <span className="text-[12.5px] text-ink-600">Week of</span>
                <input
                    type="date"
                    value={ymd(weekStart)}
                    onChange={e => setWeekStart(startOfWeek(new Date(e.target.value)))}
                    className="bg-ink-50 border border-ink-200 rounded-lg px-3 py-1.5 text-[13px] text-ink-900 outline-none focus:border-indigo-300"
                />
                <span className="text-[11.5px] text-ink-500 tabular-nums ml-auto">{plannedServings} servings planned · {menuItems.filter(m => m.isActive).length} active menu items</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Draft POs" value={String(draftCount)} sublabel="awaiting review" tone={draftCount > 0 ? 'amber' : 'default'} />
                <Metric label="Sent this period" value={String(sentCount)} sublabel="awaiting delivery" />
                <Metric label="Failed" value={String(failedCount)} sublabel={failedCount > 0 ? 'need attention' : 'none'} tone={failedCount > 0 ? 'red' : 'default'} />
                <Metric label="Forecast vendors" value={String(forecast?.drafts.length ?? 0)} sublabel="this week" />
            </div>

            {/* Forecast preview */}
            <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">Live forecast</span>
                        <span className="font-mono text-[10.5px] text-ink-500 uppercase tracking-[0.12em]">based on this week's plan</span>
                    </div>
                </div>
                {!forecast || forecast.drafts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-[12.5px] text-ink-500">
                        Add menu items, schedule meal plans, and assign vendors to ingredients to see a forecast.
                    </div>
                ) : (
                    <div className="divide-y divide-ink-100">
                        {forecast.drafts.map(d => (
                            <div key={d.vendorId || d.vendorName} className="flex items-start justify-between gap-3 px-5 py-3.5">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-4 h-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[13.5px] font-semibold text-ink-900 tracking-tight">{d.vendorName}</div>
                                        <div className="text-[11.5px] text-ink-500 tabular-nums truncate">
                                            {d.items.length} item{d.items.length === 1 ? '' : 's'} · {d.contactEmail || 'no email on file'}
                                            {d.autoSendEnabled && <span className="ml-1.5 text-emerald-600">· auto-send</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="font-display text-[16px] font-semibold text-ink-900 tabular-nums">{fmtMoney(d.totalAmount)}</div>
                                    {!d.meetsMinimum && <span className="text-[10.5px] text-amber-700 font-medium">below minimum</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {forecast && forecast.skippedItems.length > 0 && (
                    <div className="bg-amber-50 border-t border-amber-200 px-5 py-3 text-[11.5px] text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span><strong className="font-semibold">{forecast.skippedItems.length}</strong> item{forecast.skippedItems.length === 1 ? '' : 's'} skipped — assign a vendor to: {forecast.skippedItems.slice(0, 3).map(s => s.productName).join(', ')}{forecast.skippedItems.length > 3 ? ` (+${forecast.skippedItems.length - 3} more)` : ''}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function Metric({ label, value, sublabel, tone = 'default' }: { label: string; value: string; sublabel?: string; tone?: 'default' | 'red' | 'amber' }) {
    const cls = tone === 'red' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-ink-900';
    return (
        <div className="bg-white border border-ink-200 rounded-2xl px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-500 font-semibold">{label}</p>
            <p className={`font-display text-[28px] font-semibold tabular-nums tracking-tightest leading-none mt-2 ${cls}`}>{value}</p>
            {sublabel && <p className="text-[11.5px] text-ink-500 mt-1.5">{sublabel}</p>}
        </div>
    );
}

// ============================================================================
// MENU TAB
// ============================================================================
function MenuTab({ menuItems, products, onRefresh, showToast, onLoadPack, busy }: {
    menuItems: MenuItem[];
    products: Array<{ id: string; name: string; unit?: string | null; costPrice?: number }>;
    onRefresh: () => void;
    showToast: (s: string) => void;
    onLoadPack: () => void;
    busy: boolean;
}) {
    const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);

    function newItem() {
        setEditing({ name: '', category: 'entree', defaultServings: 30, recipes: [] });
    }

    async function save() {
        if (!editing || !editing.name) return showToast('Name required');
        try {
            if (editing.id) {
                await kitchenApi.updateMenuItem(editing.id, editing);
            } else {
                await kitchenApi.createMenuItem(editing);
            }
            setEditing(null);
            await onRefresh();
            showToast('Saved');
        } catch (e: any) { showToast(e.message || 'Save failed'); }
    }

    async function removeItem(id: string) {
        if (!confirm('Archive this menu item? Historical meal plans will be preserved.')) return;
        await kitchenApi.deleteMenuItem(id);
        await onRefresh();
        showToast('Archived');
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold text-ink-900 tracking-tight">Menu library</h2>
                <button onClick={newItem} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3.5 py-2 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> New menu item
                </button>
            </div>

            {menuItems.length === 0 && !editing ? (
                <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center">
                    <ChefHat className="w-8 h-8 text-ink-300 mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-ink-900 tracking-tight">No menu items yet</p>
                    <p className="text-[12.5px] text-ink-500 mt-1 max-w-md mx-auto">Load 10 retirement-home staple recipes (with full ingredient lists) in one click, or build your own from scratch.</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                            onClick={onLoadPack}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg disabled:opacity-60"
                        >
                            <Zap className="w-3.5 h-3.5" /> Load starter pack
                        </button>
                        <button onClick={newItem} className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-700 bg-white border border-ink-200 hover:border-ink-300 px-3 py-2 rounded-lg">
                            <Plus className="w-3.5 h-3.5" /> Add manually
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {menuItems.map(item => (
                        <div key={item.id} className="bg-white border border-ink-200 rounded-2xl p-4 hover:border-ink-300 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{item.category || 'uncategorized'}</div>
                                    <div className="font-display text-[15px] font-semibold text-ink-900 tracking-tight mt-0.5 truncate">{item.name}</div>
                                </div>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button onClick={() => setEditing(item)} className="w-7 h-7 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center"><span className="text-[11px]">Edit</span></button>
                                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1">
                                {item.recipes.length === 0 ? (
                                    <p className="text-[11.5px] text-ink-400 italic">No ingredients defined</p>
                                ) : item.recipes.slice(0, 5).map(r => (
                                    <div key={r.productId} className="flex items-center justify-between text-[12px]">
                                        <span className="text-ink-700 truncate">{r.product?.name || 'Unknown'}</span>
                                        <span className="text-ink-500 tabular-nums">{r.qtyPerServing} {r.unit}</span>
                                    </div>
                                ))}
                                {item.recipes.length > 5 && <p className="text-[11px] text-ink-400">+{item.recipes.length - 5} more</p>}
                            </div>
                            <div className="mt-3 pt-3 border-t border-ink-100 text-[11.5px] text-ink-500 tabular-nums">
                                {item.defaultServings} default servings · v{item.version}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <MenuEditorModal
                    editing={editing}
                    setEditing={setEditing}
                    products={products}
                    onSave={save}
                    onCancel={() => setEditing(null)}
                />
            )}
        </div>
    );
}

function MenuEditorModal({ editing, setEditing, products, onSave, onCancel }: {
    editing: Partial<MenuItem>;
    setEditing: (m: Partial<MenuItem>) => void;
    products: Array<{ id: string; name: string; unit?: string | null }>;
    onSave: () => void;
    onCancel: () => void;
}) {
    const recipes = (editing.recipes || []) as any[];

    function addRow() {
        setEditing({ ...editing, recipes: [...recipes, { productId: '', qtyPerServing: 0, unit: 'oz' }] });
    }

    function update(i: number, patch: any) {
        const next = [...recipes];
        next[i] = { ...next[i], ...patch };
        setEditing({ ...editing, recipes: next });
    }

    function remove(i: number) {
        setEditing({ ...editing, recipes: recipes.filter((_, idx) => idx !== i) });
    }

    return (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
                    <h3 className="font-display text-[16px] font-semibold text-ink-900 tracking-tight">{editing.id ? 'Edit menu item' : 'New menu item'}</h3>
                    <button onClick={onCancel} className="text-ink-500 hover:text-ink-900"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[11.5px] font-medium text-ink-700 mb-1">Name</label>
                            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300" />
                        </div>
                        <div>
                            <label className="block text-[11.5px] font-medium text-ink-700 mb-1">Default servings</label>
                            <input type="number" value={editing.defaultServings ?? 0} onChange={e => setEditing({ ...editing, defaultServings: parseInt(e.target.value) || 0 })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none tabular-nums focus:border-indigo-300" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11.5px] font-medium text-ink-700 mb-1">Category</label>
                        <select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300">
                            <option value="">—</option>
                            <option value="breakfast">Breakfast</option>
                            <option value="entree">Entree</option>
                            <option value="side">Side</option>
                            <option value="dessert">Dessert</option>
                            <option value="beverage">Beverage</option>
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[11.5px] font-medium text-ink-700">Ingredients (per serving)</label>
                            <button onClick={addRow} className="flex items-center gap-1 text-[11.5px] font-medium text-indigo-700 hover:text-indigo-800"><Plus className="w-3 h-3" /> Add ingredient</button>
                        </div>
                        <div className="space-y-2">
                            {recipes.length === 0 && <p className="text-[12px] text-ink-500 italic">No ingredients yet — add at least one.</p>}
                            {recipes.map((r, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <select value={r.productId} onChange={e => update(i, { productId: e.target.value })} className="col-span-6 bg-ink-50 border border-ink-200 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-indigo-300">
                                        <option value="">Select product…</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" step="0.01" value={r.qtyPerServing} onChange={e => update(i, { qtyPerServing: parseFloat(e.target.value) || 0 })} className="col-span-3 bg-ink-50 border border-ink-200 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none tabular-nums focus:border-indigo-300" />
                                    <input value={r.unit} onChange={e => update(i, { unit: e.target.value })} placeholder="unit" className="col-span-2 bg-ink-50 border border-ink-200 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-indigo-300" />
                                    <button onClick={() => remove(i)} className="col-span-1 text-ink-400 hover:text-rose-600"><X className="w-4 h-4 mx-auto" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-ink-100 flex justify-end gap-2">
                    <button onClick={onCancel} className="text-[12.5px] font-medium text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-100">Cancel</button>
                    <button onClick={onSave} className="text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MEAL PLAN TAB
// ============================================================================
function PlanTab({ weekStart, setWeekStart, menuItems, plans, onRefresh, showToast }: {
    weekStart: Date;
    setWeekStart: (d: Date) => void;
    menuItems: MenuItem[];
    plans: MealPlan[];
    onRefresh: () => void;
    showToast: (s: string) => void;
}) {
    const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + i); return d;
    }), [weekStart]);

    const plansByDay = useMemo(() => {
        const m = new Map<string, MealPlan[]>();
        for (const p of plans) {
            const key = ymd(new Date(p.date));
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(p);
        }
        return m;
    }, [plans]);

    async function addPlan(date: Date, menuItemId: string, servings: number) {
        if (!menuItemId) return;
        try {
            await kitchenApi.upsertMealPlan({ date: ymd(date), menuItemId, plannedServings: servings });
            await onRefresh();
        } catch (e: any) { showToast(e.message || 'Failed to add'); }
    }

    async function removePlan(id: string) {
        await kitchenApi.deleteMealPlan(id);
        await onRefresh();
    }

    async function copyLastWeek() {
        const last = new Date(weekStart); last.setUTCDate(last.getUTCDate() - 7);
        try {
            const r = await kitchenApi.copyMealPlanWeek(ymd(last), ymd(weekStart));
            showToast(`Copied ${r.copied} plan${r.copied === 1 ? '' : 's'} from last week`);
            await onRefresh();
        } catch (e: any) { showToast(e.message || 'Copy failed'); }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border border-ink-200 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ink-500" />
                    <button onClick={() => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() - 7); setWeekStart(d); }} className="text-[12.5px] text-ink-600 hover:text-ink-900 px-2 py-1 rounded">←</button>
                    <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight tabular-nums">Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <button onClick={() => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + 7); setWeekStart(d); }} className="text-[12.5px] text-ink-600 hover:text-ink-900 px-2 py-1 rounded">→</button>
                </div>
                <button onClick={copyLastWeek} className="ml-auto flex items-center gap-1.5 text-[12px] font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 px-3 py-1.5 rounded-lg">Copy last week</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {days.map(d => {
                    const list = plansByDay.get(ymd(d)) || [];
                    return (
                        <div key={ymd(d)} className="bg-white border border-ink-200 rounded-2xl p-3 min-h-[200px]">
                            <div className="flex items-baseline justify-between mb-2.5">
                                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{DAY_LABELS[d.getUTCDay()]}</span>
                                <span className="font-display text-[14px] font-semibold text-ink-900 tabular-nums">{d.getUTCDate()}</span>
                            </div>
                            <div className="space-y-1.5">
                                {list.map(p => (
                                    <div key={p.id} className="bg-ink-50 border border-ink-200 rounded-lg px-2 py-1.5 text-[12px]">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-medium text-ink-900 truncate">{p.menuItem?.name}</span>
                                            <button onClick={() => removePlan(p.id)} className="text-ink-400 hover:text-rose-600 flex-shrink-0"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="text-[10.5px] text-ink-500 tabular-nums mt-0.5">
                                            {p.plannedServings} planned{p.actualServings != null && ` · ${p.actualServings} served`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <DayAddRow onAdd={(menuItemId, servings) => addPlan(d, menuItemId, servings)} menuItems={menuItems} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DayAddRow({ menuItems, onAdd }: { menuItems: MenuItem[]; onAdd: (id: string, servings: number) => void }) {
    const [menuItemId, setMenuItemId] = useState('');
    const [servings, setServings] = useState(30);
    return (
        <div className="mt-2 pt-2 border-t border-ink-100 space-y-1.5">
            <select value={menuItemId} onChange={e => setMenuItemId(e.target.value)} className="w-full bg-ink-50 border border-ink-200 rounded-md px-2 py-1 text-[11.5px] outline-none">
                <option value="">+ Add dish</option>
                {menuItems.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {menuItemId && (
                <div className="flex items-center gap-1">
                    <input type="number" value={servings} onChange={e => setServings(parseInt(e.target.value) || 0)} className="flex-1 bg-ink-50 border border-ink-200 rounded-md px-2 py-1 text-[11.5px] tabular-nums outline-none" />
                    <button onClick={() => { onAdd(menuItemId, servings); setMenuItemId(''); setServings(30); }} className="text-[11.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded-md">Add</button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ORDERS TAB
// ============================================================================
function OrdersTab({ pos, onRefresh, showToast }: { pos: PurchaseOrder[]; onRefresh: () => void; showToast: (s: string) => void }) {
    const [filter, setFilter] = useState<string>('all');
    const filtered = pos.filter(p => filter === 'all' || p.status === filter);

    async function approve(id: string) {
        try {
            const r = await kitchenApi.approvePurchaseOrder(id);
            showToast(r.sent ? 'Email sent to vendor' : 'Approved (email failed — check vendor settings)');
            await onRefresh();
        } catch (e: any) { showToast(e.message || 'Approve failed'); }
    }
    async function receive(id: string) {
        await kitchenApi.receivePurchaseOrder(id);
        showToast('Marked received — inventory updated');
        await onRefresh();
    }
    async function cancel(id: string) {
        if (!confirm('Cancel this PO?')) return;
        await kitchenApi.cancelPurchaseOrder(id);
        showToast('Cancelled');
        await onRefresh();
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border border-ink-200 rounded-2xl px-4 py-3 flex items-center gap-1 overflow-x-auto">
                {['all', 'DRAFT', 'APPROVED', 'SENT', 'RECEIVED', 'FAILED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap ${filter === s ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
                        {s === 'all' ? 'All' : s}
                        <span className={`ml-1.5 tabular-nums text-[11px] ${filter === s ? 'text-white/75' : 'text-ink-400'}`}>{s === 'all' ? pos.length : pos.filter(p => p.status === s).length}</span>
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center">
                    <Receipt className="w-8 h-8 text-ink-300 mx-auto mb-3" />
                    <p className="text-[13px] font-medium text-ink-900">No purchase orders</p>
                    <p className="text-[12px] text-ink-500 mt-1">Run the weekly forecast to generate draft orders.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(po => (
                        <div key={po.id} className="bg-white border border-ink-200 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-4 h-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-display text-[14px] font-semibold text-ink-900 tracking-tight">{po.vendor.name}</span>
                                            <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${toneClasses[statusTone(po.status)]}`}>{po.status}</span>
                                            <span className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.12em]">PO {po.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="text-[11.5px] text-ink-500 tabular-nums mt-1">
                                            Week of {new Date(po.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {po.items.length} item{po.items.length === 1 ? '' : 's'} · {po.vendor.contactEmail || 'no email'}
                                        </div>
                                        {po.failureReason && (
                                            <div className="text-[11px] text-rose-700 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {po.failureReason}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="font-display text-[18px] font-semibold text-ink-900 tabular-nums tracking-tightest">{fmtMoney(po.totalAmount)}</div>
                                    <div className="flex items-center gap-1 mt-2 justify-end">
                                        {(po.status === 'DRAFT' || po.status === 'PENDING_REVIEW') && (
                                            <button onClick={() => approve(po.id)} className="flex items-center gap-1 text-[11.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-md"><Send className="w-3 h-3" /> Approve &amp; send</button>
                                        )}
                                        {po.status === 'SENT' && (
                                            <button onClick={() => receive(po.id)} className="flex items-center gap-1 text-[11.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md"><Check className="w-3 h-3" /> Mark received</button>
                                        )}
                                        {(po.status === 'DRAFT' || po.status === 'PENDING_REVIEW' || po.status === 'FAILED') && (
                                            <button onClick={() => cancel(po.id)} className="text-[11.5px] font-medium text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-md hover:bg-rose-50">Cancel</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-3">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-ink-500 text-left">
                                            <th className="py-1">Item</th>
                                            <th className="py-1 text-right">Qty</th>
                                            <th className="py-1 text-right">Unit cost</th>
                                            <th className="py-1 text-right">Line total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-100/70">
                                        {po.items.map(it => (
                                            <tr key={it.id}>
                                                <td className="py-1.5 text-ink-800">{it.productName}</td>
                                                <td className="py-1.5 text-right tabular-nums text-ink-700">{it.qty} {it.unit}</td>
                                                <td className="py-1.5 text-right tabular-nums text-ink-500">{fmtMoney(it.unitCost)}</td>
                                                <td className="py-1.5 text-right tabular-nums font-medium text-ink-900">{fmtMoney(it.lineTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// VENDORS TAB
// ============================================================================
function VendorsTab({ vendors, onRefresh, showToast }: { vendors: Vendor[]; onRefresh: () => void; showToast: (s: string) => void }) {
    const [editing, setEditing] = useState<Partial<Vendor> | null>(null);

    async function save() {
        if (!editing || !editing.name) return showToast('Name required');
        try {
            if (editing.id) await kitchenApi.updateVendor(editing.id, editing);
            else await kitchenApi.createVendor(editing);
            setEditing(null);
            await onRefresh();
            showToast('Saved');
        } catch (e: any) { showToast(e.message || 'Save failed'); }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold text-ink-900 tracking-tight">Vendors</h2>
                <button onClick={() => setEditing({ name: '', autoSendEnabled: false, leadTimeDays: 2 })} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-ink-900 hover:bg-ink-800 px-3.5 py-2 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> New vendor
                </button>
            </div>

            {vendors.length === 0 && !editing ? (
                <div className="bg-white border border-ink-200 rounded-2xl p-12 text-center">
                    <Truck className="w-8 h-8 text-ink-300 mx-auto mb-3" />
                    <p className="text-[13px] font-medium text-ink-900">No vendors yet</p>
                    <p className="text-[12px] text-ink-500 mt-1">Add a vendor and assign products to them so weekly orders can route automatically.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">
                    {vendors.map(v => (
                        <div key={v.id} className="bg-white border border-ink-200 rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-display text-[14.5px] font-semibold text-ink-900 tracking-tight">{v.name}</div>
                                    <div className="text-[11.5px] text-ink-500 mt-0.5 flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" />{v.contactEmail || 'no email'}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {v.autoSendEnabled ? (
                                        <span className="text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Auto-send on</span>
                                    ) : (
                                        <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Manual review</span>
                                    )}
                                    <button onClick={() => setEditing(v)} className="text-[11.5px] text-indigo-600 hover:text-indigo-700">Edit</button>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px] text-ink-700 tabular-nums">
                                <div><span className="text-ink-400">Lead</span> <span className="font-medium">{v.leadTimeDays}d</span></div>
                                <div><span className="text-ink-400">Min</span> <span className="font-medium">{v.minOrderValue ? `$${v.minOrderValue}` : '—'}</span></div>
                                <div><span className="text-ink-400">SKUs</span> <span className="font-medium">{v._count?.products ?? 0}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
                            <h3 className="font-display text-[16px] font-semibold text-ink-900 tracking-tight">{editing.id ? 'Edit vendor' : 'New vendor'}</h3>
                            <button onClick={() => setEditing(null)} className="text-ink-500 hover:text-ink-900"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <Field label="Name"><input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300" /></Field>
                            <Field label="Contact email"><input type="email" value={editing.contactEmail || ''} onChange={e => setEditing({ ...editing, contactEmail: e.target.value })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300" /></Field>
                            <Field label="Phone"><input value={editing.contactPhone || ''} onChange={e => setEditing({ ...editing, contactPhone: e.target.value })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-300" /></Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Lead time (days)"><input type="number" value={editing.leadTimeDays ?? 2} onChange={e => setEditing({ ...editing, leadTimeDays: parseInt(e.target.value) || 0 })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none tabular-nums focus:border-indigo-300" /></Field>
                                <Field label="Min order value"><input type="number" step="0.01" value={editing.minOrderValue ?? ''} onChange={e => setEditing({ ...editing, minOrderValue: parseFloat(e.target.value) || null })} className="w-full bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 text-[13px] outline-none tabular-nums focus:border-indigo-300" /></Field>
                            </div>
                            <label className="flex items-center gap-2 text-[12.5px] text-ink-700 mt-2">
                                <input type="checkbox" checked={!!editing.autoSendEnabled} onChange={e => setEditing({ ...editing, autoSendEnabled: e.target.checked })} className="w-4 h-4" />
                                <span>Auto-send weekly orders to this vendor (skip manual review)</span>
                            </label>
                        </div>
                        <div className="px-6 py-4 border-t border-ink-100 flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="text-[12.5px] font-medium text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-100">Cancel</button>
                            <button onClick={save} className="text-[12.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg">Save</button>
                        </div>
                    </div>
                </div>
            )}
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
