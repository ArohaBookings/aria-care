import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aria" width={32} height={32} className="w-8 h-8 rounded-xl" />
          <span className="font-display text-xl font-bold text-slate-900">Aria</span>
        </Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Back to home</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-10">Last updated: {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
        {[
          { heading: "1. Overview", body: "Aria Care Pty Ltd ('Aria', 'we', 'us') is committed to protecting the privacy of personal information in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). This policy explains how we collect, use, and protect information provided by disability support providers and their staff using our platform." },
          { heading: "2. What We Collect", body: "We collect organisation and staff account information (name, email, ABN), participant information entered by providers (name, NDIS number, date of birth, diagnoses, support notes), usage data and technical logs, and billing information processed securely through Stripe. We do not store credit card details directly." },
          { heading: "3. Sensitive Information", body: "Participant health and disability information is sensitive information under the Privacy Act. We only collect it as entered by authorised support providers, store it encrypted in Australian data centres, and never use it for any purpose other than providing our platform services to the provider who entered it." },
          { heading: "4. Data Storage & Security", body: "All data is stored in Australian data centres via Supabase (hosted on AWS ap-southeast-2, Sydney). Data is encrypted in transit (TLS 1.3) and at rest (AES-256). We implement row-level security ensuring each provider can only access their own organisation's data. We conduct regular security reviews." },
          { heading: "5. How We Use Data", body: "We use your data to provide the Aria platform services, generate AI-assisted documents using the content you provide, send service notifications and product updates (with ability to unsubscribe), and improve our services. We never sell data to third parties or use participant data for advertising." },
          { heading: "6. AI Processing", body: "When you use AI features, session transcripts and participant context are sent to OpenAI or Anthropic's APIs for processing. This data is processed under our enterprise agreements with these providers and is not used to train their models. We recommend not including unnecessary identifying information in voice memos." },
          { heading: "7. Access & Correction", body: "You may request access to, correction of, or deletion of your personal information by contacting privacy@aria.care. We will respond within 30 days. Providers may delete participant data at any time from within the platform." },
          { heading: "8. Contact", body: "For privacy enquiries, contact: privacy@aria.care | Aria Care Pty Ltd, Australia." },
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
