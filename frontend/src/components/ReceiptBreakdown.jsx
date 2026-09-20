import React from 'react';
import {
  AlertTriangle,
  Leaf,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  Info,
  CheckCircle2
} from 'lucide-react';

/**
 * ReceiptBreakdown Component
 *
 * Displays an itemized carbon contribution breakdown for grocery & retail receipts,
 * prominently highlighting the #1 Carbon Offender in the user's shopping cart with
 * actionable sustainable swap advice.
 */
export default function ReceiptBreakdown({ breakdown, className = '' }) {
  if (!breakdown || !Array.isArray(breakdown.items) || breakdown.items.length === 0) {
    return null;
  }

  const { items, topOffender, lowestOffender, totalItems, totalCartCo2Kg } = breakdown;

  // Helper to choose color themes based on impact share
  const getImpactColor = (percentage, isTop) => {
    if (isTop || percentage >= 40) {
      return {
        bar: 'bg-rose-500',
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200'
      };
    }
    if (percentage >= 15) {
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      };
    }
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200'
    };
  };

  return (
    <div className={`flex flex-col gap-3 font-body ${className}`}>
      {/* ── #1 CARBON OFFENDER BANNER ── */}
      {topOffender && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-white border border-rose-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                  #1 Carbon Offender in Cart
                </span>
                <span className="text-[11px] font-bold text-gray-500 font-display">
                  {topOffender.category}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h4 className="font-display font-bold text-sm text-ink truncate max-w-full">
                  {topOffender.name}
                </h4>
                <div className="flex items-baseline gap-1 text-right flex-shrink-0">
                  <span className="font-mono font-bold text-sm text-rose-600 tabular-nums">
                    {topOffender.co2Kg} kg CO₂e
                  </span>
                  <span className="text-xs text-rose-600/80 font-bold font-mono">
                    ({topOffender.percentage}% of cart)
                  </span>
                </div>
              </div>

              {topOffender.tip && (
                <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-start gap-1.5 text-xs text-gray-700">
                  <Leaf className="w-3.5 h-3.5 text-forest flex-shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <span className="font-semibold text-forest">Smart Swap Tip: </span>
                    {topOffender.tip}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ITEMIZED CART BREAKDOWN LIST ── */}
      <div className="bg-white border border-mist rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-forest" />
            <span className="font-display font-bold text-xs text-ink uppercase tracking-wider">
              Itemized Line Items ({totalItems || items.length})
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-forest">
            Total: {totalCartCo2Kg} kg CO₂e
          </span>
        </div>

        <div className="flex flex-col divide-y divide-gray-100">
          {items.map((item, idx) => {
            const colors = getImpactColor(item.percentage, item.isTopOffender);

            return (
              <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-400 font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-xs text-ink truncate max-w-[200px] sm:max-w-xs font-display">
                        {item.name}
                      </span>
                      {item.isTopOffender && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-mono">
                          Highest Emitter
                        </span>
                      )}
                      {!item.isTopOffender && lowestOffender && lowestOffender.name === item.name && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Lowest Impact
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                      <span>{item.category}</span>
                      {item.price != null && (
                        <>
                          <span>•</span>
                          <span className="font-mono">${item.price.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-xs text-ink tabular-nums">
                      {item.co2Kg} kg
                    </span>
                    <span className={`text-[10px] font-bold font-mono ml-1.5 ${colors.text}`}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Positive reinforcement / summary note */}
        {lowestOffender && (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 flex items-center justify-between text-[11px] text-emerald-800 mt-1">
            <span className="flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              Lowest cart impact: {lowestOffender.name}
            </span>
            <span className="font-mono font-bold tabular-nums">
              {lowestOffender.co2Kg} kg ({lowestOffender.percentage}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
