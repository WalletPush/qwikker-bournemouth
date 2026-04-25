'use client'

import { useState, useEffect } from 'react'
import { AITestPage } from './ai-test-page'

interface AIManagementPageProps {
  city: string
}

interface UsageData {
  usage: {
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    totalCost: number
    totalCalls: number
    costByModel: Record<string, { tokens: number; cost: number; calls: number }>
    dailyUsage: Record<string, { tokens: number; cost: number; calls: number }>
    hourlyBuckets: Record<number, number>
    avgCostPerCall: number
  }
  conversations: {
    totalSessions: number
    totalUserMessages: number
  }
  knowledgeBase: {
    totalEntries: number
    activeEntries: number
    entriesByType: Record<string, number>
    businessesWithKb: number
    totalBusinesses: number
    coverageGaps: { id: string; name: string }[]
  }
  period: { days: number; since: string }
}

type SubTab = 'usage' | 'kb-health' | 'testing' | 'config'

export function AIManagementPage({ city }: AIManagementPageProps) {
  const [subTab, setSubTab] = useState<SubTab>('usage')
  const [data, setData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchUsageData()
  }, [days])

  async function fetchUsageData() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ai-usage?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch AI usage data')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'usage', label: 'Usage & Costs' },
    { id: 'kb-health', label: 'KB Health' },
    { id: 'testing', label: 'AI Testing' },
    { id: 'config', label: 'Configuration' },
  ]

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              subTab === tab.id
                ? 'bg-slate-800 text-[#00d083] border-b-2 border-[#00d083]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'usage' && (
        <UsageDashboard data={data} isLoading={isLoading} error={error} days={days} setDays={setDays} onRefresh={fetchUsageData} />
      )}
      {subTab === 'kb-health' && (
        <KBHealthDashboard data={data} isLoading={isLoading} />
      )}
      {subTab === 'testing' && (
        <AITestPage city={city} />
      )}
      {subTab === 'config' && (
        <ConfigSection city={city} />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function UsageDashboard({ data, isLoading, error, days, setDays, onRefresh }: {
  data: UsageData | null
  isLoading: boolean
  error: string | null
  days: number
  setDays: (d: number) => void
  onRefresh: () => void
}) {
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={onRefresh} className="text-[#00d083] hover:underline">Try again</button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-slate-700 rounded w-20 mb-3" />
            <div className="h-7 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  const { usage, conversations } = data
  const dailyEntries = Object.entries(usage.dailyUsage).sort(([a], [b]) => a.localeCompare(b))

  // Find busiest hour
  const busiestHour = Object.entries(usage.hourlyBuckets).sort(([, a], [, b]) => b - a)[0]
  const busiestHourLabel = busiestHour ? `${parseInt(busiestHour[0]).toString().padStart(2, '0')}:00` : 'N/A'

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                days === d
                  ? 'bg-[#00d083] text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="text-xs text-slate-400 hover:text-[#00d083] transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Spend" value={`$${usage.totalCost.toFixed(4)}`} sub={`${days} day period`} color="text-[#00d083]" />
        <StatCard label="Total API Calls" value={usage.totalCalls.toLocaleString()} sub={`${(usage.totalCalls / days).toFixed(1)} per day avg`} />
        <StatCard label="Total Tokens" value={formatNumber(usage.totalTokens)} sub={`${formatNumber(usage.totalPromptTokens)} in / ${formatNumber(usage.totalCompletionTokens)} out`} />
        <StatCard label="Avg Cost / Call" value={`$${usage.avgCostPerCall.toFixed(6)}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Conversations" value={conversations.totalSessions.toLocaleString()} sub="unique sessions" />
        <StatCard label="User Messages" value={conversations.totalUserMessages.toLocaleString()} />
        <StatCard label="Busiest Hour" value={busiestHourLabel} sub={busiestHour ? `${busiestHour[1]} calls` : ''} />
        <StatCard label="Projected Monthly" value={`$${(usage.totalCost / days * 30).toFixed(2)}`} sub="estimated at current rate" color="text-yellow-400" />
      </div>

      {/* Cost by model */}
      {Object.keys(usage.costByModel).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Cost by Model</h3>
          <div className="space-y-3">
            {Object.entries(usage.costByModel).map(([model, stats]) => {
              const pct = usage.totalCost > 0 ? (stats.cost / usage.totalCost) * 100 : 0
              return (
                <div key={model} className="flex items-center gap-4">
                  <span className="text-sm text-slate-300 w-32 font-mono">{model}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-[#00d083] h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-right text-xs text-slate-400 w-40">
                    <span className="text-white font-medium">${stats.cost.toFixed(4)}</span> · {stats.calls} calls · {formatNumber(stats.tokens)} tok
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily chart (simple bar chart) */}
      {dailyEntries.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Daily Usage</h3>
          <div className="flex items-end gap-1 h-32">
            {dailyEntries.slice(-30).map(([day, stats]) => {
              const maxCalls = Math.max(...dailyEntries.map(([, s]) => s.calls), 1)
              const height = (stats.calls / maxCalls) * 100
              return (
                <div key={day} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full bg-[#00d083]/70 hover:bg-[#00d083] rounded-t transition-all min-h-[2px]"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                    <p className="font-medium">{day}</p>
                    <p>{stats.calls} calls · ${stats.cost.toFixed(4)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{dailyEntries.slice(-30)[0]?.[0]?.slice(5) || ''}</span>
            <span>{dailyEntries[dailyEntries.length - 1]?.[0]?.slice(5) || ''}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {usage.totalCalls === 0 && (
        <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/30">
          <p className="text-4xl mb-3 opacity-30">—</p>
          <p className="text-lg font-medium text-white">No AI usage data yet</p>
          <p className="text-sm text-slate-400 mt-1">Usage data will appear here once users start chatting with your AI concierge</p>
        </div>
      )}
    </div>
  )
}

function KBHealthDashboard({ data, isLoading }: { data: UsageData | null; isLoading: boolean }) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-slate-700 rounded w-20 mb-3" />
            <div className="h-7 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  const { knowledgeBase } = data
  const coveragePct = knowledgeBase.totalBusinesses > 0
    ? Math.round((knowledgeBase.businessesWithKb / knowledgeBase.totalBusinesses) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total KB Entries" value={knowledgeBase.totalEntries.toLocaleString()} sub={`${knowledgeBase.activeEntries} active`} />
        <StatCard label="Business Coverage" value={`${coveragePct}%`} sub={`${knowledgeBase.businessesWithKb} of ${knowledgeBase.totalBusinesses} businesses`} color={coveragePct >= 80 ? 'text-[#00d083]' : coveragePct >= 50 ? 'text-yellow-400' : 'text-red-400'} />
        <StatCard label="KB Types" value={Object.keys(knowledgeBase.entriesByType).length.toString()} />
        <StatCard label="Coverage Gaps" value={knowledgeBase.coverageGaps.length.toString()} color={knowledgeBase.coverageGaps.length === 0 ? 'text-[#00d083]' : 'text-orange-400'} />
      </div>

      {/* Entries by type */}
      {Object.keys(knowledgeBase.entriesByType).length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Entries by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(knowledgeBase.entriesByType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-300 capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage gaps */}
      {knowledgeBase.coverageGaps.length > 0 && (
        <div className="bg-slate-800/60 border border-orange-600/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-orange-400 mb-3">Businesses Without KB Entries</h3>
          <p className="text-xs text-slate-400 mb-3">These active businesses have no knowledge base data. The AI concierge won't be able to answer specific questions about them.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {knowledgeBase.coverageGaps.map(biz => (
              <div key={biz.id} className="flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-sm text-slate-300">{biz.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All clear */}
      {knowledgeBase.coverageGaps.length === 0 && knowledgeBase.totalBusinesses > 0 && (
        <div className="text-center py-8 bg-[#00d083]/5 border border-[#00d083]/20 rounded-xl">
          <p className="text-3xl mb-2 opacity-30">—</p>
          <p className="text-sm font-medium text-[#00d083]">All active businesses have knowledge base entries</p>
        </div>
      )}
    </div>
  )
}

function ConfigSection({ city }: { city: string }) {
  const [config, setConfig] = useState<{ openai_key_set: boolean; anthropic_key_set: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/admin/ai-config?city=${encodeURIComponent(city)}`)
      if (res.ok) {
        setConfig(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">API Key Status</h3>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-slate-700 rounded w-48" />
            <div className="h-5 bg-slate-700 rounded w-48" />
          </div>
        ) : (
          <div className="space-y-3">
            <KeyStatus label="OpenAI API Key" isSet={config?.openai_key_set ?? false} />
            <KeyStatus label="Anthropic API Key" isSet={config?.anthropic_key_set ?? false} />
          </div>
        )}
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Manage Your OpenAI Account</h3>
        <p className="text-xs text-slate-400 mb-4">
          View your current balance, add credits, and manage API keys directly on the OpenAI platform.
          Each city operator manages their own OpenAI billing independently.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://platform.openai.com/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            View OpenAI Usage
            <ExternalLinkIcon />
          </a>
          <a
            href="https://platform.openai.com/settings/organization/billing/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add Credits
            <ExternalLinkIcon />
          </a>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            API Keys
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-blue-600/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">How AI Costs Work</h3>
        <div className="text-xs text-slate-400 space-y-2">
          <p>Your AI concierge uses OpenAI's GPT models. Costs are based on token usage:</p>
          <div className="grid grid-cols-2 gap-2 bg-slate-900/50 rounded-lg p-3">
            <div>
              <p className="text-slate-500">GPT-4o-mini (most queries)</p>
              <p className="text-white font-medium">$0.15 / 1M input tokens</p>
              <p className="text-white font-medium">$0.60 / 1M output tokens</p>
            </div>
            <div>
              <p className="text-slate-500">GPT-4o (complex queries)</p>
              <p className="text-white font-medium">$2.50 / 1M input tokens</p>
              <p className="text-white font-medium">$10.00 / 1M output tokens</p>
            </div>
          </div>
          <p>A typical conversation costs less than $0.01. Most cities spend $5-20/month depending on user activity.</p>
        </div>
      </div>
    </div>
  )
}

function KeyStatus({ label, isSet }: { label: string; isSet: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${isSet ? 'bg-[#00d083]' : 'bg-red-400'}`} />
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-xs font-medium ${isSet ? 'text-[#00d083]' : 'text-red-400'}`}>
        {isSet ? 'Configured' : 'Not set'}
      </span>
    </div>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
