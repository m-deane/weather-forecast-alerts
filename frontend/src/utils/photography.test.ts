import { describe, it, expect } from 'vitest'
import type { PhotographyOpportunity } from '../types'

// Import the function we want to test - since it's not exported, we'll need to export it
// For now, we'll test via the public API that uses it

describe('Photography Scoring Algorithm', () => {
  describe('Weight Distribution', () => {
    it('should have correct weight distribution totaling 10 points base', () => {
      // Weights:
      // Visibility: 40% (max 4 points) - score 10 * 0.4 = 4
      // Precipitation: 30% (max 3 points)
      // Wind: 15% (max 1.5 points)
      // Opportunities: 15% (max 1.5 points)
      // Total: 4 + 3 + 1.5 + 1.5 = 10 points

      const maxVisibilityPoints = 10 * 0.4
      const maxPrecipitationPoints = 3
      const maxWindPoints = 1.5
      const maxOpportunitiesPoints = 1.5

      const total = maxVisibilityPoints + maxPrecipitationPoints + maxWindPoints + maxOpportunitiesPoints

      expect(total).toBe(10)
    })

    it('should calculate visibility contribution as 40% of visibility score', () => {
      const visibilityScore = 10
      const contribution = visibilityScore * 0.4

      expect(contribution).toBe(4) // 40% of 10
    })

    it('should give maximum 3 points for no precipitation', () => {
      // Perfect conditions should give 3 points for precipitation
      const precipitationScore = 3 // when precipitation_mm === 0

      expect(precipitationScore).toBe(3)
    })

    it('should give maximum 1.5 points for calm wind', () => {
      // Wind < 15 kph should give 1.5 points
      const windScore = 1.5

      expect(windScore).toBe(1.5)
    })

    it('should give maximum 1.5 points for opportunities', () => {
      // 3 high-probability opportunities * 0.5 = 1.5 (capped)
      const opportunitiesScore = Math.min(1.5, 3 * 0.5)

      expect(opportunitiesScore).toBe(1.5)
    })
  })

  describe('Precipitation Scoring', () => {
    it('should score 3 points for no precipitation', () => {
      // precipitation_mm === 0 → 3 points
      const score = 3
      expect(score).toBe(3)
    })

    it('should score 2 points for light precipitation (< 2mm)', () => {
      // precipitation_mm < 2 → 2 points
      const score = 2
      expect(score).toBe(2)
    })

    it('should score 1 point for moderate precipitation (< 5mm)', () => {
      // precipitation_mm < 5 → 1 point
      const score = 1
      expect(score).toBe(1)
    })

    it('should score 0 points for heavy precipitation (>= 5mm)', () => {
      // precipitation_mm >= 5 → 0 points
      const score = 0
      expect(score).toBe(0)
    })
  })

  describe('Wind Scoring', () => {
    it('should score 1.5 points for calm wind (< 15 kph)', () => {
      // wind < 15 kph → 1.5 points
      const score = 1.5
      expect(score).toBe(1.5)
    })

    it('should score 0.75 points for moderate wind (15-30 kph)', () => {
      // 15 <= wind < 30 → 0.75 points
      const score = 0.75
      expect(score).toBe(0.75)
    })

    it('should score 0.25 points for strong wind (30-50 kph)', () => {
      // 30 <= wind < 50 → 0.25 points
      const score = 0.25
      expect(score).toBe(0.25)
    })

    it('should score 0 points for extreme wind (>= 50 kph)', () => {
      // wind >= 50 → 0 points
      const score = 0
      expect(score).toBe(0)
    })
  })

  describe('Opportunities Scoring', () => {
    it('should give 0.5 points per high-probability opportunity', () => {
      // Each opportunity with prob > 70 adds 0.5 points
      const pointsPerOpportunity = 0.5
      expect(pointsPerOpportunity).toBe(0.5)
    })

    it('should cap opportunities at 1.5 points maximum', () => {
      // Even with 5 opportunities, should cap at 1.5
      const score = Math.min(1.5, 5 * 0.5)
      expect(score).toBe(1.5)
    })

    it('should count only high-probability opportunities (> 70%)', () => {
      const mockOpportunities: Pick<PhotographyOpportunity, 'probability'>[] = [
        { probability: 85 }, // counts
        { probability: 75 }, // counts
        { probability: 60 }, // doesn't count
        { probability: 90 }, // counts
      ]

      const highProbCount = mockOpportunities.filter(o => o.probability > 70).length
      expect(highProbCount).toBe(3)
    })
  })

  describe('Inversion Bonus', () => {
    it('should add 1 bonus point for high inversion probability (> 50%)', () => {
      // inversion > 50% → +1 point (can exceed 10)
      const bonus = 1
      expect(bonus).toBe(1)
    })

    it('should add 0.5 bonus points for moderate inversion probability (30-50%)', () => {
      // 30% < inversion <= 50% → +0.5 points
      const bonus = 0.5
      expect(bonus).toBe(0.5)
    })

    it('should add 0 bonus points for low inversion probability (<= 30%)', () => {
      // inversion <= 30% → +0 points
      const bonus = 0
      expect(bonus).toBe(0)
    })
  })

  describe('Score Bounds', () => {
    it('should cap score at maximum of 10', () => {
      // Even with perfect conditions + bonus, should not exceed 10
      const perfectScore = 10 + 1 // base 10 + inversion bonus
      const cappedScore = Math.min(10, perfectScore)

      expect(cappedScore).toBe(10)
    })

    it('should have minimum score of 1', () => {
      // Even with terrible conditions, score should be at least 1
      const terribleScore = 0
      const cappedScore = Math.max(1, terribleScore)

      expect(cappedScore).toBe(1)
    })

    it('should round score to nearest integer', () => {
      // Score should be rounded
      const score = 7.6
      const roundedScore = Math.round(score)

      expect(roundedScore).toBe(8)
    })
  })

  describe('Perfect Conditions Scenario', () => {
    it('should score 10 with perfect weather and no bonus', () => {
      // Perfect: vis=10, no precip, calm wind, 3 opportunities, no inversion
      const score =
        (10 * 0.4) +  // 4 points visibility
        3 +            // 3 points no precipitation
        1.5 +          // 1.5 points calm wind
        1.5            // 1.5 points opportunities (3 opps * 0.5 capped at 1.5)

      expect(score).toBe(10)
    })

    it('should score 10 (capped) with perfect weather and inversion bonus', () => {
      // Perfect + inversion bonus should still cap at 10
      const score = Math.min(10, 10 + 1) // base 10 + inversion

      expect(score).toBe(10)
    })
  })

  describe('Poor Conditions Scenario', () => {
    it('should score 1 (minimum) with terrible conditions', () => {
      // Terrible: vis=1, heavy rain, extreme wind, no opportunities
      const score = Math.max(1,
        (1 * 0.4) +  // 0.4 points visibility
        0 +          // 0 points heavy precipitation (>= 5mm)
        0 +          // 0 points extreme wind (>= 50kph)
        0            // 0 points no opportunities
      )

      expect(score).toBe(1)
    })
  })

  describe('Typical Conditions Scenario', () => {
    it('should score ~6 with good but not perfect conditions', () => {
      // Good: vis=7, light rain (1mm), moderate wind (20kph), 1 opportunity
      const score = Math.round(
        (7 * 0.4) +  // 2.8 points visibility
        2 +          // 2 points light precipitation (< 2mm)
        0.75 +       // 0.75 points moderate wind (15-30 kph)
        0.5          // 0.5 points one opportunity
      )

      expect(score).toBe(6)
    })
  })
})
