"use client";
import Link from "next/link";
import { Check, Zap } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: 149,
    participants: "Up to 10",
    desc: "Perfect for solo operators and small providers just getting started.",
    features: [
      "Voice-to-progress-note",
      "AI document suite",
      "Compliance dashboard",
      "Up to 3 staff accounts",
      "14-day audit history",
      "Email support",
    ],
    cta: "Start free trial",
    popular: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  {
    name: "Growth",
    price: 349,
    participants: "Up to 30",
    desc: "For growing providers who need billing intelligence and rostering.",
    features: [
      "Everything in Starter",
      "Intelligent billing assistant",
      "Smart rostering",
      "Participant portal",
      "Unlimited staff accounts",
      "Full audit history",
      "Priority support",
      "NDIS claim file export",
    ],
    cta: "Start free trial",
    popular: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
  },
  {
    name: "Business",
    price: 699,
    participants: "Up to 75",
    desc: "For established providers who need the full AI coordinator agent.",
    features: [
      "Everything in Growth",
      "AI coordinator agent",
      "Audit pack generator",
      "Participant family portal",
      "Custom report builder",
      "API access",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Start free trial",
    popular: false,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-title mb-3">Pricing</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Priced by participants,
            <br />
            <span className="text-gradient-teal">not per seat.</span>
          </h2>
          <p className="text-slate-600 text-lg">
            Because that&apos;s how NDIS providers think. One filled cohort pays for Aria for 2 years.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col ${
                plan.popular
                  ? "bg-slate-900 text-white border border-slate-800 shadow-xl"
                  : "card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-aria-gradient text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <p className={`text-sm font-bold mb-1 ${plan.popular ? "text-aria-300" : "text-aria-600"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`font-display text-5xl font-bold ${plan.popular ? "text-white" : "text-slate-900"}`}>${plan.price}</span>
                  <span className={`mb-2 text-sm ${plan.popular ? "text-slate-400" : "text-slate-500"}`}>/month</span>
                </div>
                <p className={`text-xs font-semibold mb-2 ${plan.popular ? "text-aria-300" : "text-aria-600"}`}>{plan.participants} participants</p>
                <p className={`text-sm leading-relaxed ${plan.popular ? "text-slate-400" : "text-slate-600"}`}>{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-aria-400" : "text-aria-500"}`} />
                    <span className={plan.popular ? "text-slate-300" : "text-slate-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=${plan.name.toLowerCase()}`}
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? "bg-aria-500 hover:bg-aria-400 text-white shadow-teal"
                    : "btn-secondary justify-center"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            All plans include a 14-day free trial · No credit card required · Cancel anytime
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Need more than 75 participants?{" "}
            <a href="mailto:hello@aria.care" className="text-aria-600 font-semibold hover:underline">
              Talk to us about Enterprise →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
