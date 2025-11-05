'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  BusinessHoursStructured, 
  BusinessHoursFormData, 
  DayHours,
  TIME_SLOTS, 
  DAYS_OF_WEEK,
  WEEKDAYS,
  convertFormDataToStructured,
  convertStructuredToText 
} from '@/types/business-hours'

interface BusinessHoursInputProps {
  value?: BusinessHoursStructured | null
  onChange: (hours: BusinessHoursStructured) => void
  onSave?: (hours: BusinessHoursStructured) => Promise<void>
  isSaving?: boolean
  className?: string
}

export function BusinessHoursInput({ value, onChange, onSave, isSaving, className }: BusinessHoursInputProps) {
  const [pattern, setPattern] = useState<'weekdays_same' | 'weekdays_weekend' | 'custom'>('weekdays_weekend')
  const [formData, setFormData] = useState<BusinessHoursFormData>({
    pattern: 'weekdays_weekend',
    weekdays_open: '09:00',
    weekdays_close: '17:00',
    weekdays_closed: false,
    saturday_open: '10:00',
    saturday_close: '16:00',
    saturday_closed: false,
    sunday_closed: true
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isChangingPattern, setIsChangingPattern] = useState(false)

  // Initialize from existing value
  useEffect(() => {
    if (value && !value.needs_conversion && !isInitialized) {
      // Try to detect pattern from structured data
      const weekdayHours = WEEKDAYS.map(day => value[day])
      const allWeekdaysSame = weekdayHours.every(h => 
        h.open === weekdayHours[0].open && 
        h.close === weekdayHours[0].close && 
        h.closed === weekdayHours[0].closed
      )
      
      if (allWeekdaysSame) {
        const weekendSame = value.saturday.open === value.sunday.open && 
                           value.saturday.close === value.sunday.close &&
                           value.saturday.closed === value.sunday.closed
        
        if (weekendSame && 
            value.saturday.open === weekdayHours[0].open &&
            value.saturday.close === weekdayHours[0].close &&
            value.saturday.closed === weekdayHours[0].closed) {
          setPattern('weekdays_same')
          setFormData({
            pattern: 'weekdays_same',
            weekdays_open: weekdayHours[0].open || '09:00',
            weekdays_close: weekdayHours[0].close || '17:00',
            weekdays_closed: weekdayHours[0].closed
          })
        } else {
          setPattern('weekdays_weekend')
          setFormData({
            pattern: 'weekdays_weekend',
            weekdays_open: weekdayHours[0].open || '09:00',
            weekdays_close: weekdayHours[0].close || '17:00',
            weekdays_closed: weekdayHours[0].closed,
            saturday_open: value.saturday.open || '10:00',
            saturday_close: value.saturday.close || '16:00',
            saturday_closed: value.saturday.closed,
            sunday_open: value.sunday.open || '10:00',
            sunday_close: value.sunday.close || '16:00',
            sunday_closed: value.sunday.closed
          })
        }
      } else {
        setPattern('custom')
        setFormData({
          pattern: 'custom',
          custom_hours: value
        })
      }
      
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  const handlePatternChange = async (newPattern: typeof pattern) => {
    // Prevent multiple rapid clicks
    if (isChangingPattern || newPattern === pattern) return
    
    setIsChangingPattern(true)
    
    try {
      let newFormData = { ...formData, pattern: newPattern }
      
      // Initialize custom_hours when switching to custom pattern
      if (newPattern === 'custom') {
        if (!formData.custom_hours) {
          // Create default custom hours if none exist
          const defaultCustomHours: BusinessHoursStructured = {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '10:00', close: '16:00', closed: false },
            sunday: { open: '', close: '', closed: true }
          }
          newFormData.custom_hours = defaultCustomHours
        } else {
          // Ensure existing custom_hours is preserved
          newFormData.custom_hours = { ...formData.custom_hours }
        }
      }
      
      // Batch state updates using React 18's automatic batching
      setPattern(newPattern)
      setFormData(newFormData)
      
      // Defer onChange to next tick to avoid blocking UI
      setTimeout(() => {
        const structured = convertFormDataToStructured(newFormData)
        onChange(structured)
      }, 0)
      
    } finally {
      // Reset changing state after a short delay for visual feedback
      setTimeout(() => setIsChangingPattern(false), 150)
    }
  }

  const handleFormChange = (field: keyof BusinessHoursFormData, value: any) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)
    
    // Debounce onChange to prevent excessive parent re-renders
    setTimeout(() => {
      const structured = convertFormDataToStructured(newFormData)
      onChange(structured)
    }, 0)
  }

  const TimeDropdown = ({ value, onChange, disabled }: { 
    value: string | undefined, 
    onChange: (value: string) => void,
    disabled?: boolean 
  }) => (
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">Select time</option>
      {TIME_SLOTS.map(time => (
        <option key={time} value={time}>{time}</option>
      ))}
    </select>
  )

  const DayRow = ({ 
    day, 
    dayHours, 
    onChange 
  }: { 
    day: string, 
    dayHours: DayHours, 
    onChange: (hours: DayHours) => void 
  }) => (
    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center py-3 border-b border-slate-700/50 last:border-b-0">
      <Label className="text-white font-medium capitalize text-base">{day}</Label>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={dayHours.closed}
          onChange={(e) => onChange({ ...dayHours, closed: e.target.checked })}
          className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500 touch-manipulation"
        />
        <span className="text-sm text-slate-300">Closed</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:contents">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 sm:hidden">Opens</label>
          <TimeDropdown
            value={dayHours.open || undefined}
            onChange={(open) => onChange({ ...dayHours, open })}
            disabled={dayHours.closed}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400 sm:hidden">Closes</label>
          <TimeDropdown
            value={dayHours.close || undefined}
            onChange={(close) => onChange({ ...dayHours, close })}
            disabled={dayHours.closed}
          />
        </div>
      </div>
    </div>
  )

  return (
    <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white">Business Hours</CardTitle>
        <p className="text-sm text-slate-400">
          Set your opening hours. This structured format helps customers and AI understand when you're open.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pattern Selection */}
        <div className="space-y-3">
          <Label className="text-white font-medium">Hours Pattern</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handlePatternChange('weekdays_same')}
              disabled={isChangingPattern}
              className={`p-3 sm:p-4 rounded-lg border text-left transition-all duration-200 touch-manipulation min-h-[60px] relative overflow-hidden ${
                pattern === 'weekdays_same'
                  ? 'border-green-500 bg-green-500/10 text-green-300 shadow-lg shadow-green-500/20'
                  : isChangingPattern
                  ? 'border-slate-600 bg-slate-700/30 text-slate-400 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/70 active:bg-slate-600/50'
              }`}
            >
              <div className="font-medium text-sm sm:text-base">Same Every Day</div>
              <div className="text-xs sm:text-sm opacity-75">Mon-Sun identical hours</div>
              {isChangingPattern && pattern !== 'weekdays_same' && (
                <div className="absolute inset-0 bg-slate-600/20 animate-pulse" />
              )}
            </button>
            
            <button
              type="button"
              onClick={() => handlePatternChange('weekdays_weekend')}
              disabled={isChangingPattern}
              className={`p-3 sm:p-4 rounded-lg border text-left transition-all duration-200 touch-manipulation min-h-[60px] relative overflow-hidden ${
                pattern === 'weekdays_weekend'
                  ? 'border-green-500 bg-green-500/10 text-green-300 shadow-lg shadow-green-500/20'
                  : isChangingPattern
                  ? 'border-slate-600 bg-slate-700/30 text-slate-400 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/70 active:bg-slate-600/50'
              }`}
            >
              <div className="font-medium text-sm sm:text-base">Weekdays + Weekend</div>
              <div className="text-xs sm:text-sm opacity-75">Different weekend hours</div>
              {isChangingPattern && pattern !== 'weekdays_weekend' && (
                <div className="absolute inset-0 bg-slate-600/20 animate-pulse" />
              )}
            </button>
            
            <button
              type="button"
              onClick={() => handlePatternChange('custom')}
              disabled={isChangingPattern}
              className={`p-3 sm:p-4 rounded-lg border text-left transition-all duration-200 touch-manipulation min-h-[60px] sm:col-span-2 lg:col-span-1 relative overflow-hidden ${
                pattern === 'custom'
                  ? 'border-green-500 bg-green-500/10 text-green-300 shadow-lg shadow-green-500/20'
                  : isChangingPattern
                  ? 'border-slate-600 bg-slate-700/30 text-slate-400 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/70 active:bg-slate-600/50'
              }`}
            >
              <div className="font-medium text-sm sm:text-base">Custom</div>
              <div className="text-xs sm:text-sm opacity-75">Set each day individually</div>
              {isChangingPattern && pattern !== 'custom' && (
                <div className="absolute inset-0 bg-slate-600/20 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Hours Input based on pattern */}
        {pattern === 'weekdays_same' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 items-center py-2 border-b border-slate-600">
              <Label className="text-white font-medium">All Days</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.weekdays_closed || false}
                  onChange={(e) => handleFormChange('weekdays_closed', e.target.checked)}
                  className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-slate-300">Closed</span>
              </div>
              <TimeDropdown
                value={formData.weekdays_open}
                onChange={(time) => handleFormChange('weekdays_open', time)}
                disabled={formData.weekdays_closed}
              />
              <TimeDropdown
                value={formData.weekdays_close}
                onChange={(time) => handleFormChange('weekdays_close', time)}
                disabled={formData.weekdays_closed}
              />
            </div>
          </div>
        )}

        {pattern === 'weekdays_weekend' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white font-medium">Monday - Friday</Label>
              <div className="grid grid-cols-4 gap-4 items-center py-2 bg-slate-700/30 rounded px-4">
                <span className="text-slate-300">Weekdays</span>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.weekdays_closed || false}
                    onChange={(e) => handleFormChange('weekdays_closed', e.target.checked)}
                    className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-300">Closed</span>
                </div>
                <TimeDropdown
                  value={formData.weekdays_open}
                  onChange={(time) => handleFormChange('weekdays_open', time)}
                  disabled={formData.weekdays_closed}
                />
                <TimeDropdown
                  value={formData.weekdays_close}
                  onChange={(time) => handleFormChange('weekdays_close', time)}
                  disabled={formData.weekdays_closed}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white font-medium">Weekend</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 items-center py-2 bg-slate-700/30 rounded px-4">
                  <span className="text-slate-300">Saturday</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.saturday_closed || false}
                      onChange={(e) => handleFormChange('saturday_closed', e.target.checked)}
                      className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-slate-300">Closed</span>
                  </div>
                  <TimeDropdown
                    value={formData.saturday_open}
                    onChange={(time) => handleFormChange('saturday_open', time)}
                    disabled={formData.saturday_closed}
                  />
                  <TimeDropdown
                    value={formData.saturday_close}
                    onChange={(time) => handleFormChange('saturday_close', time)}
                    disabled={formData.saturday_closed}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4 items-center py-2 bg-slate-700/30 rounded px-4">
                  <span className="text-slate-300">Sunday</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.sunday_closed || false}
                      onChange={(e) => handleFormChange('sunday_closed', e.target.checked)}
                      className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-slate-300">Closed</span>
                  </div>
                  <TimeDropdown
                    value={formData.sunday_open}
                    onChange={(time) => handleFormChange('sunday_open', time)}
                    disabled={formData.sunday_closed}
                  />
                  <TimeDropdown
                    value={formData.sunday_close}
                    onChange={(time) => handleFormChange('sunday_close', time)}
                    disabled={formData.sunday_closed}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {pattern === 'custom' && (
          <div className="space-y-4">
            {formData.custom_hours ? (
              <>
                <div className="grid grid-cols-4 gap-4 items-center py-2 border-b border-slate-600 text-sm font-medium text-slate-300">
                  <span>Day</span>
                  <span>Closed</span>
                  <span>Open</span>
                  <span>Close</span>
                </div>
                {DAYS_OF_WEEK.map(day => (
                  <DayRow
                    key={day}
                    day={day}
                    dayHours={formData.custom_hours[day]}
                    onChange={(hours) => {
                      const newCustomHours = { 
                        ...formData.custom_hours!, 
                        [day]: hours 
                      }
                      handleFormChange('custom_hours', newCustomHours)
                    }}
                  />
                ))}
              </>
            ) : (
              <div className="p-4 bg-slate-700/30 rounded-lg text-center text-slate-400">
                <p>Initializing custom hours...</p>
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
          <Label className="text-white font-medium mb-2 block">Preview (AI-Friendly Format)</Label>
          <pre className="text-sm text-slate-300 whitespace-pre-line">
            {convertStructuredToText(convertFormDataToStructured(formData))}
          </pre>
        </div>

        {/* Save Button */}
        {onSave && (
          <div className="flex justify-end pt-4 border-t border-slate-600">
            <Button
              type="button"
              onClick={() => onSave(convertFormDataToStructured(formData))}
              disabled={isSaving}
              className="bg-[#00d083] hover:bg-[#00b86f] disabled:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200 min-w-[160px]"
            >
              {isSaving ? 'Saving...' : 'Save Hours'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
