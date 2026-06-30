import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Mic, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Aria Care Blog | AI Progress Notes and Support Documentation",
  description: "Practical guides for support workers and disability providers using AI to create review-ready progress notes, handovers, incident drafts and support summaries.",
  alternates: { canonical: "/blog" },
};

const posts = [
  {
    href: "/blog/ai-progress-notes-support-workers",
    eyebrow: "Support workers",
    title: "How to turn after-shift voice notes into copy-ready progress notes",
    description: "A practical guide to using AI drafts safely with ShiftCare, Lumary, Brevity, CareMaster and provider systems.",
    icon: Mic,
  },
  {
    href: "/progress-notes",
    eyebrow: "Progress notes",
    title: "AI progress notes for support workers",
    description: "What a useful disability support progress note includes, plus examples and safety reminders.",
    icon: FileText,
  },
];

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Aria Care Blog",
  url: "https://www.ariacare.app/blog",
  description: "Practical AI support documentation guides for support workers and disability providers.",
  publisher: { "@type": "Organization", name: "Aria Care" },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />

      <section className="relative overflow-hidden px-6 pt-28 pb-16">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
        <div className="dot-pattern absolute inset-0 opacity-25 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-aria-200 bg-aria-50 px-3 py-1 text-xs font-bold text-aria-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Practical support documentation guides
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
            Aria Care Blog
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
            Useful, plain-English articles for support workers, coordinators and providers who want faster notes, better handovers and safer review-ready drafts.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {posts.map((post) => {
            const Icon = post.icon;
            return (
              <Link key={post.href} href={post.href} className="card card-hover p-6 group">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-teal-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-wide text-aria-600">{post.eyebrow}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 group-hover:text-aria-700 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{post.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-aria-700">
                  Read guide <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
