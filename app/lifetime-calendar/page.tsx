'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Moon, Briefcase, Car, GraduationCap, Dumbbell, X, Info, RotateCcw, Droplets, ChevronDown, Settings2, Sparkles, Calendar, CalendarDays, Grid3X3 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// MATHEMATICAL FOUNDATION
// ═══════════════════════════════════════════════════════════════════════════════
const TOTAL_YEARS = 75
const CHILDHOOD_YEARS = 15
const ADULT_YEARS = TOTAL_YEARS - CHILDHOOD_YEARS // 60 years
const DAYS_PER_YEAR = 365.25
const WEEKS_PER_YEAR = 52.17
const MONTHS_PER_YEAR = 12
const HOURS_PER_DAY = 24

// The excluded childhood (not shown in tank)
const CHILDHOOD_HOURS = CHILDHOOD_YEARS * DAYS_PER_YEAR * HOURS_PER_DAY // 131,490 hours

// The Adult Resource Tank - Different scales
const ADULT_DAYS = Math.floor(ADULT_YEARS * DAYS_PER_YEAR) // 21,915 day-units
const ADULT_WEEKS = Math.floor(ADULT_YEARS * WEEKS_PER_YEAR) // ~3,130 week-units
const ADULT_MONTHS = ADULT_YEARS * MONTHS_PER_YEAR // 720 month-units
const ADULT_HOURS = ADULT_DAYS * HOURS_PER_DAY // 525,960 hours

const STORAGE_KEY = 'hsnzas-resource-tank-v3'

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW SCALE TYPES
// ═══════════════════════════════════════════════════════════════════════════════
type ViewScale = 'months' | 'weeks' | 'days'

const VIEW_SCALES: { id: ViewScale; label: string; units: number; icon: typeof Calendar; color: string; description: string }[] = [
  { id: 'months', label: 'Months', units: ADULT_MONTHS, icon: Calendar, color: 'bg-indigo-500', description: 'Life at a glance' },
  { id: 'weeks', label: 'Weeks', units: ADULT_WEEKS, icon: CalendarDays, color: 'bg-emerald-500', description: 'Sprint planning' },
  { id: 'days', label: 'Days', units: ADULT_DAYS, icon: Grid3X3, color: 'bg-rose-500', description: 'Execution mode' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════════
const COLORS = [
  { name: 'Slate', hex: '#64748b', light: '#94a3b8' },
  { name: 'Indigo', hex: '#6366f1', light: '#818cf8' },
  { name: 'Amber', hex: '#f59e0b', light: '#fbbf24' },
  { name: 'Emerald', hex: '#10b981', light: '#34d399' },
  { name: 'Rose', hex: '#f43f5e', light: '#fb7185' },
  { name: 'Cyan', hex: '#06b6d4', light: '#22d3ee' },
  { name: 'Violet', hex: '#8b5cf6', light: '#a78bfa' },
  { name: 'Orange', hex: '#f97316', light: '#fb923c' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════════
const PRESETS = [
  { name: 'Sleep', hours: 8, icon: Moon, colorIndex: 0 },
  { name: 'Work', hours: 8, icon: Briefcase, colorIndex: 1 },
  { name: 'Commute', hours: 1.5, icon: Car, colorIndex: 2 },
  { name: 'Education', hours: 2, icon: GraduationCap, colorIndex: 3 },
  { name: 'Exercise', hours: 1, icon: Dumbbell, colorIndex: 4 },
]

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
interface PrecisionSettings {
  daysPerWeek: number
  weeksPerMonth: number
  monthsPerYear: number
  yearsPerLifetime: number
}

interface ResourceLabel {
  id: string
  name: string
  hoursPerDay: number
  colorIndex: number
  precision: PrecisionSettings
}

interface StoredData {
  currentAge: number | null
  labels: ResourceLabel[]
  viewScale: ViewScale
}

interface TankBlock {
  name: string
  units: number
  startIndex: number
  endIndex: number
  color: string
  lightColor: string
  isSpent: boolean
  years: number
}

interface PopupData {
  block: TankBlock
  unitIndex: number
  x: number
  y: number
}

// Default precision (full-time activity)
const DEFAULT_PRECISION: PrecisionSettings = {
  daysPerWeek: 7,
  weeksPerMonth: 4,
  monthsPerYear: 12,
  yearsPerLifetime: 60,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRECISION CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════
function calculateDayUnits(hoursPerDay: number, precision: PrecisionSettings): number {
  const hourFraction = hoursPerDay / HOURS_PER_DAY
  const dayFraction = precision.daysPerWeek / 7
  const weekFraction = precision.weeksPerMonth / 4
  const monthFraction = precision.monthsPerYear / 12
  const yearFraction = precision.yearsPerLifetime / ADULT_YEARS
  
  return Math.floor(hourFraction * dayFraction * weekFraction * monthFraction * yearFraction * ADULT_DAYS)
}

// Convert day units to different scales
function convertToScale(dayUnits: number, scale: ViewScale): number {
  switch (scale) {
    case 'months':
      return Math.floor((dayUnits / ADULT_DAYS) * ADULT_MONTHS)
    case 'weeks':
      return Math.floor((dayUnits / ADULT_DAYS) * ADULT_WEEKS)
    case 'days':
    default:
      return dayUnits
  }
}

function getTotalUnitsForScale(scale: ViewScale): number {
  switch (scale) {
    case 'months': return ADULT_MONTHS
    case 'weeks': return ADULT_WEEKS
    case 'days': return ADULT_DAYS
  }
}

function calculateYears(hoursPerDay: number, precision: PrecisionSettings): number {
  const dayUnits = calculateDayUnits(hoursPerDay, precision)
  return dayUnits / DAYS_PER_YEAR
}

function calculateEffectiveHoursPerDay(hoursPerDay: number, precision: PrecisionSettings): number {
  const dayFraction = precision.daysPerWeek / 7
  const weekFraction = precision.weeksPerMonth / 4
  const monthFraction = precision.monthsPerYear / 12
  const yearFraction = precision.yearsPerLifetime / ADULT_YEARS
  
  return hoursPerDay * dayFraction * weekFraction * monthFraction * yearFraction
}

// Get unit label for tooltip
function getUnitLabel(unitIndex: number, scale: ViewScale): string {
  switch (scale) {
    case 'months': {
      const year = Math.floor(unitIndex / 12) + 15 // Start from age 15
      const month = (unitIndex % 12) + 1
      return `Year ${year}, Month ${month}`
    }
    case 'weeks': {
      const year = Math.floor(unitIndex / WEEKS_PER_YEAR) + 15
      const week = Math.floor(unitIndex % WEEKS_PER_YEAR) + 1
      return `Year ${Math.floor(year)}, Week ${week}`
    }
    case 'days': {
      const year = Math.floor(unitIndex / DAYS_PER_YEAR) + 15
      const dayOfYear = Math.floor(unitIndex % DAYS_PER_YEAR) + 1
      return `Year ${Math.floor(year)}, Day ${dayOfYear}`
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ResourceTankPage() {
  const [currentAge, setCurrentAge] = useState<number | null>(null)
  const [labels, setLabels] = useState<ResourceLabel[]>([])
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelHours, setNewLabelHours] = useState('')
  const [selectedColorIndex, setSelectedColorIndex] = useState(2)
  const [isLoaded, setIsLoaded] = useState(false)
  const [popup, setPopup] = useState<PopupData | null>(null)
  const [viewScale, setViewScale] = useState<ViewScale>('months')
  
  // Precision settings for new labels
  const [showPrecision, setShowPrecision] = useState(false)
  const [newPrecision, setNewPrecision] = useState<PrecisionSettings>(DEFAULT_PRECISION)

  // ─────────────────────────────────────────────────────────────────────────────
  // LOAD FROM LOCALSTORAGE
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: StoredData = JSON.parse(stored)
        setCurrentAge(data.currentAge)
        setLabels((data.labels || []).map(l => ({
          ...l,
          precision: l.precision || DEFAULT_PRECISION,
        })))
        if (data.viewScale) setViewScale(data.viewScale)
      }
    } catch (e) {
      console.error('Failed to load:', e)
    }
    setIsLoaded(true)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE TO LOCALSTORAGE
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return
    try {
      const data: StoredData = { currentAge, labels, viewScale }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save:', e)
    }
  }, [currentAge, labels, viewScale, isLoaded])

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const totalUnits = getTotalUnitsForScale(viewScale)

  const totalEffectiveHoursPerDay = useMemo(() => 
    labels.reduce((sum, l) => sum + calculateEffectiveHoursPerDay(l.hoursPerDay, l.precision), 0)
  , [labels])

  const remainingHoursPerDay = Math.max(0, HOURS_PER_DAY - totalEffectiveHoursPerDay)

  // Units spent since turning 15 (scaled)
  const unitsSpent = useMemo(() => {
    if (!currentAge || currentAge < CHILDHOOD_YEARS) return 0
    const adultYears = Math.min(currentAge - CHILDHOOD_YEARS, ADULT_YEARS)
    const daysSpent = Math.floor(adultYears * DAYS_PER_YEAR)
    return convertToScale(daysSpent, viewScale)
  }, [currentAge, viewScale])

  // ─────────────────────────────────────────────────────────────────────────────
  // TANK BLOCKS CALCULATION (Strict Solid Block Logic - Scaled)
  // ─────────────────────────────────────────────────────────────────────────────
  const tankBlocks = useMemo((): TankBlock[] => {
    const blocks: TankBlock[] = []
    let currentIndex = 0

    for (const label of labels) {
      const dayUnits = calculateDayUnits(label.hoursPerDay, label.precision)
      const scaledUnits = convertToScale(dayUnits, viewScale)
      const years = calculateYears(label.hoursPerDay, label.precision)

      if (scaledUnits > 0) {
        blocks.push({
          name: label.name,
          units: scaledUnits,
          startIndex: currentIndex,
          endIndex: currentIndex + scaledUnits - 1,
          color: COLORS[label.colorIndex].hex,
          lightColor: COLORS[label.colorIndex].light,
          isSpent: false,
          years,
        })
        currentIndex += scaledUnits
      }
    }

    // Remaining unallocated
    const unallocatedUnits = totalUnits - currentIndex
    if (unallocatedUnits > 0) {
      const years = (unallocatedUnits / totalUnits) * ADULT_YEARS
      blocks.push({
        name: 'Unallocated',
        units: unallocatedUnits,
        startIndex: currentIndex,
        endIndex: totalUnits - 1,
        color: '#f1f5f9',
        lightColor: '#f8fafc',
        isSpent: false,
        years,
      })
    }

    return blocks
  }, [labels, viewScale, totalUnits])

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const addLabel = useCallback((name: string, hours: number, colorIdx?: number, precision?: PrecisionSettings) => {
    if (!name.trim() || hours <= 0) return
    
    const usedColors = labels.map(l => l.colorIndex)
    const finalColorIndex = colorIdx ?? 
      COLORS.findIndex((_, i) => !usedColors.includes(i)) ?? 
      labels.length % COLORS.length

    const newLabel: ResourceLabel = {
      id: crypto.randomUUID(),
      name: name.trim(),
      hoursPerDay: hours,
      colorIndex: finalColorIndex,
      precision: precision || DEFAULT_PRECISION,
    }
    setLabels(prev => [...prev, newLabel])
    setNewLabelName('')
    setNewLabelHours('')
    setNewPrecision(DEFAULT_PRECISION)
    setShowPrecision(false)
  }, [labels])

  const removeLabel = useCallback((id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id))
  }, [])

  const clearAllData = useCallback(() => {
    if (confirm('Clear all data? This cannot be undone.')) {
      setCurrentAge(null)
      setLabels([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const handleBlockTap = useCallback((block: TankBlock, unitIndex: number, x: number, y: number) => {
    setPopup({ block, unitIndex, x, y })
  }, [])

  // Preview calculation for new label
  const previewDayUnits = useMemo(() => {
    const hours = parseFloat(newLabelHours) || 0
    if (hours <= 0) return 0
    return calculateDayUnits(hours, newPrecision)
  }, [newLabelHours, newPrecision])

  const previewYears = useMemo(() => {
    const hours = parseFloat(newLabelHours) || 0
    if (hours <= 0) return 0
    return calculateYears(hours, newPrecision)
  }, [newLabelHours, newPrecision])

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  const unallocatedStatus = remainingHoursPerDay >= 6 ? 'high' : remainingHoursPerDay >= 2 ? 'medium' : 'low'
  const currentScaleConfig = VIEW_SCALES.find(s => s.id === viewScale)!

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Command Center</span>
          </Link>
          
          {(currentAge || labels.length > 0) && (
            <button
              onClick={clearAllData}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PERSPECTIVE BANNER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-start gap-3 max-w-2xl">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Perspective:</span> The first 15 years of childhood 
            ({CHILDHOOD_HOURS.toLocaleString()} hours) are excluded from this resource tank. 
            What remains is your adult resource: <span className="font-semibold text-slate-700">{ADULT_HOURS.toLocaleString()} hours</span> across 60 years.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* MAIN TANK AREA */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <main className="flex-1 px-5 py-8">
          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Droplets className="w-6 h-6 text-slate-400" />
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
                Resource Tank
              </h1>
            </div>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">
              Your adult life visualized as a finite resource. Each square is one {viewScale.slice(0, -1)}.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* METRICS CARDS - TOP OF PAGE */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {/* Tank Capacity */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-400 text-xs mb-1">Tank Capacity</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900">{totalUnits.toLocaleString()}</p>
              <p className="text-slate-400 text-xs">{viewScale}</p>
            </div>

            {/* Allocated */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-400 text-xs mb-1">Allocated</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900">{totalEffectiveHoursPerDay.toFixed(1)}h</p>
              <p className="text-slate-400 text-xs">per day</p>
            </div>

            {/* Unallocated - HIGHLIGHTED */}
            <div className={`
              p-4 rounded-xl border relative overflow-hidden transition-all
              ${unallocatedStatus === 'high' 
                ? 'bg-emerald-50 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                : unallocatedStatus === 'medium'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-amber-50 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              }
            `}>
              {unallocatedStatus === 'high' && (
                <Sparkles className="absolute top-2 right-2 w-4 h-4 text-emerald-400" />
              )}
              <p className={`text-xs mb-1 ${
                unallocatedStatus === 'high' ? 'text-emerald-600' : 
                unallocatedStatus === 'low' ? 'text-amber-600' : 'text-slate-400'
              }`}>
                Unallocated
              </p>
              <p className={`text-xl md:text-2xl font-semibold ${
                unallocatedStatus === 'high' ? 'text-emerald-700' : 
                unallocatedStatus === 'low' ? 'text-amber-700' : 'text-slate-900'
              }`}>
                {remainingHoursPerDay.toFixed(1)}h
              </p>
              <p className={`text-xs ${
                unallocatedStatus === 'high' ? 'text-emerald-500' : 
                unallocatedStatus === 'low' ? 'text-amber-500' : 'text-slate-400'
              }`}>
                Your daily window for pure creation
              </p>
            </div>

            {/* Tank Used */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-400 text-xs mb-1">Tank Used</p>
              <p className="text-xl md:text-2xl font-semibold text-slate-900">
                {currentAge ? ((unitsSpent / totalUnits) * 100).toFixed(1) : '0'}%
              </p>
              <p className="text-slate-400 text-xs">of adult life</p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SQUARE SCALE TOGGLE */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-slate-500">Square Duration</span>
            </div>
            <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
              {VIEW_SCALES.map((scale) => {
                const Icon = scale.icon
                const isActive = viewScale === scale.id
                return (
                  <button
                    key={scale.id}
                    onClick={() => setViewScale(scale.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-700' : ''}`} />
                    <span className="hidden sm:inline">{scale.label}</span>
                    <span className="sm:hidden">{scale.label.charAt(0)}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {currentScaleConfig.description} • {totalUnits.toLocaleString()} squares
            </p>
          </div>

          {/* Age Input */}
          {currentAge === null && (
            <div className="mb-6 p-5 bg-slate-50 rounded-2xl max-w-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">How old are you?</h2>
              <p className="text-xs text-slate-500 mb-4">
                This calculates how much of your tank has been spent.
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={15}
                  max={75}
                  placeholder="Age (15-75)"
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value)
                      if (val >= 15 && val <= 75) setCurrentAge(val)
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                    const val = parseInt(input.value)
                    if (val >= 15 && val <= 75) setCurrentAge(val)
                  }}
                  className="px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {/* Current Age Display */}
          {currentAge !== null && (
            <div className="mb-6 flex items-center gap-4 text-sm">
              <span className="text-slate-500">
                Current age: <span className="font-semibold text-slate-900">{currentAge}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                {viewScale.charAt(0).toUpperCase() + viewScale.slice(1)} spent: <span className="font-semibold text-slate-900">{unitsSpent.toLocaleString()}</span>
              </span>
              <button
                onClick={() => setCurrentAge(null)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Change
              </button>
            </div>
          )}

          {/* Tank Legend */}
          <div className="flex flex-wrap gap-3 mb-6">
            {tankBlocks.map((block, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm border border-slate-200"
                  style={{ backgroundColor: block.color }}
                />
                <span className="text-xs text-slate-600">
                  {block.name} <span className="text-slate-400">({block.years.toFixed(1)}y)</span>
                </span>
              </div>
            ))}
            {currentAge && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-slate-600 to-slate-400" />
                <span className="text-xs text-slate-600">Time Spent</span>
              </div>
            )}
          </div>

          {/* THE TANK CANVAS */}
          <ResourceTankCanvas
            blocks={tankBlocks}
            unitsSpent={unitsSpent}
            totalUnits={totalUnits}
            viewScale={viewScale}
            onBlockTap={handleBlockTap}
          />
        </main>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* SIDEBAR */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/30">
          <div className="p-5 lg:p-8">
            {/* Add Activity */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Add Resource Allocation</h2>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PRESETS.map((preset) => {
                  const isAdded = labels.some(l => l.name === preset.name)
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.name}
                      onClick={() => !isAdded && addLabel(preset.name, preset.hours, preset.colorIndex)}
                      disabled={isAdded}
                      className={`
                        flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all
                        ${isAdded 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {preset.name} ({preset.hours}h)
                    </button>
                  )
                })}
              </div>

              {/* Custom Input */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Activity name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                />
                
                {/* Color Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Color:</span>
                  <div className="flex gap-1.5">
                    {COLORS.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColorIndex(i)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          selectedColorIndex === i ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Hours Input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Hours/day"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={newLabelHours}
                    onChange={(e) => setNewLabelHours(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={() => addLabel(newLabelName, parseFloat(newLabelHours), selectedColorIndex, newPrecision)}
                    disabled={!newLabelName.trim() || !newLabelHours || parseFloat(newLabelHours) <= 0}
                    className="px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Precision Settings (Collapsible) */}
                <button
                  onClick={() => setShowPrecision(!showPrecision)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" />
                    Precision Settings
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPrecision ? 'rotate-180' : ''}`} />
                </button>

                {showPrecision && (
                  <div className="p-4 bg-slate-100 rounded-xl space-y-3">
                    <p className="text-xs text-slate-500 mb-3">
                      Fine-tune for seasonal or part-time activities.
                    </p>
                    
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-600 whitespace-nowrap">Days/week</label>
                      <input
                        type="number"
                        min="1"
                        max="7"
                        step="1"
                        value={newPrecision.daysPerWeek}
                        onChange={(e) => setNewPrecision(p => ({ ...p, daysPerWeek: parseFloat(e.target.value) || 7 }))}
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-600 whitespace-nowrap">Weeks/month</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        step="1"
                        value={newPrecision.weeksPerMonth}
                        onChange={(e) => setNewPrecision(p => ({ ...p, weeksPerMonth: parseFloat(e.target.value) || 4 }))}
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-600 whitespace-nowrap">Months/year</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="1"
                        value={newPrecision.monthsPerYear}
                        onChange={(e) => setNewPrecision(p => ({ ...p, monthsPerYear: parseFloat(e.target.value) || 12 }))}
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-600 whitespace-nowrap">Years (of 60)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        value={newPrecision.yearsPerLifetime}
                        onChange={(e) => setNewPrecision(p => ({ ...p, yearsPerLifetime: parseFloat(e.target.value) || 60 }))}
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    {previewDayUnits > 0 && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">
                          Preview: <span className="font-semibold text-slate-700">{previewDayUnits.toLocaleString()}</span> day-units 
                          ({previewYears.toFixed(1)} years)
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setNewPrecision(DEFAULT_PRECISION)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Reset to defaults
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  {remainingHoursPerDay.toFixed(1)} effective hours remaining per day
                </p>
              </div>
            </div>

            {/* Active Allocations */}
            {labels.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Active Allocations
                </h3>
                <div className="space-y-2">
                  {labels.map((label) => {
                    const dayUnits = calculateDayUnits(label.hoursPerDay, label.precision)
                    const scaledUnits = convertToScale(dayUnits, viewScale)
                    const years = calculateYears(label.hoursPerDay, label.precision)
                    const isPartTime = label.precision.daysPerWeek < 7 || 
                                       label.precision.weeksPerMonth < 4 || 
                                       label.precision.monthsPerYear < 12 ||
                                       label.precision.yearsPerLifetime < 60
                    return (
                      <div 
                        key={label.id}
                        className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[label.colorIndex].hex }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-800 truncate">{label.name}</span>
                              {isPartTime && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full flex-shrink-0">
                                  Precision
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              {label.hoursPerDay}h/day → {years.toFixed(1)}y ({scaledUnits.toLocaleString()} {viewScale})
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeLabel(label.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Life Impact Summary */}
            {labels.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Life Impact
                </h3>
                <div className="space-y-3">
                  {labels.map((label) => {
                    const dayUnits = calculateDayUnits(label.hoursPerDay, label.precision)
                    const years = calculateYears(label.hoursPerDay, label.precision)
                    const percentage = (dayUnits / ADULT_DAYS) * 100
                    return (
                      <div key={label.id} className="pb-3 border-b border-slate-200 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-800">{label.name}</span>
                          <span 
                            className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ 
                              backgroundColor: COLORS[label.colorIndex].hex + '20',
                              color: COLORS[label.colorIndex].hex 
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          You will spend <span className="font-semibold text-slate-700">{years.toFixed(1)} years</span> of 
                          your adult life on {label.name.toLowerCase()}.
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {labels.length === 0 && (
              <div className="text-center py-12 px-4">
                <Droplets className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-sm text-slate-500 mb-2">Your tank is empty.</p>
                <p className="text-xs text-slate-400">Add activities to see how they fill your life.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* POPUP OVERLAY */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {popup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setPopup(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full transform animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: popup.block.color }}
                />
                <h3 className="text-lg font-semibold text-slate-900">{popup.block.name}</h3>
              </div>
              <button 
                onClick={() => setPopup(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Position Label based on view */}
              <div className="px-3 py-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Position</p>
                <p className="text-sm font-medium text-slate-800">
                  {getUnitLabel(popup.unitIndex, viewScale)}
                </p>
              </div>

              <p className="text-slate-600">
                You will spend <span className="font-bold text-slate-900">{popup.block.years.toFixed(1)} years</span> of 
                your life on {popup.block.name.toLowerCase()}.
              </p>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-900">{popup.block.units.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{viewScale}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-900">{((popup.block.units / totalUnits) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">of tank</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS COMPONENT - HIGH PERFORMANCE TANK RENDERING
// ═══════════════════════════════════════════════════════════════════════════════
interface CanvasProps {
  blocks: TankBlock[]
  unitsSpent: number
  totalUnits: number
  viewScale: ViewScale
  onBlockTap: (block: TankBlock, unitIndex: number, x: number, y: number) => void
}

function ResourceTankCanvas({ blocks, unitsSpent, totalUnits, viewScale, onBlockTap }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ cols: 12, squareSize: 20, gap: 2 })

  // ─────────────────────────────────────────────────────────────────────────────
  // RESPONSIVE SIZING - ZERO HORIZONTAL SCROLL
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.clientWidth - 16
      let cols: number
      let squareSize: number
      let gap: number

      // Adjust columns and size based on view scale
      switch (viewScale) {
        case 'months':
          // 720 squares - aim for 12 columns (60 rows = 60 years)
          cols = 12
          gap = 2
          squareSize = Math.floor((containerWidth - (cols - 1) * gap) / cols)
          squareSize = Math.max(10, Math.min(30, squareSize))
          break
        case 'weeks':
          // ~3130 squares - aim for ~52 columns (60 rows)
          if (containerWidth < 400) {
            cols = 26
            gap = 1
          } else if (containerWidth < 600) {
            cols = 36
            gap = 1
          } else {
            cols = 52
            gap = 1
          }
          squareSize = Math.floor((containerWidth - (cols - 1) * gap) / cols)
          squareSize = Math.max(4, Math.min(12, squareSize))
          break
        case 'days':
        default:
          // 21915 squares
          if (containerWidth < 400) {
            cols = 30
            gap = 1
          } else if (containerWidth < 600) {
            cols = 45
            gap = 1
          } else {
            cols = 60
            gap = 1
          }
          squareSize = Math.floor((containerWidth - (cols - 1) * gap) / cols)
          squareSize = Math.max(3, Math.min(6, squareSize))
          break
      }

      // Recalculate cols for exact fit
      const actualCols = Math.floor(containerWidth / (squareSize + gap))
      setDimensions({ cols: actualCols > 0 ? actualCols : cols, squareSize, gap })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [viewScale])

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAW THE TANK
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { cols, squareSize, gap } = dimensions
    const cellSize = squareSize + gap
    const rows = Math.ceil(totalUnits / cols)

    const dpr = window.devicePixelRatio || 1
    canvas.width = cols * cellSize * dpr
    canvas.height = rows * cellSize * dpr
    canvas.style.width = `${cols * cellSize}px`
    canvas.style.height = `${rows * cellSize}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cols * cellSize, rows * cellSize)

    for (const block of blocks) {
      for (let i = block.startIndex; i <= block.endIndex && i < totalUnits; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * cellSize
        const y = row * cellSize

        ctx.fillStyle = block.color
        ctx.fillRect(x, y, squareSize, squareSize)

        // Rounded corners for larger squares
        if (squareSize >= 10) {
          ctx.strokeStyle = 'rgba(0,0,0,0.05)'
          ctx.lineWidth = 1
          ctx.strokeRect(x, y, squareSize, squareSize)
        }

        if (i < unitsSpent) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
          ctx.fillRect(x, y, squareSize, squareSize)
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(x, y + squareSize)
          ctx.lineTo(x + squareSize, y)
          ctx.stroke()
        }
      }
    }

    // Draw "today" marker line
    if (unitsSpent > 0 && unitsSpent < totalUnits) {
      const todayRow = Math.floor(unitsSpent / cols)
      const todayCol = unitsSpent % cols
      const lineY = todayRow * cellSize + (todayCol > 0 ? cellSize : 0)
      
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 2])
      ctx.beginPath()
      ctx.moveTo(0, lineY)
      ctx.lineTo(cols * cellSize, lineY)
      ctx.stroke()
      ctx.setLineDash([])
    }

  }, [dimensions, blocks, unitsSpent, totalUnits])

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERACTION - TAP TO SHOW BLOCK INFO
  // ─────────────────────────────────────────────────────────────────────────────
  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const { cols, squareSize, gap } = dimensions
    const cellSize = squareSize + gap

    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    const unitIndex = row * cols + col

    for (const block of blocks) {
      if (unitIndex >= block.startIndex && unitIndex <= block.endIndex) {
        onBlockTap(block, unitIndex, clientX, clientY)
        return
      }
    }
  }, [dimensions, blocks, onBlockTap])

  const handleClick = useCallback((e: React.MouseEvent) => {
    handleInteraction(e.clientX, e.clientY)
  }, [handleInteraction])

  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [handleInteraction])

  // Get scale-specific unit label
  const unitLabel = viewScale === 'months' ? 'Month' : viewScale === 'weeks' ? 'Week' : 'Day'

  return (
    <div 
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition-all"
    >
      <canvas 
        ref={canvasRef}
        className="cursor-pointer touch-manipulation transition-all"
        style={{ imageRendering: viewScale === 'days' ? 'pixelated' : 'auto' }}
        onClick={handleClick}
        onTouchEnd={handleTouch}
      />
      
      {unitsSpent > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-xs text-slate-500">
            Time spent line ({unitLabel} {unitsSpent.toLocaleString()})
          </span>
        </div>
      )}
    </div>
  )
}
