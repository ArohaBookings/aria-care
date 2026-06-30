// Deterministic detector for language that *may* indicate an NDIS Commission
// reportable incident or a restrictive practice. This NEVER decides for the
// worker — it only flags wording to prompt review and escalation. Safe by
// design: phrased as "possible", no auto-reporting, no clinical judgement.

export interface ReportableSignal {
  category: string;
  detail: string;
}

const RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "Possible death", pattern: /\b(died|death|deceased|passed away)\b/i },
  { category: "Possible serious injury", pattern: /\b(hospital|ambulance|fracture|broken bone|stitches|unconscious|seizure|head injury|serious injury|bleeding heavily|chok(?:ed|ing)|collapsed)\b/i },
  { category: "Possible abuse or neglect", pattern: /\b(abuse|neglect|assault(?:ed)?|hit|punch(?:ed)?|slapp?ed|kicked|withheld (?:food|medication|water)|left (?:alone )?unsafe|financial(?:ly)? exploit)\b/i },
  { category: "Possible unlawful sexual/physical contact", pattern: /\b(sexual (?:assault|abuse|contact)|inappropriate touching|grooming)\b/i },
  { category: "Possible restrictive practice (restraint/seclusion)", pattern: /\b(restrain(?:t|ed|ing)?|seclusion|secluded|locked (?:in|the door|them)|held down|physical hold|chemical restraint|mechanical restraint|environmental restraint|prn sedat\w*|tied|strapped down)\b/i },
  { category: "Possible medication error", pattern: /\b(wrong (?:medication|dose|med)|missed (?:medication|meds|dose)|double dose|medication error|overdose|gave (?:the )?wrong)\b/i },
];

export function detectReportableSignals(text: string): ReportableSignal[] {
  if (!text) return [];
  const found: ReportableSignal[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match && !seen.has(rule.category)) {
      seen.add(rule.category);
      found.push({ category: rule.category, detail: `Wording in the note: “${match[0]}”` });
    }
  }
  return found;
}
