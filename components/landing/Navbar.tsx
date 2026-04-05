"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Sparkles } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-aria-gradient rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-slate-900">Aria</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">{label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">Sign in</Link>
          <Link href="/signup" className="btn-primary text-sm px-5 py-2">Start free trial</Link>
        </div>

        <button className="md:hidden text-slate-600" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
          {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} className="block text-sm text-slate-600 py-2" onClick={() => setOpen(false)}>{label}</a>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/login" className="text-sm text-center text-slate-600 py-2">Sign in</Link>
            <Link href="/signup" className="btn-primary justify-center">Start free trial</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
