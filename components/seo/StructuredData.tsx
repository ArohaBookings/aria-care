const SITE_URL = "https://www.ariacare.app";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Aria Care",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      email: "support@ariacare.app",
      areaServed: ["Australia", "New Zealand"],
      founder: { "@type": "Person", name: "Leo" },
      foundingLocation: { "@type": "Country", name: "New Zealand" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Aria Care",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: "AI support documentation software that turns voice notes and bullet points into structured, review-ready support note drafts for individual workers and provider teams.",
      areaServed: ["Australia", "New Zealand"],
      audience: [
        { "@type": "Audience", audienceType: "Individual support workers" },
        { "@type": "Audience", audienceType: "Disability support providers" },
        { "@type": "Audience", audienceType: "NDIS and care coordinators" },
      ],
      featureList: [
        "Voice-to-progress-note drafts",
        "GoalLink Copilot for participant goals",
        "Adaptive Shift Debrief Mode",
        "Plan Review Evidence Packs",
        "Universal Platform Bridge for ShiftCare, Lumary, Brevity and CareMaster",
        "Photo import for rough handwritten or typed notes",
        "Dignity and Risk Guardian wording checks",
        "Documentation quality score",
        "Care signal radar",
        "Copy-ready ShiftCare-style output",
        "Solo and provider workflows",
        "Incident and handover draft support",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Aria Care Solo",
          price: "19",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/signup?plan=solo`,
        },
        {
          "@type": "Offer",
          name: "Aria Care Provider",
          price: "149",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/signup?plan=starter`,
        },
      ],
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Aria Care",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-AU",
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
