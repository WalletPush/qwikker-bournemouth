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
  convertStructuredToText,
  normalizeStructuredHours,
} from '@/types/business-hours'
import { getDayPeriods, normalizeDayHours } from '@/lib/utils/hours-periods'

interface BusinessHoursInputProps {
  value?: BusinessHoursStructured | null
  onChange: (hours: BusinessHoursStructured) => void
  onSave?: (hours: BusinessHoursStructured) => Promise<void>
  isSaving?: boolean
  className?: string
  compact?: boolean
}

export function BusinessHoursInput({ value, onChange, onSave, isSaving, className, compact }: BusinessHoursInputProps) {
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
      const dayKey = (a: DayHours, b: DayHours) => {
        const pa = getDayPeriods(a)
        const pb = getDayPeriods(b)
        return (
          a.closed === b.closed &&
          JSON.stringify(pa) === JSON.stringify(pb)
        )
      }

      const weekdayHours = WEEKDAYS.map((day) => value[day])
      const allWeekdaysSame = weekdayHours.every((h) => dayKey(h, weekdayHours[0]))

      const periods0 = getDayPeriods(weekdayHours[0])
      const satP = getDayPeriods(value.saturday)
      const sunP = getDayPeriods(value.sunday)

      if (allWeekdaysSame) {
        const weekendSame = dayKey(value.saturday, value.sunday)

        if (weekendSame && dayKey(value.saturday, weekdayHours[0])) {
          setPattern('weekdays_same')
          setFormData({
            pattern: 'weekdays_same',
            weekdays_open: periods0[0]?.open || '09:00',
            weekdays_close: periods0[0]?.close || '17:00',
            weekdays_open_2: periods0[1]?.open,
            weekdays_close_2: periods0[1]?.close,
            weekdays_closed: weekdayHours[0].closed,
          })
        } else {
          setPattern('weekdays_weekend')
          setFormData({
            pattern: 'weekdays_weekend',
            weekdays_open: periods0[0]?.open || '09:00',
            weekdays_close: periods0[0]?.close || '17:00',
            weekdays_open_2: periods0[1]?.open,
            weekdays_close_2: periods0[1]?.close,
            weekdays_closed: weekdayHours[0].closed,
            saturday_open: satP[0]?.open || '10:00',
            saturday_close: satP[0]?.close || '16:00',
            saturday_open_2: satP[1]?.open,
            saturday_close_2: satP[1]?.close,
            saturday_closed: value.saturday.closed,
            sunday_open: sunP[0]?.open || '10:00',
            sunday_close: sunP[0]?.close || '16:00',
            sunday_open_2: sunP[1]?.open,
            sunday_close_2: sunP[1]?.close,
            sunday_closed: value.sunday.closed,
          })
        }
      } else {
        setPattern('custom')
        setFormData({
          pattern: 'custom',
          custom_hours: normalizeStructuredHours(value),
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

  const handleFormPatch = (patch: Partial<BusinessHoursFormData>) => {
    const newFormData = { ...formData, ...patch }
    setFormData(newFormData)
    setTimeout(() => {
      onChange(convertFormDataToStructured(newFormData))
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

  const updateDayHours = (dayHours: DayHours, patch: Partial<DayHours>): DayHours => {
    return normalizeDayHours({ ...dayHours, ...patch }) as DayHours
  }

  const DayRow = ({
    day,
    dayHours,
    onChange,
  }: {
    day: string
    dayHours: DayHours
    onChange: (hours: DayHours) => void
  }) => {
    const periods = getDayPeriods(dayHours)
    const hasSecond = periods.length > 1

    return (
      <div className="space-y-3 py-3 border-b border-slate-700/50 last:border-b-0">
        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center">
          <Label className="text-white font-medium capitalize text-base">{day}</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dayHours.closed}
              onChange={(e) =>
                onChange(updateDayHours(dayHours, { closed: e.target.checked, periods: undefined }))
              }
              className="w-4 h-4 text-green-500 bg-slate-700 border-slate-600 rounded focus:ring-green-500 touch-manipulation"
            />
            <span className="text-sm text-slate-300">Closed</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 sm:hidden">Opens</label>
              <TimeDropdown
                value={dayHours.open || undefined}
                onChange={(open) => {
                  const nextPeriods = [...periods]
                  if (nextPeriods[0]) nextPeriods[0] = { ...nextPeriods[0], open }
                  else nextPeriods.push({ open, close: dayHours.close || '17:00' })
                  onChange(
                    updateDayHours(dayHours, {
                      open,
                      closed: false,
                      periods: nextPeriods.length > 1 ? nextPeriods : undefined,
                    })
                  )
                }}
                disabled={dayHours.closed}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 sm:hidden">Closes</label>
              <TimeDropdown
                value={dayHours.close || undefined}
                onChange={(close) => {
                  const nextPeriods = [...periods]
                  if (nextPeriods[0]) nextPeriods[0] = { ...nextPeriods[0], close }
                  else nextPeriods.push({ open: dayHours.open || '09:00', close })
                  onChange(
                    updateDayHours(dayHours, {
                      close,
                      closed: false,
                      periods: nextPeriods.length > 1 ? nextPeriods : undefined,
                    })
                  )
                }}
                disabled={dayHours.closed}
              />
            </div>
          </div>
        </div>

        {!dayHours.closed && (
          <div className="sm:pl-[25%] space-y-2">
            {hasSecond ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                <span className="text-xs text-slate-400 sm:col-span-2">Afternoon / evening session</span>
                <TimeDropdown
                  value={periods[1]?.open}
                  onChange={(open) => {
                    onChange(
                      updateDayHours(dayHours, {
                        periods: [
                          { open: periods[0].open, close: periods[0].close },
                          { open, close: periods[1]?.close || '22:00' },
                        ],
                      })
                    )
                  }}
                />
                <TimeDropdown
                  value={periods[1]?.close}
                  onChange={(close) => {
                    onChange(
                      updateDayHours(dayHours, {
                        periods: [
                          { open: periods[0].open, close: periods[0].close },
                          { open: periods[1]?.open || '17:00', close },
                        ],
                      })
                    )
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-200 underline sm:col-span-4 text-left"
                  onClick={() =>
                    onChange(
                      updateDayHours(dayHours, {
                        periods: undefined,
                        open: periods[0].open,
                        close: periods[0].close,
                      })
                    )
                  }
                >
                  Remove second session
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!dayHours.open || !dayHours.close}
                className="text-xs text-[#00d083] hover:text-[#00b86f] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() =>
                  onChange(
                    updateDayHours(dayHours, {
                      periods: [
                        { open: dayHours.open!, close: dayHours.close! },
                        { open: '17:00', close: '22:00' },
                      ],
                    })
                  )
                }
              >
                + Add afternoon / evening session
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const SecondSessionRow = ({
    label,
    open2,
    close2,
    disabled,
    onOpen2,
    onClose2,
    onAdd,
    onRemove,
  }: {
    label: string
    open2?: string
    close2?: string
    disabled?: boolean
    onOpen2: (v: string) => void
    onClose2: (v: string) => void
    onAdd: () => void
    onRemove: () => void
  }) => {
    const hasSecond = Boolean(open2 && close2)
    if (disabled) return null
    return (
      <div className="pl-4 space-y-2">
        {hasSecond ? (
          <div className="grid grid-cols-4 gap-4 items-center py-2 bg-slate-700/20 rounded px-4">
            <span className="text-slate-400 text-sm">{label}</span>
            <span className="text-xs text-slate-500">2nd session</span>
            <TimeDropdown value={open2} onChange={onOpen2} />
            <TimeDropdown value={close2} onChange={onClose2} />
            <button
              type="button"
              className="col-span-4 text-left text-xs text-slate-400 hover:text-slate-200 underline"
              onClick={onRemove}
            >
              Remove second session
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs text-[#00d083] hover:text-[#00b86f]"
            onClick={onAdd}
          >
            + Add afternoon / evening session ({label})
          </button>
        )}
      </div>
    )
  }

  const content = (
    <div className={`space-y-6 ${compact ? '' : ''}`}>
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
            <SecondSessionRow
              label="All days"
              open2={formData.weekdays_open_2}
              close2={formData.weekdays_close_2}
              disabled={formData.weekdays_closed}
              onOpen2={(v) => handleFormChange('weekdays_open_2', v)}
              onClose2={(v) => handleFormChange('weekdays_close_2', v)}
              onAdd={() => {
                handleFormPatch({ weekdays_open_2: '17:00', weekdays_close_2: '22:00' })
              }}
              onRemove={() => {
                handleFormPatch({ weekdays_open_2: undefined, weekdays_close_2: undefined })
              }}
            />
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
              <SecondSessionRow
                label="Weekdays"
                open2={formData.weekdays_open_2}
                close2={formData.weekdays_close_2}
                disabled={formData.weekdays_closed}
                onOpen2={(v) => handleFormChange('weekdays_open_2', v)}
                onClose2={(v) => handleFormChange('weekdays_close_2', v)}
                onAdd={() => {
                  handleFormPatch({ weekdays_open_2: '17:00', weekdays_close_2: '22:00' })
                }}
                onRemove={() => {
                  handleFormPatch({ weekdays_open_2: undefined, weekdays_close_2: undefined })
                }}
              />
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
                <SecondSessionRow
                  label="Saturday"
                  open2={formData.saturday_open_2}
                  close2={formData.saturday_close_2}
                  disabled={formData.saturday_closed}
                  onOpen2={(v) => handleFormChange('saturday_open_2', v)}
                  onClose2={(v) => handleFormChange('saturday_close_2', v)}
                  onAdd={() => {
                    handleFormPatch({ saturday_open_2: '17:00', saturday_close_2: '22:00' })
                  }}
                  onRemove={() => {
                    handleFormPatch({ saturday_open_2: undefined, saturday_close_2: undefined })
                  }}
                />

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
                <SecondSessionRow
                  label="Sunday"
                  open2={formData.sunday_open_2}
                  close2={formData.sunday_close_2}
                  disabled={formData.sunday_closed}
                  onOpen2={(v) => handleFormChange('sunday_open_2', v)}
                  onClose2={(v) => handleFormChange('sunday_close_2', v)}
                  onAdd={() => {
                    handleFormPatch({ sunday_open_2: '17:00', sunday_close_2: '22:00' })
                  }}
                  onRemove={() => {
                    handleFormPatch({ sunday_open_2: undefined, sunday_close_2: undefined })
                  }}
                />
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
                    dayHours={formData.custom_hours![day]}
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
        {onSave && !compact && (
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
    </div>
  )

  if (compact) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white">Business Hours</CardTitle>
        <p className="text-sm text-slate-400">
          Set your opening hours. Use “Add afternoon / evening session” for lunch + dinner split days. Existing single-range hours keep working as before.
        </p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
