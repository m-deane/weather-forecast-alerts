import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeekendOutlook } from '@/components/WeekendOutlook'
import type { DailyForecast, WeatherForecast } from '@/types'

/**
 * Focused test for the per-panel expand/collapse behaviour added to
 * WeekendOutlook. Pure rendering from the `allWeather` prop — no network.
 *
 * Fixed `now` = Wednesday 2026-06-17, so:
 *   - "This weekend"  → Sat 2026-06-20 / Sun 2026-06-21  (in range)
 *   - "Weekend after" → Sat 2026-06-27 / Sun 2026-06-28  (no data → OutOfRange)
 */

const NOW = new Date(2026, 5, 17, 12) // 2026-06-17, a Wednesday (month is 0-based)
const COLLAPSED_COUNT = 5

function dayForDate(date: string, score: number): DailyForecast {
  return {
    date,
    periods: [],
    summary: {
      max_temp_c: 10,
      min_temp_c: 2,
      total_precipitation_mm: 0,
      max_wind_speed_kph: 15,
      overall_hiking_score: score,
      best_period: 'am',
    },
  }
}

/** A mountain with Sat+Sun forecasts for THIS weekend only (weekend-after is out of range). */
function mountainWithThisWeekend(idx: number, score: number): WeatherForecast {
  return {
    location: {
      id: `munro-${idx}`,
      name: `Munro ${idx}`,
      area: 'Test Area',
      elevation_m: 1000,
      latitude: 57,
      longitude: -5,
      classification: 'munro',
      difficulty: 'moderate',
    },
    forecasts: [
      dayForDate('2026-06-20', score), // Saturday
      dayForDate('2026-06-21', score - 1), // Sunday
    ],
    last_updated: NOW.toISOString(),
    data_source: 'mountain-forecast.com',
    alerts: [],
  }
}

// 8 mountains — more than COLLAPSED_COUNT (5), so the expand button must appear
// for "This weekend". Descending scores keep ordering deterministic.
const ALL_WEATHER: WeatherForecast[] = Array.from({ length: 8 }, (_, i) =>
  mountainWithThisWeekend(i + 1, 9 - i)
)

describe('WeekendOutlook — per-panel expand/collapse', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderOutlook = (allWeather: WeatherForecast[] | undefined) =>
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <WeekendOutlook allWeather={allWeather} now={NOW} />
        </QueryClientProvider>
      </BrowserRouter>
    )

  /** The "This weekend" panel (card) — scoped so we don't match the other weekend. */
  function thisWeekendPanel(): HTMLElement {
    const heading = screen.getByRole('heading', { name: 'This weekend' })
    // header → border-b div; its parent is the card.
    const card = heading.closest('div.card') as HTMLElement
    expect(card).not.toBeNull()
    return card
  }

  it('renders only the collapsed count of munros initially, with a "Show all" button', () => {
    renderOutlook(ALL_WEATHER)

    const panel = thisWeekendPanel()
    // Collapsed: exactly COLLAPSED_COUNT munro rows visible.
    const rows = within(panel).getAllByRole('link')
    expect(rows).toHaveLength(COLLAPSED_COUNT)
    expect(within(panel).getByText('Munro 1')).toBeInTheDocument()
    expect(within(panel).getByText('Munro 5')).toBeInTheDocument()
    expect(within(panel).queryByText('Munro 6')).not.toBeInTheDocument()

    // The toggle exists, is collapsed, and labels the full total (8).
    const toggle = within(panel).getByRole('button', {
      name: /show all 8 munros for this weekend/i,
    })
    expect(toggle).toHaveTextContent('Show all 8 munros')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('reveals the rest when the toggle is clicked, then collapses again', () => {
    renderOutlook(ALL_WEATHER)
    const panel = thisWeekendPanel()
    const toggle = within(panel).getByRole('button', { name: /show all 8 munros/i })

    fireEvent.click(toggle)

    // Expanded: all 8 rows now visible, including the previously-hidden ones.
    expect(within(panel).getAllByRole('link')).toHaveLength(8)
    expect(within(panel).getByText('Munro 6')).toBeInTheDocument()
    expect(within(panel).getByText('Munro 8')).toBeInTheDocument()

    const collapseBtn = within(panel).getByRole('button', {
      name: /show fewer munros for this weekend/i,
    })
    expect(collapseBtn).toHaveTextContent('Show less')
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true')

    // Collapse again returns to COLLAPSED_COUNT.
    fireEvent.click(collapseBtn)
    expect(within(panel).getAllByRole('link')).toHaveLength(COLLAPSED_COUNT)
  })

  it('expands the two panels independently', () => {
    // Give the weekend-after data too, so both panels can expand.
    const both: WeatherForecast[] = ALL_WEATHER.map((w, i) => ({
      ...w,
      forecasts: [
        ...w.forecasts,
        dayForDate('2026-06-27', 8 - i), // weekend-after Saturday
        dayForDate('2026-06-28', 7 - i),
      ],
    }))
    renderOutlook(both)

    const thisPanel = thisWeekendPanel()
    const afterHeading = screen.getByRole('heading', { name: 'Weekend after' })
    const afterPanel = afterHeading.closest('div.card') as HTMLElement

    // Expand only "This weekend".
    fireEvent.click(within(thisPanel).getByRole('button', { name: /show all/i }))

    expect(within(thisPanel).getAllByRole('link')).toHaveLength(8)
    // "Weekend after" stays collapsed.
    expect(within(afterPanel).getAllByRole('link')).toHaveLength(COLLAPSED_COUNT)
    expect(
      within(afterPanel).getByRole('button', { name: /show all/i })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows the honest OutOfRange empty state and NO expand button for a no-data weekend', () => {
    // ALL_WEATHER has no weekend-after forecasts → that panel is out of range.
    renderOutlook(ALL_WEATHER)

    const afterHeading = screen.getByRole('heading', { name: 'Weekend after' })
    const afterPanel = afterHeading.closest('div.card') as HTMLElement

    expect(within(afterPanel).getByText('Not yet in forecast range')).toBeInTheDocument()
    // No munro rows and no toggle button in the empty panel.
    expect(within(afterPanel).queryAllByRole('link')).toHaveLength(0)
    expect(within(afterPanel).queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not render the expand button when there are fewer munros than the collapsed count', () => {
    const few = ALL_WEATHER.slice(0, 3) // 3 < COLLAPSED_COUNT
    renderOutlook(few)

    const panel = thisWeekendPanel()
    expect(within(panel).getAllByRole('link')).toHaveLength(3)
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument()
  })
})
