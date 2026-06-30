export default function SocialProof() {
  const proofPoints = [
    { value: "Voice", label: "or bullet points in" },
    { value: "Draft", label: "structured for review" },
    { value: "Copy", label: "into ShiftCare or similar" },
    { value: "Human", label: "review before submitting" },
  ];

  return (
    <section className="py-12 px-6 border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
          No fake reviews. Just the workflow support workers need after a shift.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {proofPoints.map((stat) => (
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
