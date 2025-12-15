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

