import React from 'react';
import { AlertTriangle, Package, Sparkles, Check, Pencil, Clock, DollarSign } from 'lucide-react';
import { AISuggestionBadge } from './AISuggestionBadge';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';

interface ProductReviewCardProps {
    product: Product;
    onConfirmAll?: () => void;
    onEdit?: () => void;
    onIgnore?: () => void;
}

export function ProductReviewCard({ product, onConfirmAll, onEdit, onIgnore }: ProductReviewCardProps) {
    const suggestions = product.aiSuggestions;
    const hasSuggestions = suggestions && (
        suggestions.suggestedName ||
        suggestions.suggestedCategory ||
        suggestions.suggestedMinStock ||
        suggestions.suggestedPrice
    );

    // Determine the primary issue
    const getPrimaryIssue = () => {
        if (product.isUnmatched) return { icon: AlertTriangle, label: 'New from sales – needs review', color: 'amber' };
        if (!product.category) return { icon: Package, label: 'Missing category', color: 'blue' };
        if (product.initialStock === null || product.initialStock === undefined) return { icon: Package, label: 'No starting inventory', color: 'orange' };
        if (!product.sellingPrice || product.sellingPrice === 0) return { icon: DollarSign, label: 'Price not set', color: 'purple' };
        return { icon: Sparkles, label: 'Review suggested', color: 'gray' };
    };

    const issue = getPrimaryIssue();
    const IconComponent = issue.icon;

    // Calculate highest confidence suggestion
    const confidenceValues = [
        suggestions?.suggestedName?.confidence,
        suggestions?.suggestedCategory?.confidence,
        suggestions?.suggestedMinStock?.confidence,
        suggestions?.suggestedPrice?.confidence
    ].filter(Boolean) as number[];
    const avgConfidence = confidenceValues.length > 0
        ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
        : 0;

    return (
        <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${issue.color}-100`}>
                        <IconComponent size={20} className={`text-${issue.color}-600`} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{product.name || 'Unnamed Product'}</p>
                        <p className="text-sm text-gray-500">{issue.label}</p>
                    </div>
                </div>
                {avgConfidence > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full">
                        <Sparkles size={12} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">{avgConfidence}% match</span>
                    </div>
                )}
            </div>

            {/* Product details */}
            {product.barcode && (
                <p className="text-sm text-gray-500 mb-4">Barcode: {product.barcode}</p>
            )}

            {/* AI Suggestions */}
            {hasSuggestions && (
                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Sparkles size={14} className="text-blue-500" />
                        AI Suggestions
                    </div>

                    <div className="grid gap-2">
                        {suggestions?.suggestedName && (
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-600">Name</span>
                                <AISuggestionBadge suggestion={suggestions.suggestedName} compact />
                            </div>
                        )}
                        {suggestions?.suggestedCategory && (
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-600">Category</span>
                                <AISuggestionBadge suggestion={suggestions.suggestedCategory} compact />
                            </div>
                        )}
                        {suggestions?.suggestedMinStock && (
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-600">Starting Stock</span>
                                <AISuggestionBadge
                                    suggestion={suggestions.suggestedMinStock}
                                    displayValue={`${suggestions.suggestedMinStock.value} units`}
                                    compact
                                />
                            </div>
                        )}
                        {suggestions?.suggestedPrice && (
                            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-600">Price</span>
                                <AISuggestionBadge
                                    suggestion={suggestions.suggestedPrice}
                                    displayValue={`$${suggestions.suggestedPrice.value.toFixed(2)}`}
                                    compact
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stockout warning */}
            {suggestions?.daysUntilStockout !== undefined && suggestions.daysUntilStockout <= 7 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-4">
                    <Clock size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                        {suggestions.daysUntilStockout} days until stockout
                    </span>
                    {suggestions.revenueAtRisk !== undefined && suggestions.revenueAtRisk > 0 && (
                        <span className="text-sm text-red-600 ml-auto">
                            ${suggestions.revenueAtRisk} at risk
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {onConfirmAll && avgConfidence >= 60 && (
                    <Button
                        size="sm"
                        onClick={onConfirmAll}
                        className="flex-1"
                    >
                        <Check size={14} className="mr-1.5" />
                        Confirm All
                    </Button>
                )}
                {onEdit && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className={avgConfidence >= 60 ? '' : 'flex-1'}
                    >
                        <Pencil size={14} className="mr-1.5" />
                        Edit Details
                    </Button>
                )}
                {onIgnore && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onIgnore}
                        className="text-gray-500"
                    >
                        Ignore
                    </Button>
                )}
            </div>
        </div>
    );
}

export default ProductReviewCard;
