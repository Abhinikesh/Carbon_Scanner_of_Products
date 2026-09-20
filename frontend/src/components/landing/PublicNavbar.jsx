import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Menu, X } from 'lucide-react';

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-mist backdrop-blur-md bg-opacity-95">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Wordmark */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-forest rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-ink tracking-tight">
            Climate Lens
          </span>
        </Link>

        {/* Center: Anchor Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#how-it-works"
            className="text-ink hover:text-forest transition-colors font-body"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="text-ink hover:text-forest transition-colors font-body"
          >
            Features
          </a>
        </div>

        {/* Right: Launch App Button (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/app/home"
            className="bg-forest hover:bg-forest-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all font-body focus:outline-none focus:ring-2 focus:ring-forest/20 shadow-sm"
          >
            Launch App →
          </Link>
        </div>

        {/* Mobile Menu Button (Hamburger) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-ink p-1 hover:bg-mist/35 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/20"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu (Drawer) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-mist bg-paper px-6 py-4 flex flex-col gap-4 shadow-inner">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-ink hover:text-forest transition-colors font-body py-1.5"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-ink hover:text-forest transition-colors font-body py-1.5"
          >
            Features
          </a>
          <div className="border-t border-mist/50 my-1" />
          <Link
            to="/app/home"
            onClick={() => setMobileMenuOpen(false)}
            className="bg-forest hover:bg-forest-dark text-white font-bold text-center text-sm py-2.5 rounded-xl transition-all font-body focus:outline-none focus:ring-2 focus:ring-forest/20 shadow-sm"
          >
            Launch App →
          </Link>
        </div>
      )}
    </nav>
  );
}
