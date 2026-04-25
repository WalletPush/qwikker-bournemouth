import { createServiceRoleClient } from '@/lib/supabase/server'

interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
}

function estimateCost(model: string, usage: TokenUsage): number {
  const rates = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o-mini']
  return (usage.prompt_tokens * rates.input) + (usage.completion_tokens * rates.output)
}

/**
 * Log AI token usage to ai_usage_logs table (fire-and-forget)
 */
export function logAIUsage(params: {
  city: string
  walletPassId?: string
  model: string
  usage: TokenUsage
  queryType?: string
}) {
  const { city, walletPassId, model, usage, queryType } = params
  const cost = estimateCost(model, usage)

  const supabase = createServiceRoleClient()
  supabase
    .from('ai_usage_logs')
    .insert({
      city: city.toLowerCase(),
      wallet_pass_id: walletPassId || null,
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd: cost,
      query_type: queryType || null,
    })
    .then(({ error }) => {
      if (error) console.error('Failed to log AI usage:', error.message)
    })
}
