import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Calculator, Recycle } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      Icon: Upload,
      title: 'Upload or scan',
      description: 'Add a receipt, flight ticket, barcode, or product photo. JPG, PNG, or PDF.',
    },
    {
      num: '02',
      Icon: Calculator,
      title: 'We calculate it',
      description: 'Real OCR reads the text. We match it against published DEFRA, EPA, and FAO emission factors — no black-box AI guess.',
    },
    {
      num: '03',
      Icon: Recycle,
      title: 'See it and act on it',
      description: 'Get your CO2 number, your running total on the dashboard, and where to recycle or dispose of it correctly.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-mist scroll-mt-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-ink mb-4">
            From receipt to real number, in three steps
          </h2>
          <p className="font-body text-sm text-gray-500 max-w-lg mx-auto">
            Audit your carbon emissions with verified calculations using open datasets.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map(({ num, Icon, title, description }) => (
            <div
              key={num}
              className="bg-paper border border-mist rounded-2xl p-8 flex flex-col items-start relative hover:shadow-sm transition-all"
            >
              {/* Large step number */}
              <span className="font-mono text-xs font-bold text-forest tracking-wider uppercase mb-6 bg-mist/50 px-2.5 py-1 rounded-md">
                Step {num}
              </span>

              {/* Icon Container */}
              <div className="w-10 h-10 bg-white border border-mist rounded-xl flex items-center justify-center mb-5 text-forest">
                <Icon className="w-5 h-5" />
              </div>

              {/* Step info */}
              <h3 className="font-display text-lg font-bold text-ink mb-2">
                {title}
              </h3>
              <p className="font-body text-sm text-gray-500 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA below */}
        <div className="text-center">
          <Link
            to="/app/upload-center"
            className="inline-flex items-center justify-center bg-forest hover:bg-forest-dark text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-forest/20 shadow-sm"
          >
            Start Scanning Now →
          </Link>
        </div>
      </div>
    </section>
  );
}
