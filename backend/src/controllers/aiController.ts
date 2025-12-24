import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get store ID from token (reusing existing pattern)
const getStoreId = async (req: Request): Promise<string | null> => {
    // Auth middleware sets req.user with { userId, email }
    const user = (req as any).user;
    const userId = user?.userId;
    if (!userId) return null;

    const membership = await prisma.storeMembership.findFirst({
        where: { userId },
        select: { storeId: true }
    });
    return membership?.storeId || null;
};

// Build context about the store for the AI
const buildStoreContext = async (storeId: string) => {
    const [products, lowStockProducts, recentSales] = await Promise.all([
        prisma.product.count({ where: { storeId } }),
        prisma.product.findMany({
            where: {
                storeId,
                inventorySnapshots: {
                    some: {
                        quantityOnHand: { lte: 10 }
                    }
                }
            },
            take: 5,
            select: { name: true }
        }),
        prisma.sale.count({
            where: {
                storeId,
                dateTime: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        })
    ]);

    return {
        totalProducts: products,
        lowStockItems: lowStockProducts.map(p => p.name),
        salesLast7Days: recentSales
    };
};

// Chat endpoint - talks to Ollama
export const chat = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const storeId = await getStoreId(req);
        let storeContext = {};

        if (storeId) {
            storeContext = await buildStoreContext(storeId);
        }

        const systemPrompt = `You are Fluxor AI, a helpful assistant for convenience store owners. You help with inventory management, sales analysis, and operational decisions.

Current store context:
${JSON.stringify(storeContext, null, 2)}

Guidelines:
- Be concise and actionable
- Use **bold** for important terms and numbers
- Use bullet points (•) for lists
- Keep responses under 100 words
- Focus on inventory, sales, and operations
- Suggest specific actions when possible`;

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
                    source: 'ollama'
                });
            }
        } catch (ollamaError) {
            console.log('Ollama not available, using fallback');
        }

        // Fallback: Simple rule-based responses when Ollama is not running
        const fallbackResponse = generateFallbackResponse(message, storeContext);
        return res.json({
            reply: fallbackResponse,
            source: 'fallback'
        });

    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: 'AI service error' });
    }
};

// Fallback responses when Ollama is not available
function generateFallbackResponse(message: string, context: any): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('low stock') || lowerMessage.includes('restock')) {
        if (context.lowStockItems?.length > 0) {
            return `You have ${context.lowStockItems.length} items running low: ${context.lowStockItems.join(', ')}. I recommend placing a restock order soon to avoid stockouts.`;
        }
        return "Your inventory levels look healthy! No items are critically low right now.";
    }

    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
        return `You've had ${context.salesLast7Days || 0} sales in the last 7 days. To see detailed analytics, check the Sales Import section to ensure all your data is up to date.`;
    }

    if (lowerMessage.includes('inventory') || lowerMessage.includes('product')) {
        return `You currently have ${context.totalProducts || 0} products in your inventory. Visit the Inventory section to manage stock levels and set up reorder alerts.`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
        return "I can help you with: checking low stock items, analyzing sales trends, managing inventory, and providing operational insights. Try asking 'What items are low on stock?' or 'How are my sales doing?'";
    }

    return "I'm here to help with your store operations! Try asking about inventory levels, low stock items, or sales performance. Note: For full AI capabilities, make sure Ollama is running locally.";
}

// Health check for AI service
export const healthCheck = async (_req: Request, res: Response) => {
    try {
        const ollamaCheck = await fetch('http://localhost:11434/api/tags', {
            method: 'GET'
        });

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
        message: 'Ollama not detected. Using fallback responses. Run "ollama serve" to enable full AI.'
    });
};
