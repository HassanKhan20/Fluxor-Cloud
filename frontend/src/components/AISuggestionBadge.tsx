import React from 'react';
import { Sparkles, Check, Pencil, X } from 'lucide-react';
import { getConfidenceDisplay } from '@/lib/aiSuggestions';
import type { AISuggestion } from '@/types';

interface AISuggestionBadgeProps<T> {
    suggestion: AISuggestion<T>;
    label?: string;
    displayValue?: string;
    onConfirm?: () => void;
    onEdit?: () => void;
    onDismiss?: () => void;
    compact?: boolean;
}

export function AISuggestionBadge<T>({
    suggestion,
    label,
    displayValue,
    onConfirm,
    onEdit,
    onDismiss,
    compact = false
}: AISuggestionBadgeProps<T>) {
    const { color, bgColor, label: confidenceLabel, textColor } = getConfidenceDisplay(suggestion.confidence);
    const valueToShow = displayValue ?? String(suggestion.value);

    if (compact) {
        return (
            <div
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm"
                style={{ backgroundColor: bgColor }}
            >
                <Sparkles size={12} style={{ color }} />
                <span className="font-medium" style={{ color: textColor }}>
                    {valueToShow}
                </span>
                <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: color, color: 'white' }}
                >
                    {suggestion.confidence}%
                </span>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: bgColor, border: `1px solid ${color}20` }}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Sparkles size={14} style={{ color }} />
                    </div>
                    <div>
                        {label && (
                            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                        )}
                        <p className="font-semibold text-gray-900">{valueToShow}</p>
                    </div>
                </div>
                <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: color, color: 'white' }}
                >
                    <span>{suggestion.confidence}%</span>
                </div>
            </div>

            {/* Reason */}
            <p className="text-sm text-gray-600">{suggestion.reason}</p>

            {/* Actions */}
            {(onConfirm || onEdit || onDismiss) && (
                <div className="flex items-center gap-2 pt-1">
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
                        >
                            <Check size={14} className="text-green-600" />
                            Confirm
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm border border-gray-200"
                        >
                            <Pencil size={14} className="text-blue-600" />
                            Edit
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <X size={14} />
                            Ignore
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default AISuggestionBadge;
