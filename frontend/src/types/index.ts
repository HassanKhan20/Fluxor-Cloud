export interface AISuggestion<T> {
    value: T;
    confidence: number; // 0-100
    reason: string;
}

export interface ProductAISuggestions {
    suggestedName?: AISuggestion<string>;
    suggestedCategory?: AISuggestion<string>;
    suggestedMinStock?: AISuggestion<number>;
    suggestedPrice?: AISuggestion<number>;
    daysUntilStockout?: number | null;
    revenueAtRisk?: number;
    salesVelocity?: number; // units per day
}

export interface Product {
    id: string;
    name: string;
    barcode: string;
    sku?: string;
    sellingPrice: number;
    costPrice: number;
    category: string;
    vendor?: string;
    isActive: boolean;
    initialStock?: number | null;
    isUnmatched?: boolean;
    inventorySnapshots: { quantityOnHand: number }[];
    // AI-generated suggestions (client-side for MVP)
    aiSuggestions?: ProductAISuggestions;
}

export interface Invoice {
    id: string;
    supplierName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items?: InvoiceItem[];
}

export interface InvoiceItem {
    id: string;
    rawDescription: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
}

export interface DashboardStats {
    totalRevenue: number;
    salesCount: number;
    lowStockCount: number;
    chartData: { date: string; amount: number }[];
    // Accurate comparison fields (null when no data)
    revenueChange?: number | null;
    salesCountChange?: number | null;
    yesterdayRevenue?: number;
    hasInventorySetupNeeded?: boolean;
    unmatchedCount?: number;
    avgTransaction?: number;
    productsWithoutStock?: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

// ==================== NEW TYPES FOR PRIORITY 1 FEATURES ====================

// Alert types for notification system
export interface Alert {
    id: string;
    type: 'low_stock' | 'overstock' | 'vendor_drop' | 'sales_decline' | 'pricing_risk';
    priority: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    action: string;
    productId?: string;
    vendorName?: string;
    isRead: boolean;
    createdAt: string;
}

// Weekly summary for owner dashboard
export interface WeeklySummary {
    id: string;
    weekStart: string;
    weekEnd: string;
    revenue: {
        amount: number;
        change: number;
        changePercent: number;
    };
    moneyWasted: {
        total: number;
        primaryReason: string;
    };
    topProduct: {
        id: string;
        name: string;
        revenue: number;
    } | null;
    worstPerformer: {
        id: string;
        name: string;
        type: 'product' | 'vendor';
        reason: string;
    } | null;
    recommendations: string[];
}

// Vendor scorecard for vendor intelligence
export interface VendorScorecard {
    vendorName: string;
    productCount: number;
    revenue: number;
    profit: number;
    marginPercent: number;
    inventoryDays: number;
    wasteContribution: number;
    overallScore: number;
    rating: 'green' | 'yellow' | 'red';
    trend: 'up' | 'down' | 'stable';
}

// Money wasted breakdown
export interface MoneyWastedBreakdown {
    total: number;
    breakdown: {
        deadStock: { amount: number; productCount: number };
        overstock: { amount: number; productCount: number };
        slowMovers: { amount: number; productCount: number };
        shrinkLoss: { amount: number; productCount: number };
    };
    topCauses: Array<{
        description: string;
        amount: number;
        action: string;
        productIds?: string[];
    }>;
    explanation: string;
}


