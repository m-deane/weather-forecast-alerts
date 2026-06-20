import { CloudIcon } from '@heroicons/react/24/outline'
import type { DailyForecast } from '@/types'

interface WeatherNarrativeProps {
  forecast: DailyForecast
  locationName: string
  elevation?: number
}

function getWindNarrative(windSpeed: number, windDirection: string): string {
  if (windSpeed > 80) {
    return `Storm force winds from the ${windDirection}, extremely dangerous on exposed ridges`
  }
  if (windSpeed > 50) {
    return `Strong to gale force winds from the ${windDirection}`
  }
  if (windSpeed > 30) {
    return `Moderate to fresh winds from the ${windDirection}`
  }
  if (windSpeed > 15) {
    return `Light to moderate winds from the ${windDirection}`
  }
  return 'Light winds'
}

function getPrecipNarrative(rain: number, temp: number): string {
  if (rain <= 0) {
    return 'Dry conditions'
  }
  if (temp <= 0 && rain > 5) {
    return 'Heavy snowfall expected'
  }
  if (temp <= 0) {
    return 'Some snow possible'
  }
  if (rain > 10) {
    return 'Heavy and persistent rain expected'
  }
  if (rain > 5) {
    return 'Persistent rain expected'
  }
  if (rain > 1) {
    return 'Some rain, possibly heavy at times'
  }
  return 'Light drizzle possible'
}

function getTempNarrative(maxTemp: number, minTemp: number, feelsLike: number): string {
  if (minTemp < -10) {
    return `Severe cold with temperatures between ${minTemp}\u00B0C and ${maxTemp}\u00B0C, wind chill down to ${feelsLike}\u00B0C`
  }
  if (minTemp < 0) {
    return `Sub-zero temperatures between ${minTemp}\u00B0C and ${maxTemp}\u00B0C with wind chill of ${feelsLike}\u00B0C`
  }
  if (maxTemp > 25) {
    return `Warm for the mountains at ${maxTemp}\u00B0C, carry extra water`
  }
  if (maxTemp > 15) {
    return `Mild temperatures around ${maxTemp}\u00B0C`
  }
  return `Cool at summit level, ${minTemp}\u00B0C to ${maxTemp}\u00B0C`
}

function getVisibilityNarrative(cloudBase: number | undefined, elevation: number | undefined): string {
  if (!cloudBase || !elevation) {
    return ''
  }
  if (cloudBase < elevation) {
    return 'Cloud on the summits, poor visibility likely.'
  }
  if (cloudBase < elevation + 200) {
    return 'Cloud base close to summit level, visibility may deteriorate.'
  }
  return 'Clear above summit level with good visibility.'
}

function getOverallAssessment(score: number | null, mainConcern: string): string {
  // No real score on the estimated path — describe conditions without an overall safety verdict
  if (score === null) {
    return `Estimated data only — no overall suitability rating available. Main concern: ${mainConcern}. Do not rely on this for safety decisions.`
  }
  if (score >= 8) {
    return 'An excellent day for the hills.'
  }
  if (score >= 7) {
    return 'A good day out with favourable conditions.'
  }
  if (score >= 5) {
    return `Reasonable conditions but be prepared for ${mainConcern}.`
  }
  if (score >= 3) {
    return `Challenging conditions \u2014 experience required. Main concern: ${mainConcern}.`
  }
  return 'Dangerous conditions \u2014 strongly advised to avoid the mountain.'
}

function identifyMainConcern(forecast: DailyForecast): string {
  const concerns: { factor: string; severity: number }[] = []
  const wind = forecast.summary.max_wind_speed_kph
  const rain = forecast.summary.total_precipitation_mm
  const minTemp = forecast.summary.min_temp_c

  if (wind > 30) {
    concerns.push({ factor: 'strong winds', severity: (wind - 30) / 10 })
  }
  if (rain > 1) {
    concerns.push({ factor: 'rain', severity: rain / 5 })
  }
  if (minTemp < 0) {
    concerns.push({ factor: 'cold temperatures', severity: Math.abs(minTemp) / 5 })
  }

  concerns.sort((a, b) => b.severity - a.severity)
  return concerns[0]?.factor ?? 'variable conditions'
}

export function WeatherNarrative({ forecast, locationName, elevation }: WeatherNarrativeProps) {
  const period = forecast.periods[0]
  if (!period) return null

  const windNarrative = getWindNarrative(
    forecast.summary.max_wind_speed_kph,
    period.wind_direction
  )
  const precipNarrative = getPrecipNarrative(
    forecast.summary.total_precipitation_mm,
    forecast.summary.min_temp_c
  )
  const tempNarrative = getTempNarrative(
    forecast.summary.max_temp_c,
    forecast.summary.min_temp_c,
    period.feels_like_c
  )
  const visibilityNarrative = getVisibilityNarrative(period.cloud_base_m, elevation)
  const mainConcern = identifyMainConcern(forecast)
  const assessment = getOverallAssessment(
    forecast.summary.overall_hiking_score,
    mainConcern
  )

  const elevationStr = elevation ? ` (${elevation}m)` : ''
  const dateStr = new Date(forecast.date).toLocaleDateString('en-GB', {
    weekday: 'long',
  })

  const narrative = [
    `${dateStr} on ${locationName}${elevationStr}: ${windNarrative}.`,
    precipNarrative + '.',
    tempNarrative + '.',
    visibilityNarrative,
    assessment,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="card" aria-label="Weather narrative summary">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <CloudIcon className="w-5 h-5 text-emerald-500" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Forecast Summary
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {narrative}
          </p>
        </div>
      </div>
    </section>
  )
}
