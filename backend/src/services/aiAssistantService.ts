// AI voice-assistant service.
//
// Pipeline: audio → Groq Whisper transcription → Groq Llama 3.3 tool-call
//           → execute the picked function against the DB → ElevenLabs TTS
//           → audio reply back to the client.
//
// All three integrations are isolated here so the controller stays thin and
// the assistant can be unit-tested by swapping the network calls.

import { prisma } from '../lib/prisma';
import fs from 'fs';

// ────────────────────────────────────────────────────────────────────────────
// Tool definitions — the only things the model is allowed to "do"
// ────────────────────────────────────────────────────────────────────────────

// Convenience-store tools — used when store.facilityType = CONVENIENCE_STORE.
// Each tool is read-only and returns transaction-id citations alongside the
// answer, so the UI can show "this number comes from these N rows" — the
// integrity guarantee that incumbents' AI assistants don't provide.
const CSTORE_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'cstore_top_products',
            description:
                'Return the top-selling products by revenue for a recent time window. Use for queries like "what are my best sellers", "top items this week", "what made me the most money in the last 30 days".',
            parameters: {
                type: 'object',
                properties: {
                    days: { type: 'integer', description: 'Lookback window in days (default 7, max 90)' },
                    limit: { type: 'integer', description: 'How many products to return (default 5, max 20)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cstore_low_stock',
            description:
                'List products that are running low — high sales velocity + low on-hand. Use for "what is running out", "what should I reorder", "what is low".',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cstore_margin_compressed',
            description:
                'List products whose margin has dropped because cost rose but retail did not. Use for "where am I losing margin", "which items lost profitability", "cost increases".',
            parameters: {
                type: 'object',
                properties: {
                    minDropPercent: { type: 'number', description: 'Minimum margin-point drop to flag (default 3)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cstore_revenue_summary',
            description:
                'Return total revenue, transaction count, and average ticket for a window, plus week-over-week change. Use for "how did I do this week", "revenue last 30 days", "how is the store doing".',
            parameters: {
                type: 'object',
                properties: {
                    days: { type: 'integer', description: 'Lookback window in days (default 7, max 90)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cstore_vendor_performance',
            description:
                'Revenue and unit volume per vendor/distributor in the last N days. Use for "which vendor is doing well", "Coca-Cola sales", "compare distributors".',
            parameters: {
                type: 'object',
                properties: {
                    days: { type: 'integer', description: 'Lookback window in days (default 30, max 90)' },
                    vendor: { type: 'string', description: 'Optional filter — single vendor name' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'unrecognized',
            description:
                'Fallback when the user\'s question does not match any other tool. Provide a short clarifying message in the message field.',
            parameters: {
                type: 'object',
                properties: { message: { type: 'string' } },
                required: ['message']
            }
        }
    }
];

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'log_meal_for_resident',
            description:
                'Record that a specific menu item (dish) was served to a specific resident, OR log a generic batch count if no resident is named. Use this for any phrase like "log a chicken for Mrs. Patel" or "two meatloafs served".',
            parameters: {
                type: 'object',
                properties: {
                    dishName: { type: 'string', description: 'Name of the dish from the menu, e.g. "chicken" or "meatloaf"' },
                    residentName: { type: 'string', description: 'Resident\'s name (full or partial). Omit for a generic count not attributed to anyone.' },
                    servings: { type: 'integer', description: 'Number of servings (default 1)' },
                },
                required: ['dishName'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'log_guest_meal',
            description:
                'Record a paid guest meal (a family member or visitor who paid the home for a meal). Use this when the user mentions money paid, e.g. "Mrs. Smith\'s daughter paid $10 for chicken".',
            parameters: {
                type: 'object',
                properties: {
                    dishName: { type: 'string', description: 'Optional menu item name' },
                    guestName: { type: 'string', description: 'Optional guest name (e.g. "Mrs. Smith\'s daughter")' },
                    paidAmount: { type: 'number', description: 'Dollars the home charged the guest' },
                    paymentMethod: { type: 'string', enum: ['cash', 'card', 'charged_to_room'] },
                },
                required: ['paidAmount'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_stockout_watch',
            description:
                'Read out the ingredients that are running low or about to run out. Use this for queries like "what\'s running low?" or "any stockouts coming up?"',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'unrecognized',
            description:
                'Fallback when the user\'s request does not match any other tool, or when more information is needed. Provide a short clarifying question in the message field.',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Short clarifying or apology message' },
                },
                required: ['message'],
            },
        },
    },
];

// ────────────────────────────────────────────────────────────────────────────
// Groq: Whisper transcription
// ────────────────────────────────────────────────────────────────────────────

export async function transcribeAudio(filePath: string, mimeType: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: mimeType });
    const form = new FormData();
    form.append('file', blob, 'audio.webm');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    form.append('language', 'en');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form as any,
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq transcription failed: ${res.status} ${errText}`);
    }
    const data = (await res.json()) as { text: string };
    return data.text.trim();
}

// ────────────────────────────────────────────────────────────────────────────
// Groq: Llama 3.3 tool-calling
// ────────────────────────────────────────────────────────────────────────────

interface ToolCall {
    name: string;
    args: any;
}

export async function pickTool(transcript: string, facilityType: string = 'RETIREMENT_HOME'): Promise<ToolCall> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const isCStore = facilityType === 'CONVENIENCE_STORE';
    const systemPrompt = isCStore
        ? `You are the voice assistant for Fluxor Cloud, an operations app for an independent convenience store.
You answer questions about sales, inventory, margins, and vendors using the store's actual transaction data.
Always pick exactly ONE tool from the provided list — never answer in free-form text.
If you cannot map the question to a tool, call "unrecognized" with a short clarifying message.
Be concise.`
        : `You are the voice assistant for Fluxor Cloud, a retirement-home kitchen-management app.
You help kitchen staff log meals and check inventory by voice.
Always pick exactly ONE tool from the provided list — never answer in free-form text.
If you cannot map the request to a tool, call "unrecognized" with a short clarifying message.
Be concise. Default servings=1 unless otherwise stated.`;

    const tools = isCStore ? CSTORE_TOOLS : TOOLS;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: transcript },
            ],
            tools,
            tool_choice: 'required',
            temperature: 0.1,
            max_tokens: 256,
        }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq chat failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
        return { name: 'unrecognized', args: { message: "I'm not sure what to do with that — could you rephrase?" } };
    }
    let args = {};
    try { args = JSON.parse(call.function.arguments); } catch { /* leave empty */ }
    return { name: call.function.name, args };
}

// ────────────────────────────────────────────────────────────────────────────
// ElevenLabs: text-to-speech
// ────────────────────────────────────────────────────────────────────────────

export async function synthesizeSpeech(text: string): Promise<Buffer | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return null; // Caller will fall back to text-only response

    // Default voice — "Sarah" (calm, warm). Override via env.
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1 },
        }),
    });
    if (!res.ok) {
        const errText = await res.text();
        console.error(`[ElevenLabs] TTS failed: ${res.status} ${errText}`);
        return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ────────────────────────────────────────────────────────────────────────────
// Tool execution against the database
// ────────────────────────────────────────────────────────────────────────────

interface ExecutionResult {
    speech: string;     // What to say back
    action: string;     // Machine-readable label of what was done
    data?: any;         // Optional structured payload for the UI
    needsConfirm?: boolean;
}

function fuzzyFindMenuItem(items: { id: string; name: string }[], q: string): { id: string; name: string } | null {
    const lc = q.trim().toLowerCase();
    if (!lc) return null;
    // 1. Exact word match
    for (const it of items) {
        const itlc = it.name.toLowerCase();
        if (itlc === lc) return it;
        const words = itlc.split(/\s+/);
        if (words.includes(lc)) return it;
    }
    // 2. Substring match
    for (const it of items) {
        if (it.name.toLowerCase().includes(lc)) return it;
    }
    // 3. Partial word match (any word in dish contains query)
    for (const it of items) {
        const words = it.name.toLowerCase().split(/\s+/);
        if (words.some(w => w.includes(lc) || lc.includes(w))) return it;
    }
    return null;
}

function fuzzyFindResident(residents: { id: string; name: string }[], q: string): { id: string; name: string } | null {
    const lc = q.trim().toLowerCase().replace(/^(mr|mrs|ms|miss|dr)\.?\s+/, '');
    if (!lc) return null;
    for (const r of residents) {
        const rlc = r.name.toLowerCase();
        if (rlc === lc) return r;
        const words = rlc.split(/\s+/);
        if (words.some(w => w === lc)) return r; // last name match
        if (rlc.includes(lc)) return r;
    }
    return null;
}

export async function executeTool(storeId: string, userId: string | null, call: ToolCall): Promise<ExecutionResult> {
    if (call.name === 'unrecognized') {
        return { speech: call.args?.message || 'Sorry, I did not catch that.', action: 'unrecognized' };
    }

    if (call.name === 'log_meal_for_resident') {
        const dishQuery = String(call.args?.dishName || '');
        const residentQuery = String(call.args?.residentName || '');
        const servings = Math.max(1, parseInt(call.args?.servings) || 1);

        const items = await prisma.menuItem.findMany({
            where: { storeId, isActive: true },
            select: { id: true, name: true },
        });
        const menuItem = fuzzyFindMenuItem(items, dishQuery);
        if (!menuItem) {
            return {
                speech: `I could not find a dish called "${dishQuery}". Try a different name.`,
                action: 'menu_item_not_found',
            };
        }

        let residentId: string | null = null;
        let residentName = '';
        if (residentQuery) {
            const residents = await prisma.resident.findMany({
                where: { storeId, isActive: true },
                select: { id: true, name: true },
            });
            const r = fuzzyFindResident(residents, residentQuery);
            if (!r) {
                return {
                    speech: `I could not find a resident named "${residentQuery}". Could you say their name again?`,
                    action: 'resident_not_found',
                };
            }
            residentId = r.id;
            residentName = r.name;
        }

        // Fire the same writes /log-meal-resident does
        const today = new Date();
        const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const fullMenu = await prisma.menuItem.findUnique({
            where: { id: menuItem.id },
            include: { recipes: true },
        });
        await prisma.$transaction(async (db) => {
            await db.mealPlan.upsert({
                where: { storeId_date_menuItemId: { storeId, date: day, menuItemId: menuItem.id } },
                update: { actualServings: { increment: servings } },
                create: { storeId, date: day, menuItemId: menuItem.id, plannedServings: 0, actualServings: servings },
            });
            for (const r of fullMenu?.recipes ?? []) {
                await db.consumptionEvent.create({
                    data: {
                        storeId,
                        productId: r.productId,
                        menuItemId: menuItem.id,
                        residentId,
                        qty: r.qtyPerServing * servings,
                        unit: r.unit,
                        source: residentId ? 'resident_meal_voice' : 'meal_served_voice',
                        recordedBy: userId,
                    },
                });
            }
        });

        const servingWord = servings === 1 ? 'serving' : 'servings';
        const suffix = residentName ? ` for ${residentName}` : '';
        return {
            speech: `Logged ${servings} ${servingWord} of ${menuItem.name}${suffix}.`,
            action: 'meal_logged',
            data: { menuItemId: menuItem.id, residentId, servings },
        };
    }

    if (call.name === 'log_guest_meal') {
        const paidAmount = Number(call.args?.paidAmount);
        if (!isFinite(paidAmount) || paidAmount < 0) {
            return { speech: 'I need an amount to log a guest meal — how much did they pay?', action: 'missing_amount' };
        }
        const dishQuery = String(call.args?.dishName || '');
        const guestName = String(call.args?.guestName || '').trim() || null;
        const paymentMethod = ['cash', 'card', 'charged_to_room'].includes(call.args?.paymentMethod)
            ? call.args.paymentMethod : 'cash';

        let menuItemId: string | null = null;
        let dishName = '';
        if (dishQuery) {
            const items = await prisma.menuItem.findMany({
                where: { storeId, isActive: true },
                select: { id: true, name: true },
            });
            const m = fuzzyFindMenuItem(items, dishQuery);
            if (m) { menuItemId = m.id; dishName = m.name; }
        }

        const today = new Date();
        const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        await prisma.$transaction(async (db) => {
            await db.guestMeal.create({
                data: {
                    storeId, date: day, menuItemId, guestName,
                    paidAmount, paymentMethod, recordedBy: userId,
                },
            });
            if (menuItemId) {
                const m = await db.menuItem.findUnique({ where: { id: menuItemId }, include: { recipes: true } });
                for (const r of m?.recipes ?? []) {
                    await db.consumptionEvent.create({
                        data: {
                            storeId,
                            productId: r.productId,
                            menuItemId,
                            qty: r.qtyPerServing,
                            unit: r.unit,
                            source: 'guest_meal_voice',
                            recordedBy: userId,
                            notes: guestName ? `Guest: ${guestName}` : null,
                        },
                    });
                }
            }
        });

        const dishPart = dishName ? ` for ${dishName}` : '';
        const guestPart = guestName ? ` from ${guestName}` : '';
        return {
            speech: `Logged $${paidAmount.toFixed(2)} guest meal${dishPart}${guestPart}.`,
            action: 'guest_meal_logged',
        };
    }

    if (call.name === 'read_stockout_watch') {
        const { computeStockoutWatch } = await import('./stockoutWatchService');
        const rows = await computeStockoutWatch(storeId);
        const flagged = rows.filter(r => r.urgency !== 'ok').slice(0, 5);
        if (flagged.length === 0) {
            return { speech: 'Good news — nothing is running low right now.', action: 'stockout_ok' };
        }
        const phrases = flagged.map(r => `${r.productName}, about ${r.daysUntilStockout.toFixed(1)} days left`);
        const speech =
            flagged.length === 1
                ? `One item is running low: ${phrases[0]}.`
                : `${flagged.length} items are running low: ${phrases.join('; ')}.`;
        return { speech, action: 'stockout_read', data: { rows: flagged } };
    }

    // ── C-store tools — read-only queries with transaction-id citations ──
    if (call.name.startsWith('cstore_')) {
        return executeCStoreTool(storeId, call);
    }

    return { speech: 'Sorry, I did not understand that command.', action: 'unrecognized' };
}

// ────────────────────────────────────────────────────────────────────────────
// Convenience-store tool execution
//
// Every tool returns transaction IDs (sale.id) in its `data.citations` array
// so the UI can show "this answer comes from these N transactions" — closing
// the trust gap that incumbent AI assistants leave open. No sale.id is ever
// invented; every citation maps to a real row.
// ────────────────────────────────────────────────────────────────────────────

interface CStoreCitation {
    saleId: string;
    productId?: string;
    dateTime: string;
    amount: number;
}

function clampInt(value: any, fallback: number, min: number, max: number): number {
    const n = parseInt(value);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function clampNum(value: any, fallback: number, min: number, max: number): number {
    const n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

async function executeCStoreTool(storeId: string, call: ToolCall): Promise<ExecutionResult> {
    if (call.name === 'cstore_top_products') {
        const days = clampInt(call.args?.days, 7, 1, 90);
        const limit = clampInt(call.args?.limit, 5, 1, 20);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const items = await prisma.saleItem.findMany({
            where: { sale: { storeId, dateTime: { gte: since } } },
            include: {
                product: { select: { id: true, name: true } },
                sale: { select: { id: true, dateTime: true } }
            }
        });

        const byProduct = new Map<string, { name: string; revenue: number; units: number; citations: CStoreCitation[] }>();
        for (const i of items) {
            const key = i.product.id;
            const cur = byProduct.get(key) || { name: i.product.name, revenue: 0, units: 0, citations: [] };
            cur.revenue += i.lineTotal;
            cur.units += i.quantity;
            if (cur.citations.length < 25) {
                cur.citations.push({
                    saleId: i.sale.id, productId: i.product.id,
                    dateTime: i.sale.dateTime.toISOString(), amount: i.lineTotal
                });
            }
            byProduct.set(key, cur);
        }
        const ranked = Array.from(byProduct.entries())
            .map(([id, v]) => ({ productId: id, ...v }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        if (ranked.length === 0) {
            return {
                speech: `No sales found in the last ${days} days.`,
                action: 'cstore_top_products', data: { days, results: [] }
            };
        }
        const top = ranked[0];
        const speech = ranked.length === 1
            ? `Your top product the last ${days} days is ${top.name} at $${top.revenue.toFixed(2)}.`
            : `Top ${ranked.length} the last ${days} days: ` +
              ranked.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} $${r.revenue.toFixed(0)}`).join(', ') + '.';

        return {
            speech, action: 'cstore_top_products',
            data: {
                days,
                results: ranked.map(r => ({
                    productId: r.productId, name: r.name,
                    revenue: r.revenue, units: r.units, citations: r.citations
                }))
            }
        };
    }

    if (call.name === 'cstore_low_stock') {
        const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const products = await prisma.product.findMany({
            where: { storeId, isActive: true },
            include: {
                inventorySnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
                saleItems: {
                    where: { sale: { dateTime: { gte: thirty } } },
                    include: { sale: { select: { id: true, dateTime: true } } }
                }
            }
        });

        const flagged = [];
        for (const p of products) {
            const stock = p.inventorySnapshots[0]?.quantityOnHand ?? p.initialStock ?? 0;
            const sold = p.saleItems.reduce((s, i) => s + i.quantity, 0);
            const dailyRate = sold / 30;
            if (dailyRate < 0.3) continue;
            const daysLeft = stock / dailyRate;
            if (daysLeft >= 5 || stock <= 0) continue;
            flagged.push({
                productId: p.id, name: p.name, currentStock: stock,
                dailyRate, daysLeft,
                citations: p.saleItems.slice(-15).map(i => ({
                    saleId: i.sale.id, productId: p.id,
                    dateTime: i.sale.dateTime.toISOString(), amount: i.lineTotal
                }))
            });
        }
        flagged.sort((a, b) => a.daysLeft - b.daysLeft);
        const top = flagged.slice(0, 8);

        if (top.length === 0) {
            return { speech: 'Nothing is running low right now.', action: 'cstore_low_stock', data: { results: [] } };
        }
        const speech = top.length === 1
            ? `${top[0].name} is low — about ${top[0].daysLeft.toFixed(1)} days left.`
            : `${top.length} items are running low. Most urgent: ${top.slice(0, 3).map(r => `${r.name} (${r.daysLeft.toFixed(1)} days)`).join(', ')}.`;
        return { speech, action: 'cstore_low_stock', data: { results: top } };
    }

    if (call.name === 'cstore_margin_compressed') {
        const minDrop = clampNum(call.args?.minDropPercent, 3, 0.5, 50);
        const sixty = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

        const products = await prisma.product.findMany({
            where: { storeId, isActive: true, costPrice: { gt: 0 }, sellingPrice: { gt: 0 } },
            include: {
                invoiceItems: {
                    orderBy: { invoice: { createdAt: 'desc' } },
                    take: 5,
                    include: { invoice: { select: { id: true, createdAt: true, supplierName: true } } }
                },
                saleItems: {
                    where: { sale: { dateTime: { gte: sixty } } },
                    take: 10, orderBy: { sale: { dateTime: 'desc' } },
                    include: { sale: { select: { id: true, dateTime: true } } }
                }
            }
        });

        const flagged = [];
        for (const p of products) {
            if (p.invoiceItems.length < 2) continue;
            const newest = p.invoiceItems[0];
            const prior = p.invoiceItems.find(it => it.unitCost !== newest.unitCost);
            if (!prior) continue;
            if (newest.unitCost <= prior.unitCost) continue;
            const oldMargin = ((p.sellingPrice - prior.unitCost) / p.sellingPrice) * 100;
            const newMargin = ((p.sellingPrice - newest.unitCost) / p.sellingPrice) * 100;
            const drop = oldMargin - newMargin;
            if (drop < minDrop) continue;
            flagged.push({
                productId: p.id, name: p.name,
                priorCost: prior.unitCost, newCost: newest.unitCost,
                sellingPrice: p.sellingPrice,
                priorMarginPct: oldMargin, newMarginPct: newMargin, marginDropPct: drop,
                citations: [
                    { saleId: newest.invoice.id, productId: p.id, dateTime: newest.invoice.createdAt.toISOString(), amount: newest.unitCost },
                    ...p.saleItems.map(i => ({ saleId: i.sale.id, productId: p.id, dateTime: i.sale.dateTime.toISOString(), amount: i.lineTotal }))
                ]
            });
        }
        flagged.sort((a, b) => b.marginDropPct - a.marginDropPct);
        const top = flagged.slice(0, 10);

        if (top.length === 0) {
            return { speech: `No margin compression detected above ${minDrop}%.`, action: 'cstore_margin_compressed', data: { results: [] } };
        }
        const worst = top[0];
        const speech = `${top.length} item${top.length === 1 ? '' : 's'} lost margin. Worst: ${worst.name}, margin down ${worst.marginDropPct.toFixed(1)} points (cost $${worst.priorCost.toFixed(2)} to $${worst.newCost.toFixed(2)}, retail still $${worst.sellingPrice.toFixed(2)}).`;
        return { speech, action: 'cstore_margin_compressed', data: { results: top } };
    }

    if (call.name === 'cstore_revenue_summary') {
        const days = clampInt(call.args?.days, 7, 1, 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const priorSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

        const [thisPeriod, priorPeriod] = await Promise.all([
            prisma.sale.findMany({
                where: { storeId, dateTime: { gte: since } },
                select: { id: true, dateTime: true, totalAmount: true },
                orderBy: { dateTime: 'desc' }
            }),
            prisma.sale.aggregate({
                where: { storeId, dateTime: { gte: priorSince, lt: since } },
                _sum: { totalAmount: true }, _count: { _all: true }
            })
        ]);

        const revenue = thisPeriod.reduce((s, x) => s + x.totalAmount, 0);
        const txCount = thisPeriod.length;
        const avgTicket = txCount > 0 ? revenue / txCount : 0;
        const priorRevenue = priorPeriod._sum.totalAmount || 0;
        const change = priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : 0;

        const speech = txCount === 0
            ? `No sales in the last ${days} days.`
            : `Last ${days} days: $${revenue.toFixed(0)} on ${txCount} transactions, average ticket $${avgTicket.toFixed(2)}. ${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change).toFixed(1)}% vs the prior period.`;

        return {
            speech, action: 'cstore_revenue_summary',
            data: {
                days, revenue, transactionCount: txCount, averageTicket: avgTicket,
                priorRevenue, changePct: change,
                citations: thisPeriod.slice(0, 50).map(s => ({
                    saleId: s.id, dateTime: s.dateTime.toISOString(), amount: s.totalAmount
                }))
            }
        };
    }

    if (call.name === 'cstore_vendor_performance') {
        const days = clampInt(call.args?.days, 30, 1, 90);
        const vendorFilter = call.args?.vendor ? String(call.args.vendor).toLowerCase() : null;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const items = await prisma.saleItem.findMany({
            where: { sale: { storeId, dateTime: { gte: since } } },
            include: {
                product: { select: { id: true, name: true, vendor: true } },
                sale: { select: { id: true, dateTime: true } }
            }
        });

        const byVendor = new Map<string, { revenue: number; units: number; productCount: Set<string>; citations: CStoreCitation[] }>();
        for (const i of items) {
            const v = i.product.vendor;
            if (!v) continue;
            if (vendorFilter && !v.toLowerCase().includes(vendorFilter)) continue;
            const cur = byVendor.get(v) || { revenue: 0, units: 0, productCount: new Set(), citations: [] };
            cur.revenue += i.lineTotal;
            cur.units += i.quantity;
            cur.productCount.add(i.product.id);
            if (cur.citations.length < 20) {
                cur.citations.push({
                    saleId: i.sale.id, productId: i.product.id,
                    dateTime: i.sale.dateTime.toISOString(), amount: i.lineTotal
                });
            }
            byVendor.set(v, cur);
        }
        const ranked = Array.from(byVendor.entries())
            .map(([name, v]) => ({ vendor: name, revenue: v.revenue, units: v.units, distinctProducts: v.productCount.size, citations: v.citations }))
            .sort((a, b) => b.revenue - a.revenue);

        if (ranked.length === 0) {
            const what = vendorFilter ? `vendor matching "${vendorFilter}"` : 'vendor sales';
            return { speech: `No ${what} found in the last ${days} days.`, action: 'cstore_vendor_performance', data: { results: [] } };
        }
        const top = ranked[0];
        const speech = vendorFilter
            ? `${top.vendor}: $${top.revenue.toFixed(0)} on ${top.units} units across ${top.distinctProducts} SKUs the last ${days} days.`
            : `Top vendor the last ${days} days: ${top.vendor} at $${top.revenue.toFixed(0)}. ${ranked.length > 1 ? `${ranked.length - 1} others with sales.` : ''}`;

        return { speech, action: 'cstore_vendor_performance', data: { days, results: ranked.slice(0, 10) } };
    }

    return { speech: 'I did not understand that c-store query.', action: 'unrecognized' };
}
