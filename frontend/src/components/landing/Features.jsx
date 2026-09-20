import React from 'react';
import { Upload, ScanLine, BarChart2, Recycle, Lock, Leaf } from 'lucide-react';

export default function Features() {
  const list = [
    {
      Icon: Upload,
      title: 'Smart Upload',
      description: 'Receipts, flight tickets, barcodes, or product photos — drop in any of them.',
    },
    {
      Icon: ScanLine,
      title: 'Real OCR + Scoring',
      description: 'Tesseract-powered extraction matched against open emission factor tables.',
    },
    {
      Icon: BarChart2,
      title: 'Carbon Dashboard',
      description: 'Your actual scan history, charted over time — not a fake static number.',
    },
    {
      Icon: Recycle,
      title: 'Recycle Finder',
      description: 'Search any item and find exactly how to dispose of it, plus the nearest real center.',
    },
    {
      Icon: Lock,
      title: 'Instant & Private',
      description: 'No account, password, or sign-up needed. Calculate emissions and find recycling centers privately.',
    },
    {
      Icon: Leaf,
      title: 'Built on Open Data',
      description: 'Every number traces back to a published source: DEFRA, EPA, or FAO — never a guess.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-paper border-b border-mist scroll-mt-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-ink mb-4">
            Everything you need to actually understand your footprint
          </h2>
          <p className="font-body text-sm text-gray-500 max-w-lg mx-auto">
            Audit your carbon emissions with verified calculations using open datasets.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="bg-white border border-mist rounded-2xl p-6 hover:shadow-sm transition-all"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 bg-mist rounded-xl flex items-center justify-center mb-5 text-forest">
                <Icon className="w-5 h-5" />
              </div>

              {/* Feature Text */}
              <h3 className="font-display text-base font-bold text-ink mb-2">
                {title}
              </h3>
              <p className="font-body text-xs text-gray-500 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
