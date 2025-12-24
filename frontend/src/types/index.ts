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
    sellingPrice: number;
    costPrice: number;
    category: string;
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

