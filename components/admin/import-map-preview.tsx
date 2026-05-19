'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map as MapboxMap, Popup as MapboxPopup } from 'mapbox-gl'

interface BusinessPin {
  placeId: string
  name: string
  rating: number
  reviewCount: number
  category: string
  lat: number
  lng: number
  isSelected: boolean
}

interface ImportMapPreviewProps {
  results: {
    placeId: string
    name: string
    rating: number
    reviewCount: number
    category: string
    googlePrimaryType?: string | null
    lat?: number | null
    lng?: number | null
  }[]
  selectedResults: string[]
  searchCenter?: { lat: number; lng: number } | null
  searchRadiusMeters?: number
  onToggleSelection: (placeId: string) => void
}

export function ImportMapPreview({
  results,
  selectedResults,
  searchCenter,
  searchRadiusMeters,
  onToggleSelection,
}: ImportMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const popupRef = useRef<MapboxPopup | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const styleUrl = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/dark-v11'

  const buildGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = results
      .filter(r => r.lat != null && r.lng != null)
      .map(r => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [r.lng!, r.lat!],
        },
        properties: {
          placeId: r.placeId,
          name: r.name,
          rating: r.rating,
          reviewCount: r.reviewCount,
          category: r.category,
          googlePrimaryType: r.googlePrimaryType || '',
          isSelected: selectedResults.includes(r.placeId) ? 1 : 0,
        },
      }))
    return { type: 'FeatureCollection', features }
  }, [results, selectedResults])

  const buildRadiusCircle = useCallback((): GeoJSON.Feature | null => {
    if (!searchCenter || !searchRadiusMeters) return null
    const steps = 64
    const km = searchRadiusMeters / 1000
    const coords: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI
      const dx = km * Math.cos(angle)
      const dy = km * Math.sin(angle)
      const lat = searchCenter.lat + (dy / 111.32)
      const lng = searchCenter.lng + (dx / (111.32 * Math.cos(searchCenter.lat * (Math.PI / 180))))
      coords.push([lng, lat])
    }
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: {},
    }
  }, [searchCenter, searchRadiusMeters])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || mapRef.current) return

    let isMounted = true

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')

      if (!isMounted || !mapContainer.current) return

      mapboxgl.accessToken = token!

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: searchCenter ? [searchCenter.lng, searchCenter.lat] : [-1.88, 50.72],
        zoom: 13,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      map.on('load', () => {
        if (!isMounted) return
        mapRef.current = map
        setMapLoaded(true)
      })
    }

    initMap()

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setMapLoaded(false)
    }
  }, [token, styleUrl, searchCenter])

  // Add/update sources and layers when map is loaded or data changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const geojson = buildGeoJSON()
    const radiusCircle = buildRadiusCircle()

    // Radius circle
    if (map.getSource('radius-circle')) {
      const src = map.getSource('radius-circle') as mapboxgl.GeoJSONSource
      if (radiusCircle) {
        src.setData({ type: 'FeatureCollection', features: [radiusCircle] })
      }
    } else if (radiusCircle) {
      map.addSource('radius-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [radiusCircle] },
      })
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.05,
        },
      })
      map.addLayer({
        id: 'radius-border',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [3, 2],
        },
      })
    }

    // Business pins
    if (map.getSource('businesses')) {
      const src = map.getSource('businesses') as mapboxgl.GeoJSONSource
      src.setData(geojson)
    } else {
      map.addSource('businesses', { type: 'geojson', data: geojson })

      // Unselected pins (grey)
      map.addLayer({
        id: 'pins-unselected',
        type: 'circle',
        source: 'businesses',
        filter: ['==', ['get', 'isSelected'], 0],
        paint: {
          'circle-radius': 7,
          'circle-color': '#6b7280',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#374151',
          'circle-opacity': 0.8,
        },
      })

      // Selected pins (green with glow)
      map.addLayer({
        id: 'pins-selected-glow',
        type: 'circle',
        source: 'businesses',
        filter: ['==', ['get', 'isSelected'], 1],
        paint: {
          'circle-radius': 12,
          'circle-color': '#22c55e',
          'circle-opacity': 0.2,
        },
      })
      map.addLayer({
        id: 'pins-selected',
        type: 'circle',
        source: 'businesses',
        filter: ['==', ['get', 'isSelected'], 1],
        paint: {
          'circle-radius': 8,
          'circle-color': '#22c55e',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#16a34a',
          'circle-opacity': 0.95,
        },
      })

      // Hover cursor
      map.on('mouseenter', 'pins-unselected', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pins-unselected', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'pins-selected', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pins-selected', () => { map.getCanvas().style.cursor = '' })
    }

    // Fit bounds to results
    if (geojson.features.length > 0) {
      const lngs = geojson.features.map(f => (f.geometry as GeoJSON.Point).coordinates[0])
      const lats = geojson.features.map(f => (f.geometry as GeoJSON.Point).coordinates[1])
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ]
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 800 })
    }
  }, [mapLoaded, buildGeoJSON, buildRadiusCircle])

  // Update pin data reactively when selection changes (without re-adding layers)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const src = map.getSource('businesses') as mapboxgl.GeoJSONSource | undefined
    if (src) {
      src.setData(buildGeoJSON())
    }
  }, [selectedResults, mapLoaded, buildGeoJSON])

  // Hover popup
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    async function setupPopup() {
      const mapboxgl = (await import('mapbox-gl')).default

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'import-map-popup',
      })
      popupRef.current = popup

      const escapeHtml = (str: string) =>
        String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

      const showPopup = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return
        const feature = e.features[0]
        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
        const { name, rating, reviewCount, category, googlePrimaryType, isSelected } = feature.properties!

        const safeName = escapeHtml(name || 'Unknown business')
        const primaryTypeLabel = googlePrimaryType
          ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">📌 ${escapeHtml(String(googlePrimaryType).replace(/_/g, ' '))}</div>`
          : ''
        const selectedBadge = isSelected === 1
          ? '<span style="color:#22c55e;font-weight:600;">✓ Selected</span>'
          : '<span style="color:#6b7280;">Click to select</span>'

        popup
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:system-ui;padding:4px 2px;color:#1f2937;">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#111827;">${safeName}</div>
              <div style="font-size:12px;color:#4b5563;">
                ⭐ ${Number(rating).toFixed(1)} · ${reviewCount} reviews
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:3px;">${escapeHtml(category || '')}</div>
              ${primaryTypeLabel}
              <div style="font-size:11px;margin-top:5px;">${selectedBadge}</div>
            </div>
          `)
          .addTo(map!)
      }

      const hidePopup = () => { popup.remove() }

      map!.on('mousemove', 'pins-unselected', showPopup)
      map!.on('mousemove', 'pins-selected', showPopup)
      map!.on('mouseleave', 'pins-unselected', hidePopup)
      map!.on('mouseleave', 'pins-selected', hidePopup)
    }

    setupPopup()
  }, [mapLoaded])

  // Click to toggle selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return
      const placeId = e.features[0].properties?.placeId
      if (placeId) onToggleSelection(placeId)
    }

    map.on('click', 'pins-unselected', handleClick)
    map.on('click', 'pins-selected', handleClick)

    return () => {
      map.off('click', 'pins-unselected', handleClick)
      map.off('click', 'pins-selected', handleClick)
    }
  }, [mapLoaded, onToggleSelection])

  if (!token) return null

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div ref={mapContainer} className="w-full h-[350px]" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="text-sm text-slate-400 animate-pulse">Loading map...</div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-300 pointer-events-none">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5 align-middle" />
        Selected
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500 ml-3 mr-1.5 align-middle" />
        Not selected
      </div>
    </div>
  )
}
