/**
 * Atlas Visual Styles
 * 
 * Neon glow effects, premium colors, and layer configurations
 */

import type { CircleLayerSpecification, LineLayerSpecification } from 'mapbox-gl'

// Brand colors
export const QWIKKER_GREEN = '#00d083'
export const QWIKKER_GREEN_BRIGHT = '#00ff9d'
export const USER_BLUE = '#3b82f6'
export const NEON_PINK = '#ff006e'
export const NEON_CYAN = '#00f0ff'

/**
 * User "YOU" marker layers (clear, visible, not massive)
 */
export const getUserLocationLayers = () => {
  // Outer glow (subtle)
  const outerGlow: CircleLayerSpecification = {
    id: 'user-location-outer-glow',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 20,
        14, 35,
        18, 55
      ],
      'circle-color': QWIKKER_GREEN,
      'circle-opacity': 0.15,
      'circle-blur': 1
    }
  }

  // Pulse ring (animated feel)
  const pulseRing: CircleLayerSpecification = {
    id: 'user-location-pulse',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 12,
        14, 20,
        18, 32
      ],
      'circle-color': QWIKKER_GREEN_BRIGHT,
      'circle-opacity': 0.3,
      'circle-blur': 0.5
    }
  }

  // Inner bright dot
  const innerDot: CircleLayerSpecification = {
    id: 'user-location-dot',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 6,
        14, 10,
        18, 16
      ],
      'circle-color': QWIKKER_GREEN,
      'circle-opacity': 1,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 1
    }
  }

  return [outerGlow, pulseRing, innerDot]
}

/**
 * Business pin layers (neon glow effect)
 */
export const getBusinessPinLayers = () => {
  // Outer glow
  const outerGlow: CircleLayerSpecification = {
    id: 'business-pins-glow',
    type: 'circle',
    source: 'businesses',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 20,
        14, 35,
        18, 50
      ],
      'circle-color': NEON_CYAN,
      'circle-opacity': 0.4,
      'circle-blur': 1
    }
  }

  // Main pin
  const mainPin: CircleLayerSpecification = {
    id: 'business-pins',
    type: 'circle',
    source: 'businesses',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 8,
        14, 14,
        18, 22
      ],
      'circle-color': NEON_CYAN,
      'circle-opacity': 0.95,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8
    }
  }

  return [outerGlow, mainPin]
}

/**
 * Active business pin (selected, brighter)
 */
export const getActiveBusinessLayers = () => {
  // Pulse animation
  const pulse: CircleLayerSpecification = {
    id: 'active-business-pulse',
    type: 'circle',
    source: 'active-business',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 30,
        14, 50,
        18, 80
      ],
      'circle-color': QWIKKER_GREEN_BRIGHT,
      'circle-opacity': 0.5,
      'circle-blur': 0.8
    }
  }

  // Main pin (bigger than normal)
  const mainPin: CircleLayerSpecification = {
    id: 'active-business-pin',
    type: 'circle',
    source: 'active-business',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 12,
        14, 18,
        18, 28
      ],
      'circle-color': QWIKKER_GREEN,
      'circle-opacity': 1,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 1
    }
  }

  return [pulse, mainPin]
}

/**
 * Route line from user to active business
 */
export const getRouteLayers = () => {
  // Glow layer (behind)
  const glow: LineLayerSpecification = {
    id: 'route-glow',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': QWIKKER_GREEN,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 8,
        14, 12,
        18, 20
      ],
      'line-opacity': 0.4,
      'line-blur': 4
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  }

  // Main line (crisp)
  const mainLine: LineLayerSpecification = {
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': QWIKKER_GREEN_BRIGHT,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 3,
        14, 4,
        18, 6
      ],
      'line-opacity': 0.9
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  }

  return [glow, mainLine]
}
