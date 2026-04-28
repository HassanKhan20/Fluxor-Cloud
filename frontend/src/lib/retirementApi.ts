import { api } from './api';
const tok = () => localStorage.getItem('token') || '';

export type FacilityType = 'CONVENIENCE_STORE' | 'RETIREMENT_HOME';

export interface FacilityConfig {
    facilityType: FacilityType;
    facilityTypeSet: boolean;
    kitchenMode: boolean;
    name?: string;
}

export interface DietaryProfile {
    diabetic?: boolean;
    lowSodium?: boolean;
    renal?: boolean;
    cardiac?: boolean;
    glutenFree?: boolean;
    vegetarian?: boolean;
    texture?: 'regular' | 'mechanical_soft' | 'pureed' | 'thickened_liquids';
    allergens?: string | null;
    dislikes?: string | null;
    preferences?: string | null;
}

export interface CarePlan {
    incontinenceLevel?: 'none' | 'nighttime_only' | 'light' | 'moderate' | 'full';
    briefChangesPerDay?: number;
    mobility?: 'independent' | 'walker' | 'wheelchair' | 'bedbound';
    isolationPrecautions?: 'none' | 'contact' | 'droplet' | 'airborne';
    fluidGoalMl?: number | null;
    notes?: string | null;
    version?: number;
}

export interface Resident {
    id: string;
    storeId: string;
    name: string;
    room: string | null;
    admissionDate: string | null;
    dischargeDate: string | null;
    isActive: boolean;
    notes: string | null;
    dietaryProfile: DietaryProfile | null;
    carePlan: CarePlan | null;
}

export interface DailyCensus {
    id: string;
    date: string;
    count: number;
    guests: number;
    notes: string | null;
}

export interface PrepSheet {
    date: string;
    census: DailyCensus | null;
    residentsActive: number;
    modSummary: {
        diabetic: number; lowSodium: number; renal: number; cardiac: number;
        glutenFree: number; vegetarian: number;
        mechanicalSoft: number; pureed: number; thickenedLiquids: number;
        allergens: { resident: string; room: string | null; allergens: string }[];
    };
    dishes: {
        mealPlanId: string;
        menuItemName: string;
        category: string | null;
        servings: number;
        ingredients: { productName: string; qtyTotal: number; unit: string }[];
    }[];
}

export interface TrayTicket {
    residentId: string;
    residentName: string;
    room: string | null;
    diet: any;
    items: { name: string; category: string | null; warnings: string[] }[];
}

export const retirementApi = {
    // Facility type
    getFacility: () => api.get('/retirement/facility-type', tok()) as Promise<FacilityConfig>,
    setFacility: (facilityType: FacilityType) =>
        api.post('/retirement/facility-type', { facilityType }, tok()),

    // Residents
    listResidents: (includeInactive = false) =>
        api.get(`/retirement/residents${includeInactive ? '?includeInactive=true' : ''}`, tok()) as Promise<{ residents: Resident[] }>,
    getResident: (id: string) =>
        api.get(`/retirement/residents/${id}`, tok()) as Promise<{ resident: Resident }>,
    createResident: (body: any) => api.post('/retirement/residents', body, tok()),
    updateResident: (id: string, body: any) => api.patch(`/retirement/residents/${id}`, body, tok()),
    archiveResident: (id: string) => api.post(`/retirement/residents/${id}/archive`, {}, tok()),

    // Census
    listCensus: (start?: string, end?: string) =>
        api.get(`/retirement/census${start ? `?start=${start}&end=${end}` : ''}`, tok()) as Promise<{ census: DailyCensus[] }>,
    upsertCensus: (date: string, count: number, guests = 0, notes?: string) =>
        api.post('/retirement/census', { date, count, guests, notes }, tok()),
    autoFillCensus: (weekStart: string) =>
        api.post('/retirement/census/auto-fill-week', { weekStart }, tok()),

    // Prep + tray
    getPrepSheet: (date?: string) =>
        api.get(`/retirement/prep-sheet${date ? `?date=${date}` : ''}`, tok()) as Promise<PrepSheet>,
    getTrayTickets: (date?: string, meal: 'breakfast' | 'lunch' | 'dinner' = 'lunch') =>
        api.get(`/retirement/tray-tickets?date=${date ?? ''}&meal=${meal}`, tok()) as Promise<{ date: string; meal: string; tickets: TrayTicket[] }>,

    // Supplies
    listSupplies: () => api.get('/retirement/supplies', tok()),
    createSupply: (body: any) => api.post('/retirement/supplies', body, tok()),
    recordSupplyUse: (body: any) => api.post('/retirement/supplies/consumption', body, tok()),

    // Stockout prediction
    getStockoutWatch: () =>
        api.get('/retirement/stockout-watch', tok()) as Promise<{ rows: StockoutRow[]; summary: StockoutSummary }>,

    // Bulk meal tally
    bulkLogMeals: (date: string, entries: { menuItemId: string; servings: number }[]) =>
        api.post('/retirement/log-meals-bulk', { date, entries }, tok()),
};

export interface StockoutRow {
    productId: string;
    productName: string;
    unit: string | null;
    onHand: number;
    historicalDailyRate: number;
    plannedDailyDemand: number;
    effectiveDailyDemand: number;
    daysUntilStockout: number;
    leadTimeDays: number;
    urgency: 'critical' | 'warning' | 'watch' | 'ok';
    vendorName: string | null;
    vendorRefId: string | null;
}

export interface StockoutSummary {
    critical: number; warning: number; watch: number; ok: number;
}
