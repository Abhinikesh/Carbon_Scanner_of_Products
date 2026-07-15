import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, FileText } from 'lucide-react';

export default function Hero() {
  const [co2, setCo2] = useState(0);

  useEffect(() => {
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setCo2(2.4);
      return;
    }

    // Animation to count up to 2.4 kg CO2e
    let start = 0;
    const end = 2.4;
    const duration = 1000; // 1 second
    const stepTime = 30; // 30ms intervals
    const steps = duration / stepTime;
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCo2(end);
      } else {
        setCo2(parseFloat(start.toFixed(1)));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-paper py-16 md:py-24 border-b border-mist">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Hero grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-16">
          {/* Left content */}
          <div className="md:col-span-7 flex flex-col items-start">
            <span className="font-mono text-xs uppercase tracking-widest text-forest font-bold mb-4">
              Real Data, Not Guesses
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-[1.15] mb-6">
              See the real cost of everything you buy, eat, and fly.
            </h1>
            <p className="font-body text-base text-gray-600 leading-relaxed mb-8 max-w-xl">
              Upload a receipt, flight ticket, or product photo. Climate Lens runs it through OCR and matches it against real DEFRA, EPA, and FAO emission data — then tells you exactly where the carbon went, and what to do with the item when you're done.
            </p>
            <div className="flex gap-4 flex-wrap w-full sm:w-auto">
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 bg-forest hover:bg-forest-dark text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-forest/20 w-full sm:w-auto"
              >
                Start Tracking Free
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-ink border border-mist font-bold px-6 py-3.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-forest/20 w-full sm:w-auto"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Right Signature Visual */}
          <div className="md:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[380px] h-[280px] bg-white border border-mist rounded-2xl shadow-sm p-6 overflow-hidden flex items-center justify-between">
              {/* Receipt mockup card (left side of visual) */}
              <div className="w-[120px] bg-paper border border-mist rounded-xl p-3 transform -rotate-3 hover:rotate-0 transition-transform duration-300 z-10 flex flex-col h-[180px]">
                <div className="flex items-center gap-1.5 border-b border-mist pb-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-mono text-[8px] uppercase tracking-wide text-gray-500">
                    Receipt.png
                  </span>
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-2 bg-gray-200 rounded w-full" />
                  <div className="h-2 bg-gray-200 rounded w-5/6" />
                  <div className="h-2 bg-gray-200 rounded w-2/3" />
                  <div className="h-2 bg-gray-200 rounded w-4/5" />
                </div>
                <div className="mt-auto border-t border-mist pt-2 flex justify-between">
                  <div className="h-2 bg-gray-300 rounded w-6" />
                  <div className="h-2 bg-gray-300 rounded w-8" />
                </div>
              </div>

              {/* Connecting element (middle of visual) */}
              <div className="flex items-center justify-center flex-1 z-0 text-gray-400">
                <ArrowRight className="w-6 h-6 animate-pulse" />
              </div>

              {/* Result card (right side of visual) */}
              <div className="w-[160px] bg-white border border-mist rounded-xl p-4 shadow-sm transform rotate-3 hover:rotate-0 transition-transform duration-300 z-10 flex flex-col justify-between h-[180px]">
                <div>
                  <span className="font-mono text-[9px] font-bold text-forest uppercase tracking-widest block mb-1">
                    Calculated
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-ink tracking-tight tabular-nums">
                      {co2.toFixed(1)}
                    </span>
                    <span className="font-mono text-xs font-semibold text-gray-500">
                      kg
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400 block mt-0.5">
                    CO₂e Emissions
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-mist/50">
                  <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Low Impact
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below the fold stats */}
        <div className="border-t border-mist pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { value: 'DEFRA + EPA', label: 'Open emission factor databases' },
            { value: '3 Inputs', label: 'Receipt, flight ticket, or barcode' },
            { value: 'Free', label: 'To start and audit your impacts' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col">
              <span className="font-mono text-lg font-bold text-forest tracking-tight">
                {value}
              </span>
              <span className="font-body text-xs text-gray-500 mt-0.5">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
