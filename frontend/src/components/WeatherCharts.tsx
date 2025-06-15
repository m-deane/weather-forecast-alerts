import React, { useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'
import { 
  ChartBarIcon,
  CloudIcon,
  SunIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { formatTemperature, formatWindSpeed, formatPrecipitation } from '@/utils/weather'
import type { DailyForecast, WeatherPeriod } from '@/types'

interface WeatherChartsProps {
  forecasts: DailyForecast[]
  preferences: any
}

interface ChartDataPoint {
  date: string
  day: string
  maxTemp: number
  minTemp: number
  avgTemp: number
  precipitation: number
  windSpeed: number
  hikingScore: number
  visibility: number
  humidity: number
}

interface PeriodDataPoint {
  time: string
  period: string
  temperature: number
  feelsLike: number
  precipitation: number
  windSpeed: number
  humidity: number
  visibility: number
  hikingScore: number
}

export function WeatherCharts({ forecasts, preferences }: WeatherChartsProps) {
  const [activeChart, setActiveChart] = useState<'overview' | 'temperature' | 'precipitation' | 'wind' | 'periods'>('overview')
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null)

  // Prepare daily chart data
  const dailyData: ChartDataPoint[] = forecasts.map((forecast, index) => {
    const date = new Date(forecast.date)
    return {
      date: forecast.date,
      day: index === 0 ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' }),
      maxTemp: forecast.summary.max_temp_c,
      minTemp: forecast.summary.min_temp_c,
      avgTemp: Math.round((forecast.summary.max_temp_c + forecast.summary.min_temp_c) / 2),
      precipitation: forecast.summary.total_precipitation_mm,
      windSpeed: forecast.summary.max_wind_speed_kph,
      hikingScore: forecast.summary.overall_hiking_score,
      visibility: forecast.periods[0]?.visibility_m ? forecast.periods[0].visibility_m / 1000 : 0,
      humidity: forecast.periods[0]?.humidity_percent || 0
    }
  })

  // Prepare period data for detailed view
  const periodData: PeriodDataPoint[] = selectedDay
    ? selectedDay.periods.map((period, index) => ({
        time: `${index * 8}:00`,
        period: period.period_type,
        temperature: period.temperature_c,
        feelsLike: period.feels_like_c,
        precipitation: period.precipitation_mm,
        windSpeed: period.wind_speed_kph,
        humidity: period.humidity_percent || 0,
        visibility: period.visibility_m ? period.visibility_m / 1000 : 0,
        hikingScore: period.hiking_score
      }))
    : []

  const chartOptions = [
    { id: 'overview', title: 'Overview', icon: ChartBarIcon },
    { id: 'temperature', title: 'Temperature', icon: SunIcon },
    { id: 'precipitation', title: 'Precipitation', icon: CloudIcon },
    { id: 'wind', title: 'Wind & Visibility', icon: EyeIcon },
    { id: 'periods', title: 'Day Detail', icon: ArrowPathIcon },
  ] as const

  return (
    <div className="space-y-4">
      {/* Chart selector */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6" />
          Weather Trends
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {chartOptions.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => setActiveChart(option.id as any)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeChart === option.id
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.title}</span>
              </button>
            )
          })}
        </div>

        {/* Day selector for period view */}
        {activeChart === 'periods' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Day for Detailed View:</label>
            <select
              value={selectedDay?.date || ''}
              onChange={(e) => {
                const day = forecasts.find(f => f.date === e.target.value)
                setSelectedDay(day || null)
              }}
              className="text-sm border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Choose a day...</option>
              {forecasts.map((forecast, index) => (
                <option key={forecast.date} value={forecast.date}>
                  {index === 0 ? 'Today' : new Date(forecast.date).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chart display */}
        <div className="h-80">
          {activeChart === 'overview' && <OverviewChart data={dailyData} preferences={preferences} />}
          {activeChart === 'temperature' && <TemperatureChart data={dailyData} preferences={preferences} />}
          {activeChart === 'precipitation' && <PrecipitationChart data={dailyData} />}
          {activeChart === 'wind' && <WindVisibilityChart data={dailyData} preferences={preferences} />}
          {activeChart === 'periods' && selectedDay && <PeriodDetailChart data={periodData} preferences={preferences} />}
          {activeChart === 'periods' && !selectedDay && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ArrowPathIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a day to view detailed period breakdown</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewChart({ data, preferences }: { data: ChartDataPoint[]; preferences: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="day" 
          tick={{ fontSize: 12 }}
          axisLine={false}
        />
        <YAxis 
          yAxisId="temp"
          orientation="left"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: `Temp (°${preferences?.units?.temperature || 'C'})`, angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="score"
          orientation="right"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: 'Hiking Score', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: string) => {
            if (name === 'maxTemp' || name === 'minTemp') {
              return [`${value}°${preferences?.units?.temperature || 'C'}`, name === 'maxTemp' ? 'High' : 'Low']
            }
            if (name === 'hikingScore') return [`${value}/10`, 'Hiking Score']
            return [value, name]
          }}
        />
        <Legend />
        <Area
          yAxisId="temp"
          type="monotone"
          dataKey="maxTemp"
          stackId="1"
          stroke="#ef4444"
          fill="#fee2e2"
          name="High Temp"
        />
        <Area
          yAxisId="temp"
          type="monotone"
          dataKey="minTemp"
          stackId="1"
          stroke="#3b82f6"
          fill="#dbeafe"
          name="Low Temp"
        />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="hikingScore"
          stroke="#10b981"
          strokeWidth={3}
          name="Hiking Score"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function TemperatureChart({ data, preferences }: { data: ChartDataPoint[]; preferences: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="day" 
          tick={{ fontSize: 12 }}
          axisLine={false}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: `Temperature (°${preferences?.units?.temperature || 'C'})`, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: string) => {
            const tempUnit = preferences?.units?.temperature || 'C'
            if (name === 'maxTemp') return [`${value}°${tempUnit}`, 'High']
            if (name === 'minTemp') return [`${value}°${tempUnit}`, 'Low']
            if (name === 'avgTemp') return [`${value}°${tempUnit}`, 'Average']
            return [value, name]
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="maxTemp"
          stroke="#ef4444"
          strokeWidth={2}
          name="High"
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="minTemp"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Low"
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="avgTemp"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Average"
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PrecipitationChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="day" 
          tick={{ fontSize: 12 }}
          axisLine={false}
        />
        <YAxis 
          yAxisId="precip"
          orientation="left"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: 'Precipitation (mm)', angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="humidity"
          orientation="right"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: string) => {
            if (name === 'precipitation') return [`${value}mm`, 'Precipitation']
            if (name === 'humidity') return [`${value}%`, 'Humidity']
            return [value, name]
          }}
        />
        <Legend />
        <Bar
          yAxisId="precip"
          dataKey="precipitation"
          fill="#3b82f6"
          name="Precipitation"
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="humidity"
          type="monotone"
          dataKey="humidity"
          stroke="#10b981"
          strokeWidth={2}
          name="Humidity"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function WindVisibilityChart({ data, preferences }: { data: ChartDataPoint[]; preferences: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="day" 
          tick={{ fontSize: 12 }}
          axisLine={false}
        />
        <YAxis 
          yAxisId="wind"
          orientation="left"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: `Wind (${preferences?.units?.wind || 'km/h'})`, angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="visibility"
          orientation="right"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: 'Visibility (km)', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: string) => {
            if (name === 'windSpeed') return [`${value} ${preferences?.units?.wind || 'km/h'}`, 'Wind Speed']
            if (name === 'visibility') return [`${value}km`, 'Visibility']
            return [value, name]
          }}
        />
        <Legend />
        <Area
          yAxisId="wind"
          type="monotone"
          dataKey="windSpeed"
          stroke="#f59e0b"
          fill="#fef3c7"
          name="Wind Speed"
        />
        <Line
          yAxisId="visibility"
          type="monotone"
          dataKey="visibility"
          stroke="#6366f1"
          strokeWidth={2}
          name="Visibility"
          dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function PeriodDetailChart({ data, preferences }: { data: PeriodDataPoint[]; preferences: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          axisLine={false}
        />
        <YAxis 
          yAxisId="temp"
          orientation="left"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: `Temp (°${preferences?.units?.temperature || 'C'})`, angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="score"
          orientation="right"
          tick={{ fontSize: 12 }}
          axisLine={false}
          label={{ value: 'Hiking Score', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: string) => {
            const tempUnit = preferences?.units?.temperature || 'C'
            if (name === 'temperature') return [`${value}°${tempUnit}`, 'Temperature']
            if (name === 'feelsLike') return [`${value}°${tempUnit}`, 'Feels Like']
            if (name === 'hikingScore') return [`${value}/10`, 'Hiking Score']
            if (name === 'precipitation') return [`${value}mm`, 'Precipitation']
            return [value, name]
          }}
        />
        <Legend />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temperature"
          stroke="#ef4444"
          strokeWidth={2}
          name="Temperature"
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="feelsLike"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Feels Like"
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
        />
        <Bar
          yAxisId="temp"
          dataKey="precipitation"
          fill="#3b82f6"
          name="Precipitation"
          opacity={0.6}
        />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="hikingScore"
          stroke="#10b981"
          strokeWidth={3}
          name="Hiking Score"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}