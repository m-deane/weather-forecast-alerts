// Single source of truth for the hiking-safety verdict scale.
//
// Every consumer (map markers, map legend, map popup pill, the GoNoGoSummary
// verdict table) must route through getVerdict + these token/glyph maps so the
// scale can never silently desync on a safety key.
//
// Threshold contract (canonical — matches GoNoGoSummary's intended scale):
//   null / undefined -> UNKNOWN   (never fabricate a safety verdict)
//   score >= 7       -> GO
//   score >= 4       -> CAUTION
//   score <  4       -> NO-GO     (a true 0 correctly reaches NO-GO)

export type Verdict = 'GO' | 'CAUTION' | 'NO-GO' | 'UNKNOWN'

export function getVerdict(score?: number | null): Verdict {
  if (score === null || score === undefined) return 'UNKNOWN'
  if (score >= 7) return 'GO'
  if (score >= 4) return 'CAUTION'
  return 'NO-GO' // score < 4 — and a true 0 now correctly reaches NO-GO
}

// Fill colour per verdict (hue channel). Traffic-light hexes kept maximally
// separable; NO-GO red is never desaturated.
export const VERDICT_TOKEN: Record<Verdict, string> = {
  GO: '#22c55e',
  CAUTION: '#f59e0b',
  'NO-GO': '#ef4444',
  UNKNOWN: '#64748b',
}

// Greyscale-safe / colour-blind-safe glyph per verdict (the non-hue channel).
// UNKNOWN carries no glyph — it is a hollow stroke-only pin.
export const VERDICT_GLYPH: Record<Verdict, string> = {
  GO: '✓',
  CAUTION: '!',
  'NO-GO': '✕',
  UNKNOWN: '',
}
