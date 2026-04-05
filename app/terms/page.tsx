import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Aria" className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-slate-900">Aria</span>
        </Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Back to home</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-10">Last updated: {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
        {[
          { heading: "1. Acceptance", body: "By creating an account and using Aria, you agree to these Terms of Service. If you are using Aria on behalf of an organisation, you represent that you have authority to bind that organisation." },
          { heading: "2. The Service", body: "Aria provides AI-assisted documentation, compliance tracking, and management tools for disability support providers. The AI-generated documents are drafts only and must be reviewed by qualified staff before filing. Aria does not provide legal, medical, or professional care advice." },
          { heading: "3. AI-Generated Content Disclaimer", body: "All AI-generated progress notes, support plans, and incident reports are drafts. You are solely responsible for reviewing, editing, and approving all documentation before filing with the NDIS or any other body. Aria's AI tools assist with documentation but do not replace professional judgment." },
          { heading: "4. Subscription & Billing", body: "Subscriptions are billed monthly. A 14-day free trial is provided. After the trial, payment is required to continue. Subscriptions auto-renew unless cancelled. Cancellation takes effect at end of the billing period. Refunds are at our discretion for exceptional circumstances." },
          { heading: "5. Your Data", body: "You own all data you enter into Aria. We process it to provide the service. You can export or delete your data at any time. If you cancel your subscription, your data is retained for 90 days before deletion, giving you time to export." },
          { heading: "6. Acceptable Use", body: "You must not use Aria for any unlawful purpose, attempt to gain unauthorised access, enter false participant information, or use the platform in any way that would cause harm to participants or third parties. Violation of these terms may result in immediate account termination." },
          { heading: "7. Limitation of Liability", body: "To the maximum extent permitted by law, Aria's liability is limited to the amount you paid in the 12 months prior to the claim. We are not liable for any indirect, consequential, or incidental damages. This does not affect statutory rights under Australian Consumer Law." },
          { heading: "8. NDIS Compliance", body: "While we design our document templates to align with NDIS Practice Standards, we make no guarantee that AI-generated documents will satisfy every NDIS requirement in every context. You remain responsible for compliance with all NDIS obligations." },
          { heading: "9. Governing Law", body: "These terms are governed by the laws of Victoria, Australia. Disputes will be resolved in Victorian courts." },
          { heading: "10. Contact", body: "Questions about these terms: legal@aria.care" },
        ].map(s => (
          <div key={s.heading} className="mb-8">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-3">{s.heading}</h2>
            <p className="text-slate-600 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
