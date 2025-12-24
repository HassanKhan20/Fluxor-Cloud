import React from 'react';
import { Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AISuggestionBadge } from './AISuggestionBadge';
import type { Product } from '@/types';

interface BulkReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onConfirmHighConfidence: () => void;
    onConfirmAll: () => void;
    onReviewIndividually: () => void;
}

export function BulkReviewModal({
    isOpen,
    onClose,
    products,
    onConfirmHighConfidence,
    onConfirmAll,
    onReviewIndividually
}: BulkReviewModalProps) {
    // Categorize by confidence
    const highConfidence = products.filter(p => {
        const suggestions = p.aiSuggestions;
        if (!suggestions) return false;
        const confidences = [
            suggestions.suggestedName?.confidence,
            suggestions.suggestedCategory?.confidence,
            suggestions.suggestedMinStock?.confidence
        ].filter(Boolean) as number[];
        const avg = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
        return avg >= 85;
    });

    const needsReview = products.filter(p => !highConfidence.includes(p));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">AI Suggestions Ready</DialogTitle>
                            <DialogDescription>
                                Review and confirm AI-generated suggestions
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-green-700">{highConfidence.length}</p>
                            <p className="text-sm text-green-600">High confidence (85%+)</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-amber-700">{needsReview.length}</p>
                            <p className="text-sm text-amber-600">Need review</p>
                        </div>
                    </div>

                    {/* Quick preview of high-confidence items */}
                    {highConfidence.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Ready to confirm:</p>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {highConfidence.slice(0, 5).map(product => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                                    >
                                        <span className="text-sm font-medium text-gray-800">{product.name}</span>
                                        <div className="flex items-center gap-1.5 text-green-600">
                                            <Check size={14} />
                                            <span className="text-xs">Ready</span>
                                        </div>
                                    </div>
                                ))}
                                {highConfidence.length > 5 && (
                                    <p className="text-sm text-gray-500 text-center py-2">
                                        +{highConfidence.length - 5} more items
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Items needing review */}
                    {needsReview.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        {needsReview.length} items need your review
                                    </p>
                                    <p className="text-sm text-amber-700">
                                        These have lower confidence and may need manual adjustment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                    {highConfidence.length > 0 && (
                        <Button onClick={onConfirmHighConfidence} className="w-full">
                            <Check size={16} className="mr-2" />
                            Confirm {highConfidence.length} High-Confidence Items
                        </Button>
                    )}
                    {products.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={onReviewIndividually}
                            className="w-full"
                        >
                            Review Individually
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-gray-500"
                    >
                        <X size={16} className="mr-2" />
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default BulkReviewModal;
