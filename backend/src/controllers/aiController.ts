import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get store ID from token
const getStoreId = async (req: Request): Promise<string | null> => {
    const user = (req as any).user;
    const userId = user?.userId;
    if (!userId) return null;

    const membership = await prisma.storeMembership.findFirst({
        where: { userId },
        select: { storeId: true }
    });
    return membership?.storeId || null;
};

// Holiday detection
const getHolidayContext = (): { isNearHoliday: boolean; holiday: string | null; daysAway: number } => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const holidays = [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 2, day: 14, name: "Valentine's Day" },
        { month: 5, day: 27, name: "Memorial Day" }, // Approximate
        { month: 7, day: 4, name: "Independence Day" },
        { month: 9, day: 2, name: "Labor Day" }, // Approximate
        { month: 10, day: 31, name: "Halloween" },
        { month: 11, day: 28, name: "Thanksgiving" }, // Approximate
        { month: 12, day: 25, name: "Christmas" },
        { month: 12, day: 31, name: "New Year's Eve" }
    ];

    for (const h of holidays) {
        const holidayDate = new Date(now.getFullYear(), h.month - 1, h.day);
        const diffDays = Math.floor((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= -3 && diffDays <= 7) {
            return { isNearHoliday: true, holiday: h.name, daysAway: diffDays };
        }
    }

    return { isNearHoliday: false, holiday: null, daysAway: 0 };
};

// Build enhanced store context with patterns
const buildStoreContext = async (storeId: string) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [products, lowStockProducts, thisWeekSales, lastWeekSales, saleItems] = await Promise.all([
        prisma.product.count({ where: { storeId } }),
        prisma.product.findMany({
            where: {
                storeId,
                inventorySnapshots: { some: { quantityOnHand: { lte: 10 } } }
            },
            take: 5,
            select: { name: true, category: true }
        }),
        prisma.saleItem.findMany({
            where: { sale: { storeId, dateTime: { gte: sevenDaysAgo } } },
            select: { quantity: true, unitPrice: true }
        }),
        prisma.saleItem.findMany({
            where: {
                sale: {
                    storeId,
                    dateTime: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
                }
            },
            select: { quantity: true, unitPrice: true }
        }),
        prisma.saleItem.findMany({
            where: { sale: { storeId, dateTime: { gte: thirtyDaysAgo } } },
            include: {
                product: { select: { name: true, category: true } },
                sale: { select: { dateTime: true } }
            }
        })
    ]);

    // Calculate metrics
    const thisWeekRevenue = thisWeekSales.reduce((sum, si) => sum + (si.quantity * si.unitPrice), 0);
    const lastWeekRevenue = lastWeekSales.reduce((sum, si) => sum + (si.quantity * si.unitPrice), 0);
    const revenueChange = lastWeekRevenue > 0
        ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
        : null;

    // Detect patterns
    const patterns: string[] = [];

    if (revenueChange !== null) {
        if (revenueChange < -15) patterns.push('significant_sales_drop');
        else if (revenueChange < -5) patterns.push('slight_sales_drop');
        else if (revenueChange > 15) patterns.push('significant_sales_spike');
        else if (revenueChange > 5) patterns.push('slight_sales_increase');
    }

    if (lowStockProducts.length > 3) patterns.push('multiple_low_stock');
    if (lowStockProducts.length > 0) patterns.push('has_low_stock');

    // Find slow movers (products with low sales this week)
    const productSales: Record<string, number> = {};
    saleItems.filter(si => new Date(si.sale.dateTime) >= sevenDaysAgo).forEach(si => {
        const name = si.product.name;
        productSales[name] = (productSales[name] || 0) + si.quantity;
    });

    const slowMovers = Object.entries(productSales)
        .filter(([_, qty]) => qty <= 1)
        .slice(0, 3)
        .map(([name]) => name);

    if (slowMovers.length > 0) patterns.push('has_slow_movers');

    const holidayContext = getHolidayContext();

    return {
        totalProducts: products,
        lowStockItems: lowStockProducts.map(p => p.name),
        lowStockCategories: [...new Set(lowStockProducts.map(p => p.category).filter(Boolean))],
        thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
        lastWeekRevenue: Math.round(lastWeekRevenue * 100) / 100,
        revenueChange,
        patterns,
        slowMovers,
        holidayContext
    };
};

// Generate WHY explanations based on patterns
function generateExplanation(context: any): string {
    const explanations: string[] = [];
    const { patterns, revenueChange, holidayContext, lowStockItems, slowMovers } = context;

    // Revenue explanations
    if (patterns.includes('significant_sales_drop')) {
        let reason = `**Sales dropped ${Math.abs(revenueChange)}%** this week compared to last week.`;

        if (holidayContext.isNearHoliday) {
            if (holidayContext.daysAway < 0) {
                reason += ` This often happens after ${holidayContext.holiday} as customers bought extra beforehand.`;
            } else {
                reason += ` With ${holidayContext.holiday} coming up, customers may be waiting to shop closer to the holiday.`;
            }
        } else {
            reason += ` This could be due to weather, local events, or normal weekly variation.`;
        }
        reason += ` Consider a small promotion to bring traffic back.`;
        explanations.push(reason);
    } else if (patterns.includes('significant_sales_spike')) {
        let reason = `**Sales are up ${revenueChange}%** this week! Great momentum.`;
        if (holidayContext.isNearHoliday) {
            reason += ` ${holidayContext.holiday} season is likely driving extra traffic.`;
        }
        explanations.push(reason);
    }

    // Low stock explanations
    if (patterns.includes('multiple_low_stock')) {
        explanations.push(`**${lowStockItems.length} items are running low**: ${lowStockItems.join(', ')}. Consider placing a restock order soon to avoid losing sales.`);
    } else if (patterns.includes('has_low_stock')) {
        explanations.push(`**${lowStockItems[0]}** is running low. Keep an eye on it to avoid stockouts.`);
    }

    // Slow movers
    if (patterns.includes('has_slow_movers') && slowMovers.length > 0) {
        explanations.push(`**Slow movers this week**: ${slowMovers.join(', ')}. These items haven't sold much recently — consider moving them to a more visible spot or running a discount.`);
    }

    if (explanations.length === 0) {
        return "Your store is running smoothly! No unusual patterns detected this week.";
    }

    return explanations.join('\n\n');
}

// Chat endpoint with enhanced context
export const chat = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const storeId = await getStoreId(req);
        let storeContext: any = {};

        if (storeId) {
            storeContext = await buildStoreContext(storeId);
        }

        // Generate proactive explanation
        const proactiveExplanation = generateExplanation(storeContext);

        const systemPrompt = `You are Fluxor AI, a helpful assistant for convenience store owners. Your role is to EXPLAIN patterns and SUGGEST actions.

Current store context:
${JSON.stringify(storeContext, null, 2)}

Key insights to mention:
${proactiveExplanation}

Guidelines:
- **ALWAYS explain WHY** something is happening, not just the numbers
- Use **bold** for important terms and numbers
- Be concise (under 100 words)
- Suggest specific actions
- If near a holiday, mention how it affects sales patterns
- Focus on what the owner should DO next`;

        // Try Ollama first
        try {
            const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    stream: false
                })
            });

            if (ollamaResponse.ok) {
                const data = await ollamaResponse.json();
                return res.json({
                    reply: data.message?.content || 'No response generated',
                    source: 'ollama',
                    context: { patterns: storeContext.patterns, holidayContext: storeContext.holidayContext }
                });
            }
        } catch (ollamaError) {
            console.log('Ollama not available, using fallback');
        }

        // Enhanced fallback with explanations
        const fallbackResponse = generateFallbackResponse(message, storeContext, proactiveExplanation);
        return res.json({
            reply: fallbackResponse,
            source: 'fallback',
            context: { patterns: storeContext.patterns, holidayContext: storeContext.holidayContext }
        });

    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: 'AI service error' });
    }
};

// Enhanced fallback with WHY explanations
function generateFallbackResponse(message: string, context: any, proactiveExplanation: string): string {
    const lowerMessage = message.toLowerCase();

    // WHY questions get proactive explanations
    if (lowerMessage.includes('why') || lowerMessage.includes('explain') || lowerMessage.includes('what happened')) {
        return proactiveExplanation || "I don't see any unusual patterns right now. Your store seems to be running normally.";
    }

    if (lowerMessage.includes('low stock') || lowerMessage.includes('restock') || lowerMessage.includes('running out')) {
        if (context.lowStockItems?.length > 0) {
            let response = `**${context.lowStockItems.length} items are running low**: ${context.lowStockItems.join(', ')}.`;
            if (context.holidayContext?.isNearHoliday) {
                response += ` With ${context.holidayContext.holiday} coming, these items may sell faster than usual. Consider restocking sooner.`;
            } else {
                response += ` I recommend placing a restock order within the next few days to avoid stockouts.`;
            }
            return response;
        }
        return "**Good news!** Your inventory levels look healthy right now. No items are critically low.";
    }

    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('money')) {
        let response = `**This week**: $${context.thisWeekRevenue || 0} in revenue.`;
        if (context.revenueChange !== null) {
            const direction = context.revenueChange > 0 ? 'up' : 'down';
            response += ` That's **${direction} ${Math.abs(context.revenueChange)}%** from last week ($${context.lastWeekRevenue}).`;

            if (context.holidayContext?.isNearHoliday) {
                response += ` ${context.holidayContext.holiday} season may be affecting shopping patterns.`;
            }
        }
        return response;
    }

    if (lowerMessage.includes('slow') || lowerMessage.includes('not selling') || lowerMessage.includes('dead stock')) {
        if (context.slowMovers?.length > 0) {
            return `**Slow movers this week**: ${context.slowMovers.join(', ')}. These items haven't sold much recently. Consider moving them to a more visible location or offering a small discount.`;
        }
        return "All your products seem to be moving at a healthy pace. No slow movers detected this week.";
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
        return "I can help you understand **why** things are happening in your store:\n\n• Ask **'Why are sales down?'** to understand patterns\n• Ask **'What's running low?'** for stock alerts\n• Ask **'What's not selling?'** for slow movers\n• Ask **'How am I doing?'** for a quick summary";
    }

    // Default: give a summary with explanations
    return proactiveExplanation || `You have **${context.totalProducts || 0} products** in inventory. Ask me about sales trends, low stock items, or slow movers!`;
}

// New endpoint: Explain a specific metric
export const explain = async (req: Request, res: Response) => {
    try {
        const storeId = await getStoreId(req);
        if (!storeId) return res.status(403).json({ error: 'No store found' });

        const context = await buildStoreContext(storeId);
        const explanation = generateExplanation(context);

        res.json({
            explanation,
            patterns: context.patterns,
            metrics: {
                thisWeekRevenue: context.thisWeekRevenue,
                lastWeekRevenue: context.lastWeekRevenue,
                revenueChange: context.revenueChange,
                lowStockCount: context.lowStockItems.length,
                slowMoversCount: context.slowMovers.length
            },
            holidayContext: context.holidayContext
        });
    } catch (error) {
        console.error('AI explain error:', error);
        res.status(500).json({ error: 'Failed to generate explanation' });
    }
};

// Health check for AI service
export const healthCheck = async (_req: Request, res: Response) => {
    try {
        const ollamaCheck = await fetch('http://localhost:11434/api/tags', { method: 'GET' });

        if (ollamaCheck.ok) {
            const data = await ollamaCheck.json();
            return res.json({
                status: 'online',
                provider: 'ollama',
                models: data.models?.map((m: any) => m.name) || []
            });
        }
    } catch {
        // Ollama not available
    }

    res.json({
        status: 'fallback',
        provider: 'rule-based',
        message: 'Ollama not detected. Using enhanced fallback with explanations.'
    });
};
