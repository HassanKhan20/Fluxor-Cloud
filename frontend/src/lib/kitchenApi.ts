// Thin wrapper over the kitchen API endpoints.
// All calls require an auth token; we pull it from localStorage.

import { api } from './api';

const tok = () => localStorage.getItem('token') || '';

export interface MenuItemRecipe {
    id?: string;
    productId: string;
    qtyPerServing: number;
    unit: string;
    notes?: string | null;
    product?: { id: string; name: string; unit?: string | null; costPrice?: number };
}

export interface MenuItem {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    defaultServings: number;
    isActive: boolean;
    version: number;
    recipes: MenuItemRecipe[];
}

export interface MealPlan {
    id: string;
    storeId: string;
    date: string;
    menuItemId: string;
    plannedServings: number;
    actualServings: number | null;
    notes: string | null;
    menuItem?: { id: string; name: string; category: string | null };
}

export interface Vendor {
    id: string;
    name: string;
    contactEmail: string | null;
    contactPhone: string | null;
    autoSendEnabled: boolean;
    leadTimeDays: number;
    minOrderValue: number | null;
    notes: string | null;
    _count?: { products: number; purchaseOrders: number };
}

export interface PurchaseOrderItem {
    id: string;
    productId: string;
    productName: string;
    qty: number;
    unit: string;
    unitCost: number;
    lineTotal: number;
    caseSize: number | null;
}

export interface PurchaseOrder {
    id: string;
    weekStart: string;
    weekEnd: string;
    status: string;
    totalAmount: number;
    emailedAt: string | null;
    emailedTo: string | null;
    failureReason: string | null;
    vendor: { id: string; name: string; contactEmail: string | null; autoSendEnabled?: boolean };
    items: PurchaseOrderItem[];
}

export interface ForecastResult {
    storeId: string;
    weekStart: string;
    weekEnd: string;
    plannedServings: number;
    bufferApplied: number;
    drafts: {
        vendorId: string;
        vendorName: string;
        contactEmail: string | null;
        autoSendEnabled: boolean;
        meetsMinimum: boolean;
        totalAmount: number;
        items: any[];
    }[];
    skippedItems: { productId: string; productName: string; reason: string }[];
}

export const kitchenApi = {
    // Config
    getConfig: () => api.get('/kitchen/config', tok()),
    updateConfig: (body: any) => api.patch('/kitchen/config', body, tok()),

    // Vendors
    listVendors: () => api.get('/kitchen/vendors', tok()) as Promise<{ vendors: Vendor[] }>,
    createVendor: (body: any) => api.post('/kitchen/vendors', body, tok()),
    updateVendor: (id: string, body: any) => api.patch(`/kitchen/vendors/${id}`, body, tok()),

    // Menu items
    listMenuItems: () => api.get('/kitchen/menu-items', tok()) as Promise<{ menuItems: MenuItem[] }>,
    createMenuItem: (body: any) => api.post('/kitchen/menu-items', body, tok()),
    updateMenuItem: (id: string, body: any) => api.patch(`/kitchen/menu-items/${id}`, body, tok()),
    deleteMenuItem: (id: string) => api.delete(`/kitchen/menu-items/${id}`, tok()),

    // Meal plans
    listMealPlans: (weekStart: string) =>
        api.get(`/kitchen/meal-plans?weekStart=${weekStart}`, tok()) as Promise<{ plans: MealPlan[]; weekStart: string; weekEnd: string }>,
    upsertMealPlan: (body: any) => api.post('/kitchen/meal-plans', body, tok()),
    deleteMealPlan: (id: string) => api.delete(`/kitchen/meal-plans/${id}`, tok()),
    copyMealPlanWeek: (fromWeekStart: string, toWeekStart: string) =>
        api.post('/kitchen/meal-plans/copy-week', { fromWeekStart, toWeekStart }, tok()),

    // Consumption
    logMealServed: (menuItemId: string, date: string, servings: number = 1) =>
        api.post('/kitchen/log-meal', { menuItemId, date, servings }, tok()),
    recordConsumption: (body: any) => api.post('/kitchen/consumption', body, tok()),

    // Forecast + POs
    previewForecast: (weekStart: string) =>
        api.get(`/kitchen/forecast?weekStart=${weekStart}`, tok()) as Promise<ForecastResult>,
    generateDrafts: (weekStart?: string) =>
        api.post('/kitchen/purchase-orders/generate', weekStart ? { weekStart } : {}, tok()),
    listPurchaseOrders: (status?: string) =>
        api.get(`/kitchen/purchase-orders${status ? `?status=${status}` : ''}`, tok()) as Promise<{ purchaseOrders: PurchaseOrder[] }>,
    getPurchaseOrder: (id: string) => api.get(`/kitchen/purchase-orders/${id}`, tok()),
    updatePurchaseOrderItems: (id: string, items: any[]) =>
        api.patch(`/kitchen/purchase-orders/${id}/items`, { items }, tok()),
    approvePurchaseOrder: (id: string) =>
        api.post(`/kitchen/purchase-orders/${id}/approve`, {}, tok()),
    receivePurchaseOrder: (id: string) =>
        api.post(`/kitchen/purchase-orders/${id}/receive`, {}, tok()),
    cancelPurchaseOrder: (id: string) =>
        api.post(`/kitchen/purchase-orders/${id}/cancel`, {}, tok()),

    // Variance
    submitWeeklyCounts: (weekStart: string, weekEnd: string, counts: { productId: string; countedQty: number }[]) =>
        api.post('/kitchen/variance', { weekStart, weekEnd, counts }, tok()),
    listVariances: (weekStart?: string) =>
        api.get(`/kitchen/variance${weekStart ? `?weekStart=${weekStart}` : ''}`, tok()),
    acceptVariance: (id: string) => api.post(`/kitchen/variance/${id}/accept`, {}, tok()),
};
