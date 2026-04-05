import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="font-display text-2xl font-bold text-slate-900 mb-3">Aria</div>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              The AI operating system for NDIS and aged care providers. Built in Australia.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link href="/#features" className="hover:text-aria-600 transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-aria-600 transition-colors">Pricing</Link></li>
              <li><Link href="/signup" className="hover:text-aria-600 transition-colors">Start free trial</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Account</p>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link href="/login" className="hover:text-aria-600 transition-colors">Sign in</Link></li>
              <li><Link href="/signup" className="hover:text-aria-600 transition-colors">Create account</Link></li>
              <li><Link href="/reset-password" className="hover:text-aria-600 transition-colors">Reset password</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Aria. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <span>Made in Australia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
