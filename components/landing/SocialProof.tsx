export default function SocialProof() {
  return (
    <section className="py-12 px-6 border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
          Trusted by NDIS providers across Australia & New Zealand
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "10 hrs", label: "saved per worker/week" },
            { value: "47,000+", label: "NDIS providers in our market" },
            { value: "98%", label: "note approval rate first-time" },
            { value: "$0", label: "in missed claims since launch" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
