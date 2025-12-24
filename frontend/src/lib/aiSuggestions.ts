import type { Product, ProductAISuggestions } from '@/types';

// Common product name patterns for smart matching
const KNOWN_PRODUCTS: Record<string, { name: string; category: string; avgPrice: number }> = {
    'coke': { name: 'Coca-Cola', category: 'Beverages', avgPrice: 2.49 },
    'coca': { name: 'Coca-Cola', category: 'Beverages', avgPrice: 2.49 },
    'pepsi': { name: 'Pepsi', category: 'Beverages', avgPrice: 2.49 },
    'sprite': { name: 'Sprite', category: 'Beverages', avgPrice: 2.49 },
    'water': { name: 'Bottled Water', category: 'Beverages', avgPrice: 1.99 },
    'chip': { name: 'Chips', category: 'Snacks', avgPrice: 3.99 },
    'doritos': { name: 'Doritos', category: 'Snacks', avgPrice: 4.49 },
    'candy': { name: 'Candy', category: 'Snacks', avgPrice: 1.99 },
    'snickers': { name: 'Snickers Bar', category: 'Snacks', avgPrice: 1.79 },
    'redbull': { name: 'Red Bull', category: 'Energy Drinks', avgPrice: 3.99 },
    'monster': { name: 'Monster Energy', category: 'Energy Drinks', avgPrice: 3.49 },
    'bread': { name: 'Bread', category: 'Grocery', avgPrice: 3.99 },
    'milk': { name: 'Milk', category: 'Dairy', avgPrice: 4.99 },
    'beer': { name: 'Beer', category: 'Alcohol', avgPrice: 9.99 },
    'wine': { name: 'Wine', category: 'Alcohol', avgPrice: 12.99 },
    'cigarette': { name: 'Cigarettes', category: 'Tobacco', avgPrice: 8.99 },
    'lottery': { name: 'Lottery Ticket', category: 'Lottery', avgPrice: 5.00 },
};

const CATEGORIES = ['Beverages', 'Snacks', 'Grocery', 'Dairy', 'Tobacco', 'Alcohol', 'Energy Drinks', 'Lottery', 'Other'];

/**
 * Generate AI suggestions for a product based on heuristics
 * For MVP: client-side only, designed for easy backend swap later
 */
export function generateAISuggestions(product: Product): ProductAISuggestions {
    const suggestions: ProductAISuggestions = {};
    const nameLower = (product.name || '').toLowerCase();
    const barcode = product.barcode || '';

    // 1. Suggest name improvements for unmatched/raw products
    if (product.isUnmatched || !product.name || product.name.length < 3) {
        const match = findProductMatch(nameLower);
        if (match) {
            suggestions.suggestedName = {
                value: match.name,
                confidence: calculateNameConfidence(nameLower, match.name),
                reason: 'Based on product name pattern'
            };
        }
    }

    // 2. Suggest category if missing
    if (!product.category || product.category === '') {
        const match = findProductMatch(nameLower);
        if (match) {
            suggestions.suggestedCategory = {
                value: match.category,
                confidence: 85,
                reason: 'Based on similar products in your inventory'
            };
        } else {
            // Default suggestion
            suggestions.suggestedCategory = {
                value: 'Other',
                confidence: 40,
                reason: 'Could not determine category automatically'
            };
        }
    }

    // 3. Suggest minimum stock based on "sales velocity"
    const currentStock = product.inventorySnapshots?.[0]?.quantityOnHand ?? product.initialStock ?? 0;
    const salesVelocity = estimateSalesVelocity(product);
    suggestions.salesVelocity = salesVelocity;

    if (product.initialStock === null || product.initialStock === undefined) {
        // Suggest initial stock
        const suggestedStock = Math.max(Math.round(salesVelocity * 7), 6); // 1 week buffer minimum
        suggestions.suggestedMinStock = {
            value: suggestedStock,
            confidence: salesVelocity > 0 ? 75 : 50,
            reason: salesVelocity > 0
                ? `Based on ~${salesVelocity.toFixed(1)} units sold per day`
                : 'Recommended minimum for new products'
        };
    }

    // 4. Calculate days until stockout
    if (currentStock > 0 && salesVelocity > 0) {
        suggestions.daysUntilStockout = Math.round(currentStock / salesVelocity);
    }

    // 5. Calculate revenue at risk
    if (suggestions.daysUntilStockout !== undefined && suggestions.daysUntilStockout <= 7) {
        const dailyRevenue = salesVelocity * (product.sellingPrice || 0);
        suggestions.revenueAtRisk = Math.round(dailyRevenue * (7 - suggestions.daysUntilStockout));
    }

    // 6. Suggest price if zero or missing
    if (!product.sellingPrice || product.sellingPrice === 0) {
        const match = findProductMatch(nameLower);
        if (match) {
            suggestions.suggestedPrice = {
                value: match.avgPrice,
                confidence: 70,
                reason: 'Based on similar products'
            };
        }
    }

    return suggestions;
}

/**
 * Find a matching known product pattern
 */
function findProductMatch(nameLower: string): { name: string; category: string; avgPrice: number } | null {
    for (const [key, data] of Object.entries(KNOWN_PRODUCTS)) {
        if (nameLower.includes(key)) {
            return data;
        }
    }
    return null;
}

/**
 * Calculate confidence for name suggestion
 */
function calculateNameConfidence(original: string, suggested: string): number {
    const originalLower = original.toLowerCase();
    const suggestedLower = suggested.toLowerCase();

    // Exact contains = high confidence
    if (suggestedLower.includes(originalLower) || originalLower.includes(suggestedLower)) {
        return 92;
    }

    // Partial match
    const words = originalLower.split(/\s+/);
    const matchedWords = words.filter(w => suggestedLower.includes(w));
    if (matchedWords.length > 0) {
        return 70 + (matchedWords.length / words.length) * 20;
    }

    return 60;
}

/**
 * Estimate sales velocity (units per day) - mock for MVP
 */
function estimateSalesVelocity(product: Product): number {
    // In a real system, this would query sale history
    // For MVP, generate plausible values based on product characteristics
    const nameLower = (product.name || '').toLowerCase();

    // High-velocity items
    if (nameLower.includes('coke') || nameLower.includes('water') || nameLower.includes('cigarette')) {
        return 4 + Math.random() * 3;
    }
    // Medium velocity
    if (nameLower.includes('chip') || nameLower.includes('candy') || nameLower.includes('energy')) {
        return 2 + Math.random() * 2;
    }
    // Default low velocity
    return 0.5 + Math.random() * 1.5;
}

/**
 * Get confidence level category
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 85) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
}

/**
 * Get confidence display props
 */
export function getConfidenceDisplay(confidence: number): {
    color: string;
    bgColor: string;
    label: string;
    textColor: string;
} {
    if (confidence >= 85) {
        return {
            color: 'rgb(34, 197, 94)',
            bgColor: 'rgba(34, 197, 94, 0.1)',
            label: 'High confidence',
            textColor: 'rgb(22, 163, 74)'
        };
    }
    if (confidence >= 60) {
        return {
            color: 'rgb(234, 179, 8)',
            bgColor: 'rgba(234, 179, 8, 0.1)',
            label: 'Review suggested',
            textColor: 'rgb(161, 98, 7)'
        };
    }
    return {
        color: 'rgb(156, 163, 175)',
        bgColor: 'rgba(156, 163, 175, 0.1)',
        label: 'Needs input',
        textColor: 'rgb(107, 114, 128)'
    };
}

/**
 * Enrich products with AI suggestions
 */
export function enrichProductsWithAI(products: Product[]): Product[] {
    return products.map(product => ({
        ...product,
        aiSuggestions: generateAISuggestions(product)
    }));
}

/**
 * Categorize products for exception dashboard
 */
export function categorizeProducts(products: Product[]): {
    needsReview: Product[];
    lowStock: Product[];
    healthy: Product[];
    totalRevenueAtRisk: number;
} {
    const enriched = enrichProductsWithAI(products);

    const needsReview = enriched.filter(p =>
        p.isUnmatched ||
        !p.category ||
        p.initialStock === null ||
        p.initialStock === undefined ||
        !p.sellingPrice ||
        p.sellingPrice === 0
    );

    const lowStock = enriched.filter(p => {
        const days = p.aiSuggestions?.daysUntilStockout;
        return days !== null && days !== undefined && days <= 7;
    });

    const healthy = enriched.filter(p =>
        !needsReview.includes(p) && !lowStock.includes(p)
    );

    const totalRevenueAtRisk = lowStock.reduce(
        (sum, p) => sum + (p.aiSuggestions?.revenueAtRisk || 0),
        0
    );

    return { needsReview, lowStock, healthy, totalRevenueAtRisk };
}
