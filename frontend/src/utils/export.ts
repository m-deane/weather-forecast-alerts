import type { DailyForecast, WeatherPeriod } from '@/types'

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf'
  includeCharts: boolean
  dateRange: {
    start: Date
    end: Date
  }
  includedData: {
    temperature: boolean
    precipitation: boolean
    wind: boolean
    visibility: boolean
    hikingScores: boolean
    photography: boolean
  }
}

export function exportWeatherData(
  forecasts: DailyForecast[],
  location: any,
  options: ExportOptions
): void {
  const filteredForecasts = filterForecastsByDateRange(forecasts, options.dateRange)
  
  switch (options.format) {
    case 'csv':
      exportAsCSV(filteredForecasts, location, options)
      break
    case 'json':
      exportAsJSON(filteredForecasts, location, options)
      break
    case 'pdf':
      exportAsPDF(filteredForecasts, location, options)
      break
  }
}

function filterForecastsByDateRange(
  forecasts: DailyForecast[],
  dateRange: { start: Date; end: Date }
): DailyForecast[] {
  return forecasts.filter(forecast => {
    const forecastDate = new Date(forecast.date)
    return forecastDate >= dateRange.start && forecastDate <= dateRange.end
  })
}

function exportAsCSV(
  forecasts: DailyForecast[],
  location: any,
  options: ExportOptions
): void {
  const headers: string[] = ['Date', 'Period']
  
  if (options.includedData.temperature) {
    headers.push('Temperature (°C)', 'Feels Like (°C)')
  }
  if (options.includedData.precipitation) {
    headers.push('Precipitation (mm)')
  }
  if (options.includedData.wind) {
    headers.push('Wind Speed (km/h)', 'Wind Direction')
  }
  if (options.includedData.visibility) {
    headers.push('Visibility (m)')
  }
  if (options.includedData.hikingScores) {
    headers.push('Hiking Score', 'Risk Level')
  }

  const rows: string[] = [headers.join(',')]

  forecasts.forEach(forecast => {
    forecast.periods.forEach(period => {
      const row: string[] = [
        forecast.date,
        period.period_type.replace('_', ' ')
      ]

      if (options.includedData.temperature) {
        row.push(
          period.temperature_c.toString(),
          period.feels_like_c.toString()
        )
      }
      if (options.includedData.precipitation) {
        row.push(period.precipitation_mm.toString())
      }
      if (options.includedData.wind) {
        row.push(
          period.wind_speed_kph.toString(),
          `"${period.wind_direction}"`
        )
      }
      if (options.includedData.visibility) {
        row.push(period.visibility_m != null ? period.visibility_m.toString() : 'N/A')
      }
      if (options.includedData.hikingScores) {
        row.push(
          period.hiking_score.toString(),
          `"${period.risk_level}"`
        )
      }

      rows.push(row.join(','))
    })
  })

  const csvContent = rows.join('\\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const fileName = `${location.name.replace(/\\s+/g, '_')}_weather_${formatDateForFilename(new Date())}.csv`
  
  downloadFile(blob, fileName)
}

function exportAsJSON(
  forecasts: DailyForecast[],
  location: any,
  options: ExportOptions
): void {
  const exportData = {
    metadata: {
      location: {
        name: location.name,
        area: location.area,
        elevation: location.elevation_m,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      },
      exportedAt: new Date().toISOString(),
      dateRange: {
        start: options.dateRange.start.toISOString(),
        end: options.dateRange.end.toISOString()
      },
      includedData: options.includedData
    },
    forecasts: forecasts.map(forecast => ({
      date: forecast.date,
      summary: forecast.summary,
      periods: forecast.periods.map(period => {
        const exportPeriod: any = {
          period_type: period.period_type,
          weather_description: period.weather_description
        }

        if (options.includedData.temperature) {
          exportPeriod.temperature_c = period.temperature_c
          exportPeriod.feels_like_c = period.feels_like_c
        }
        if (options.includedData.precipitation) {
          exportPeriod.precipitation_mm = period.precipitation_mm
        }
        if (options.includedData.wind) {
          exportPeriod.wind_speed_kph = period.wind_speed_kph
          exportPeriod.wind_direction = period.wind_direction
        }
        if (options.includedData.visibility) {
          exportPeriod.visibility_m = period.visibility_m
        }
        if (options.includedData.hikingScores) {
          exportPeriod.hiking_score = period.hiking_score
          exportPeriod.risk_level = period.risk_level
        }

        return exportPeriod
      })
    }))
  }

  const jsonContent = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const fileName = `${location.name.replace(/\\s+/g, '_')}_weather_${formatDateForFilename(new Date())}.json`
  
  downloadFile(blob, fileName)
}

function exportAsPDF(
  forecasts: DailyForecast[],
  location: any,
  options: ExportOptions
): void {
  // Create a simple HTML document for PDF conversion
  const htmlContent = generatePDFHTML(forecasts, location, options)
  
  // Open print dialog for PDF export
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    
    // Trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }
}

function generatePDFHTML(
  forecasts: DailyForecast[],
  location: any,
  options: ExportOptions
): string {
  const tableRows = forecasts.map(forecast => 
    forecast.periods.map(period => `
      <tr>
        <td>${forecast.date}</td>
        <td>${period.period_type.replace('_', ' ')}</td>
        ${options.includedData.temperature ? `
          <td>${period.temperature_c}°C</td>
          <td>${period.feels_like_c}°C</td>
        ` : ''}
        ${options.includedData.precipitation ? `
          <td>${period.precipitation_mm}mm</td>
        ` : ''}
        ${options.includedData.wind ? `
          <td>${period.wind_speed_kph} km/h ${period.wind_direction}</td>
        ` : ''}
        ${options.includedData.visibility ? `
          <td>${period.visibility_m != null ? period.visibility_m + 'm' : 'N/A'}</td>
        ` : ''}
        ${options.includedData.hikingScores ? `
          <td>${period.hiking_score}/10</td>
          <td>${period.risk_level}</td>
        ` : ''}
      </tr>
    `).join('')
  ).join('')

  const headers = [
    'Date', 'Period',
    ...(options.includedData.temperature ? ['Temperature', 'Feels Like'] : []),
    ...(options.includedData.precipitation ? ['Precipitation'] : []),
    ...(options.includedData.wind ? ['Wind'] : []),
    ...(options.includedData.visibility ? ['Visibility'] : []),
    ...(options.includedData.hikingScores ? ['Hiking Score', 'Risk Level'] : [])
  ]

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Weather Report - ${location.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            font-size: 12px;
          }
          h1 { 
            color: #2563eb; 
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          .metadata {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>Weather Forecast Report</h1>
        
        <div class="metadata">
          <p><strong>Location:</strong> ${location.name} (${location.area})</p>
          <p><strong>Elevation:</strong> ${location.elevation_m}m</p>
          <p><strong>Coordinates:</strong> ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</p>
          <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Forecast Period:</strong> ${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}</p>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by Scottish Mountain Weather App</p>
          <p>Data source: Mountain-forecast.com</p>
        </div>
      </body>
    </html>
  `
}

function downloadFile(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '')
}

export function generateExportOptions(): ExportOptions {
  return {
    format: 'csv',
    includeCharts: false,
    dateRange: {
      start: new Date(),
      end: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 6 days from now
    },
    includedData: {
      temperature: true,
      precipitation: true,
      wind: true,
      visibility: true,
      hikingScores: true,
      photography: false
    }
  }
}