import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Truck, Layers, Briefcase, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Product } from '@/types';

interface SearchResult {
    type: 'product' | 'vendor' | 'category';
    id: string;
    title: string;
    subtitle: string;
    href: string;
}

interface GlobalSearchProps {
    placeholder?: string;
    /** light = white pill on dark hero. dark = subtle pill on light surfaces */
    variant?: 'light' | 'dark';
}

const TYPE_ICONS = {
    product: <Package className="w-4 h-4" />,
    vendor: <Truck className="w-4 h-4" />,
    category: <Layers className="w-4 h-4" />,
};

export default function GlobalSearch({ placeholder = 'Search products, vendors, categories or jobs', variant = 'light' }: GlobalSearchProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [open, setOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch product corpus once on mount (cached for live filtering)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token') || '';
                const data = await api.get('/products?limit=500', token);
                const list = Array.isArray(data) ? data : data.products || [];
                if (!cancelled) setProducts(list);
            } catch {
                /* fail silently — search just stays empty */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Run filter when query changes
    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            setResults([]);
            return;
        }
        const seenVendors = new Set<string>();
        const seenCategories = new Set<string>();
        const matches: SearchResult[] = [];

        for (const p of products) {
            const name = (p.name || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const vendor = (p.vendor || '').toLowerCase();
            const category = (p.category || '').toLowerCase();

            if (matches.filter(m => m.type === 'product').length < 6 && (name.includes(q) || sku.includes(q))) {
                matches.push({
                    type: 'product',
                    id: p.id,
                    title: p.name,
                    subtitle: [p.category, p.vendor].filter(Boolean).join(' · ') || 'Product',
                    href: `/products?q=${encodeURIComponent(p.name)}`,
                });
            }
            if (vendor.includes(q) && p.vendor && !seenVendors.has(p.vendor)) {
                seenVendors.add(p.vendor);
                matches.push({
                    type: 'vendor',
                    id: p.vendor,
                    title: p.vendor,
                    subtitle: 'Vendor',
                    href: `/vendors`,
                });
            }
            if (category.includes(q) && p.category && !seenCategories.has(p.category)) {
                seenCategories.add(p.category);
                matches.push({
                    type: 'category',
                    id: p.category,
                    title: p.category,
                    subtitle: 'Category',
                    href: `/products?q=${encodeURIComponent(p.category)}`,
                });
            }
        }

        setResults(matches.slice(0, 10));
        setActiveIdx(0);
    }, [query, products]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Cmd/Ctrl+K shortcut
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        const target = results[activeIdx];
        if (target) {
            navigate(target.href);
        } else {
            navigate(`/products?q=${encodeURIComponent(q)}`);
        }
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(results.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(0, i - 1));
        } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const baseInputCls =
        variant === 'light'
            ? 'flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/20 focus-within:bg-white/95 focus-within:text-ink-900 backdrop-blur-sm transition-colors cursor-text'
            : 'flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-ink-100 hover:bg-ink-200/70 border border-ink-200 transition-colors cursor-text';

    const inputCls =
        variant === 'light'
            ? 'flex-1 bg-transparent border-0 outline-none text-[13px] placeholder:text-white/70 focus:placeholder:text-ink-400 min-w-0'
            : 'flex-1 bg-transparent border-0 outline-none text-[13px] text-ink-900 placeholder:text-ink-500 min-w-0';

    const iconCls = variant === 'light' ? 'w-4 h-4 text-white/80 flex-shrink-0' : 'w-4 h-4 text-ink-500 flex-shrink-0';
    const kbdCls =
        variant === 'light'
            ? 'hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/80 bg-white/15 rounded'
            : 'hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-ink-500 bg-white border border-ink-200 rounded';

    return (
        <div ref={containerRef} className="relative flex-1 min-w-0">
            <form onSubmit={handleSubmit}>
                <label className={baseInputCls}>
                    <Search className={iconCls} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={inputCls}
                    />
                    <kbd className={kbdCls}>⌘K</kbd>
                </label>
            </form>

            {open && query.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-ink-200 rounded-2xl shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)] overflow-hidden">
                    {loading && results.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[12.5px] text-ink-500">Loading…</div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                            <p className="text-[12.5px] text-ink-500">No matches for "{query}".</p>
                            <button
                                type="button"
                                onClick={() => navigate(`/products?q=${encodeURIComponent(query)}`)}
                                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-700 hover:text-indigo-800"
                            >
                                Search inventory anyway <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <ul className="max-h-[60vh] overflow-y-auto py-1.5">
                            {results.map((r, i) => (
                                <li key={`${r.type}-${r.id}`}>
                                    <button
                                        type="button"
                                        onMouseEnter={() => setActiveIdx(i)}
                                        onClick={() => {
                                            navigate(r.href);
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                            i === activeIdx ? 'bg-indigo-50' : 'hover:bg-ink-50'
                                        }`}
                                    >
                                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            r.type === 'product' ? 'bg-indigo-50 text-indigo-700' :
                                            r.type === 'vendor' ? 'bg-emerald-50 text-emerald-700' :
                                            'bg-violet-50 text-violet-700'
                                        }`}>
                                            {TYPE_ICONS[r.type]}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-semibold text-ink-900 truncate tracking-tight">{r.title}</div>
                                            <div className="text-[11.5px] text-ink-500 truncate">{r.subtitle}</div>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-mono flex-shrink-0">{r.type}</span>
                                    </button>
                                </li>
                            ))}
                            <li className="border-t border-ink-100 mt-1.5 pt-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigate(`/products?q=${encodeURIComponent(query)}`);
                                        setOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3.5 py-2 text-left hover:bg-ink-50 transition-colors"
                                >
                                    <span className="w-9 h-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="w-4 h-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-medium text-ink-900 tracking-tight">Search inventory for "{query}"</div>
                                        <div className="text-[11.5px] text-ink-500">View all matching products</div>
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-ink-400" />
                                </button>
                            </li>
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
