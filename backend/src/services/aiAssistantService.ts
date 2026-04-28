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

export async function pickTool(transcript: string): Promise<ToolCall> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const systemPrompt = `You are the voice assistant for Fluxor Cloud, a retirement-home kitchen-management app.
You help kitchen staff log meals and check inventory by voice.
Always pick exactly ONE tool from the provided list — never answer in free-form text.
If you cannot map the request to a tool, call "unrecognized" with a short clarifying message.
Be concise. Default servings=1 unless otherwise stated.`;

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
            tools: TOOLS,
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

    return { speech: 'Sorry, I did not understand that command.', action: 'unrecognized' };
}
