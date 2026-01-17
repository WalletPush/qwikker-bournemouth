/**
 * useTenantAtlasConfig Hook
 * 
 * Fetches Atlas configuration from /api/tenant/config
 * Provides Atlas settings for the current franchise
 */

import { useState, useEffect } from 'react'

export interface AtlasConfig {
  enabled: boolean
  provider: string
  mapboxPublicToken: string | null
  styleUrl: string | null
  defaultZoom: number
  pitch: number
  bearing: number
  maxResults: number
  minRating: number
  mode: string
}

export interface TenantConfig {
  ok: boolean
  city?: string
  status?: string
  center?: {
    lat: number
    lng: number
  }
  atlas?: AtlasConfig
}

export interface UseTenantAtlasConfigReturn {
  config: TenantConfig | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTenantAtlasConfig(): UseTenantAtlasConfigReturn {
  const [config, setConfig] = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/tenant/config')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load configuration')
      }
      
      setConfig(data)
    } catch (err: any) {
      console.error('[Atlas Config] Failed to load:', err)
      setError(err.message || 'Failed to load configuration')
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    loading,
    error,
    refetch: fetchConfig
  }
}
