import Tesseract from 'tesseract.js';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

// Types for structured invoice data
export interface InvoiceMetadata {
    supplier_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    subtotal: number | null;
    taxes: number | null;
    discounts: number | null;
    total: number | null;
}

export interface LineItem {
    description: string;
    sku: string | null;
    upc: string | null;
    quantity: number;
    unit_cost: number;
    line_total: number;
    matched_product_id: string | null;
    matched_product_name: string | null;
    confidence: number;
}

export interface PricingAlert {
    type: 'PRICE_INCREASE' | 'PRICE_DECREASE' | 'NEW_PRODUCT' | 'MARGIN_COMPRESSION';
    product_name: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    old_value?: number;
    new_value?: number;
}

export interface Anomaly {
    type: 'DUPLICATE_INVOICE' | 'QUANTITY_MISMATCH' | 'TOTAL_MISMATCH' | 'SUSPICIOUS_CHARGE';
    message: string;
    severity: 'low' | 'medium' | 'high';
}

export interface BusinessInsight {
    type: 'MARGIN_ALERT' | 'PRICE_TREND' | 'REORDER_SUGGESTION' | 'PROFITABILITY_WARNING';
    title: string;
    description: string;
    action_recommended: string | null;
}

export interface InvoiceParseResult {
    invoice_metadata: InvoiceMetadata;
    line_items: LineItem[];
    inventory_updates: { product_id: string; quantity_added: number; new_cost: number }[];
    pricing_alerts: PricingAlert[];
    anomalies: Anomaly[];
    business_insights: BusinessInsight[];
    raw_text: string;
    confidence: number;
    needs_review: boolean;
}

// Ollama API call helper
async function callOllama(prompt: string): Promise<string> {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                prompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 2000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || '';
    } catch (error) {
        console.error('Ollama API call failed:', error);
        throw error;
    }
}

// Extract text from image using Tesseract OCR
export async function extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
        console.log(`[OCR] Starting text extraction from: ${imagePath}`);

        const result = await Tesseract.recognize(imagePath, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        console.log(`[OCR] Extracted ${result.data.text.length} characters with ${result.data.confidence}% confidence`);

        return {
            text: result.data.text,
            confidence: result.data.confidence / 100
        };
    } catch (error) {
        console.error('[OCR] Text extraction failed:', error);
        throw error;
    }
}

// Parse invoice text using Ollama LLM
export async function parseInvoiceWithLLM(ocrText: string): Promise<{
    metadata: InvoiceMetadata;
    items: Omit<LineItem, 'matched_product_id' | 'matched_product_name' | 'confidence'>[];
}> {
    const prompt = `You are an invoice parsing AI. Extract structured data from this invoice text.

INVOICE TEXT:
${ocrText}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "metadata": {
    "supplier_name": "string or null",
    "invoice_number": "string or null",
    "invoice_date": "YYYY-MM-DD or null",
    "due_date": "YYYY-MM-DD or null",
    "subtotal": number or null,
    "taxes": number or null,
    "discounts": number or null,
    "total": number or null
  },
  "items": [
    {
      "description": "product name",
      "sku": "string or null",
      "upc": "string or null (barcode)",
      "quantity": number,
      "unit_cost": number,
      "line_total": number
    }
  ]
}

Rules:
- Extract ALL line items you can find
- Use null for missing values, never make up data
- Prices should be numbers without currency symbols
- Dates in YYYY-MM-DD format
- Return ONLY the JSON, nothing else`;

    try {
        const response = await callOllama(prompt);

        // Extract JSON from response (handle potential markdown wrapping)
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsed = JSON.parse(jsonStr);

        return {
            metadata: parsed.metadata || {},
            items: parsed.items || []
        };
    } catch (error) {
        console.error('[LLM] Invoice parsing failed:', error);
        // Return empty structure on failure
        return {
            metadata: {
                supplier_name: null,
                invoice_number: null,
                invoice_date: null,
                due_date: null,
                subtotal: null,
                taxes: null,
                discounts: null,
                total: null
            },
            items: []
        };
    }
}

// Match line items to existing products
export async function matchProductsToInventory(
    items: Omit<LineItem, 'matched_product_id' | 'matched_product_name' | 'confidence'>[],
    storeId: string
): Promise<LineItem[]> {
    const products = await prisma.product.findMany({
        where: { storeId },
        select: { id: true, name: true, sku: true, barcode: true, costPrice: true, sellingPrice: true }
    });

    return items.map(item => {
        let bestMatch: { id: string; name: string; confidence: number } | null = null;

        // Priority 1: Exact barcode/UPC match
        if (item.upc) {
            const barcodeMatch = products.find(p => p.barcode === item.upc);
            if (barcodeMatch) {
                bestMatch = { id: barcodeMatch.id, name: barcodeMatch.name, confidence: 0.99 };
            }
        }

        // Priority 2: SKU match
        if (!bestMatch && item.sku) {
            const skuMatch = products.find(p => p.sku?.toLowerCase() === item.sku?.toLowerCase());
            if (skuMatch) {
                bestMatch = { id: skuMatch.id, name: skuMatch.name, confidence: 0.95 };
            }
        }

        // Priority 3: Fuzzy name match
        if (!bestMatch) {
            const itemNameLower = item.description.toLowerCase();
            for (const product of products) {
                const productNameLower = product.name.toLowerCase();

                // Contains match
                if (productNameLower.includes(itemNameLower) || itemNameLower.includes(productNameLower)) {
                    const confidence = Math.min(itemNameLower.length, productNameLower.length) /
                        Math.max(itemNameLower.length, productNameLower.length) * 0.8;
                    if (!bestMatch || confidence > bestMatch.confidence) {
                        bestMatch = { id: product.id, name: product.name, confidence };
                    }
                }

                // Word overlap match
                const itemWords = itemNameLower.split(/\s+/);
                const productWords = productNameLower.split(/\s+/);
                const overlap = itemWords.filter(w => productWords.some(pw => pw.includes(w) || w.includes(pw))).length;
                const overlapScore = overlap / Math.max(itemWords.length, productWords.length) * 0.7;

                if (overlapScore > 0.3 && (!bestMatch || overlapScore > bestMatch.confidence)) {
                    bestMatch = { id: product.id, name: product.name, confidence: overlapScore };
                }
            }
        }

        return {
            ...item,
            matched_product_id: bestMatch?.id || null,
            matched_product_name: bestMatch?.name || null,
            confidence: bestMatch?.confidence || 0
        };
    });
}

// Detect pricing anomalies and generate alerts
export async function detectPricingAlerts(
    items: LineItem[],
    storeId: string
): Promise<PricingAlert[]> {
    const alerts: PricingAlert[] = [];

    for (const item of items) {
        if (!item.matched_product_id) {
            alerts.push({
                type: 'NEW_PRODUCT',
                product_name: item.description,
                message: `New product detected: "${item.description}" - needs to be added to inventory`,
                severity: 'low'
            });
            continue;
        }

        // Get historical cost for this product
        const product = await prisma.product.findUnique({
            where: { id: item.matched_product_id },
            select: { name: true, costPrice: true, sellingPrice: true }
        });

        if (product && product.costPrice > 0) {
            const priceDiff = ((item.unit_cost - product.costPrice) / product.costPrice) * 100;

            if (priceDiff > 10) {
                alerts.push({
                    type: 'PRICE_INCREASE',
                    product_name: product.name,
                    message: `Price increased ${priceDiff.toFixed(1)}% from $${product.costPrice.toFixed(2)} to $${item.unit_cost.toFixed(2)}`,
                    severity: priceDiff > 25 ? 'high' : 'medium',
                    old_value: product.costPrice,
                    new_value: item.unit_cost
                });
            } else if (priceDiff < -10) {
                alerts.push({
                    type: 'PRICE_DECREASE',
                    product_name: product.name,
                    message: `Price decreased ${Math.abs(priceDiff).toFixed(1)}% from $${product.costPrice.toFixed(2)} to $${item.unit_cost.toFixed(2)}`,
                    severity: 'low',
                    old_value: product.costPrice,
                    new_value: item.unit_cost
                });
            }

            // Check margin compression
            if (product.sellingPrice > 0) {
                const newMargin = ((product.sellingPrice - item.unit_cost) / product.sellingPrice) * 100;
                if (newMargin < 15) {
                    alerts.push({
                        type: 'MARGIN_COMPRESSION',
                        product_name: product.name,
                        message: `Margin dropping to ${newMargin.toFixed(1)}% - consider price adjustment`,
                        severity: newMargin < 5 ? 'high' : 'medium'
                    });
                }
            }
        }
    }

    return alerts;
}

// Generate business insights
export function generateBusinessInsights(
    items: LineItem[],
    alerts: PricingAlert[]
): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Count unmatched products
    const unmatched = items.filter(i => !i.matched_product_id).length;
    if (unmatched > 0) {
        insights.push({
            type: 'REORDER_SUGGESTION',
            title: 'New Products Detected',
            description: `${unmatched} product(s) on this invoice don't match your inventory. Review and add them.`,
            action_recommended: 'Review unmatched items and add to inventory'
        });
    }

    // Margin issues
    const marginAlerts = alerts.filter(a => a.type === 'MARGIN_COMPRESSION');
    if (marginAlerts.length > 0) {
        insights.push({
            type: 'MARGIN_ALERT',
            title: 'Margin Pressure',
            description: `${marginAlerts.length} product(s) have margins below 15%. Consider raising retail prices.`,
            action_recommended: 'Review pricing for low-margin items'
        });
    }

    // Price increases
    const priceIncreases = alerts.filter(a => a.type === 'PRICE_INCREASE');
    if (priceIncreases.length >= 3) {
        insights.push({
            type: 'PRICE_TREND',
            title: 'Supplier Pricing Trend',
            description: `Multiple price increases detected (${priceIncreases.length} items). Supplier may be raising prices across the board.`,
            action_recommended: 'Consider negotiating with supplier or finding alternatives'
        });
    }

    return insights;
}

// Validate invoice totals
export function validateInvoiceTotals(
    metadata: InvoiceMetadata,
    items: LineItem[]
): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Calculate sum of line items
    const calculatedTotal = items.reduce((sum, item) => sum + item.line_total, 0);

    if (metadata.subtotal && Math.abs(calculatedTotal - metadata.subtotal) > 1) {
        anomalies.push({
            type: 'TOTAL_MISMATCH',
            message: `Line items sum ($${calculatedTotal.toFixed(2)}) doesn't match subtotal ($${metadata.subtotal.toFixed(2)})`,
            severity: 'medium'
        });
    }

    // Check if total = subtotal + taxes - discounts
    if (metadata.subtotal && metadata.total && metadata.taxes !== null) {
        const expectedTotal = metadata.subtotal + (metadata.taxes || 0) - (metadata.discounts || 0);
        if (Math.abs(expectedTotal - metadata.total) > 1) {
            anomalies.push({
                type: 'TOTAL_MISMATCH',
                message: `Invoice total ($${metadata.total.toFixed(2)}) doesn't match calculated total ($${expectedTotal.toFixed(2)})`,
                severity: 'high'
            });
        }
    }

    return anomalies;
}

// Main processing function
export async function processInvoice(
    filePath: string,
    storeId: string
): Promise<InvoiceParseResult> {
    console.log(`[Invoice AI] Processing invoice: ${filePath}`);

    // Step 1: OCR
    const { text: rawText, confidence: ocrConfidence } = await extractTextFromImage(filePath);

    // Step 2: LLM Parsing
    const { metadata, items } = await parseInvoiceWithLLM(rawText);

    // Step 3: Product Matching
    const matchedItems = await matchProductsToInventory(items, storeId);

    // Step 4: Pricing Alerts
    const pricingAlerts = await detectPricingAlerts(matchedItems, storeId);

    // Step 5: Validation
    const anomalies = validateInvoiceTotals(metadata, matchedItems);

    // Step 6: Business Insights
    const businessInsights = generateBusinessInsights(matchedItems, pricingAlerts);

    // Calculate overall confidence
    const avgMatchConfidence = matchedItems.length > 0
        ? matchedItems.reduce((sum, i) => sum + i.confidence, 0) / matchedItems.length
        : 0;
    const overallConfidence = (ocrConfidence * 0.4 + avgMatchConfidence * 0.6);
    const needsReview = overallConfidence < 0.9 || anomalies.length > 0;

    console.log(`[Invoice AI] Processing complete. Confidence: ${(overallConfidence * 100).toFixed(1)}%`);

    return {
        invoice_metadata: metadata,
        line_items: matchedItems,
        inventory_updates: [], // Populated on confirmation
        pricing_alerts: pricingAlerts,
        anomalies,
        business_insights: businessInsights,
        raw_text: rawText,
        confidence: overallConfidence,
        needs_review: needsReview
    };
}

// Update inventory based on confirmed invoice
export async function applyInventoryUpdates(
    invoiceId: string,
    items: LineItem[],
    storeId: string
): Promise<{ product_id: string; quantity_added: number; new_cost: number }[]> {
    const updates: { product_id: string; quantity_added: number; new_cost: number }[] = [];

    for (const item of items) {
        if (!item.matched_product_id) continue;

        // Update product cost price
        await prisma.product.update({
            where: { id: item.matched_product_id },
            data: { costPrice: item.unit_cost }
        });

        // Create inventory snapshot
        const currentSnapshot = await prisma.inventorySnapshot.findFirst({
            where: { productId: item.matched_product_id },
            orderBy: { snapshotDate: 'desc' }
        });

        const currentQty = currentSnapshot?.quantityOnHand || 0;
        const newQty = currentQty + item.quantity;

        await prisma.inventorySnapshot.create({
            data: {
                storeId,
                productId: item.matched_product_id,
                quantityOnHand: newQty
            }
        });

        updates.push({
            product_id: item.matched_product_id,
            quantity_added: item.quantity,
            new_cost: item.unit_cost
        });
    }

    return updates;
}
