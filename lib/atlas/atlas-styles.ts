/**
 * Atlas Visual Styles
 * 
 * Neon glow effects, premium colors, and layer configurations
 */

import type { CircleLayerSpecification, LineLayerSpecification, SymbolLayerSpecification } from 'mapbox-gl'

// Brand colors
export const QWIKKER_GREEN = '#00d083'
export const QWIKKER_GREEN_BRIGHT = '#00ff9d'
export const USER_BLUE = '#3b82f6'
export const NEON_PINK = '#ff006e'
export const NEON_CYAN = '#00f0ff'

/**
 * User "YOU" marker layers (glowing, visible, attention-grabbing)
 */
export const getUserLocationLayers = () => {
  // Outer glow (bigger, more visible)
  const outerGlow: CircleLayerSpecification = {
    id: 'user-location-outer-glow',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 30,
        14, 50,
        18, 80
      ],
      'circle-color': QWIKKER_GREEN,
      'circle-opacity': 0.25,
      'circle-blur': 1.5
    }
  }

  // Pulse ring (animated feel, brighter)
  const pulseRing: CircleLayerSpecification = {
    id: 'user-location-pulse',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 18,
        14, 30,
        18, 45
      ],
      'circle-color': QWIKKER_GREEN_BRIGHT,
      'circle-opacity': 0.5,
      'circle-blur': 0.8
    }
  }

  // Inner bright dot (bigger and more prominent)
  const innerDot: CircleLayerSpecification = {
    id: 'user-location-dot',
    type: 'circle',
    source: 'user-location',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 10,
        14, 16,
        18, 24
      ],
      'circle-color': QWIKKER_GREEN_BRIGHT,
      'circle-opacity': 1,
      'circle-stroke-width': 4,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 1
    }
  }

  return [outerGlow, pulseRing, innerDot]
}

/**
 * Business pin layers (animated pulsing dots)
 * ✅ Cyan pulsing dots for paid/trial businesses
 * ✅ Grey pulsing dots for unclaimed businesses
 */
export const getBusinessPinLayers = () => {
  // Use animated pulsing dot images instead of static circles
  const pulsingPins: SymbolLayerSpecification = {
    id: 'business-pins',
    type: 'symbol',
    source: 'businesses',
    // ✨ Only show individual pins (not clusters)
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'case',
        ['==', ['get', 'isPaid'], true], 'pulsing-dot-cyan',   // Cyan pulsing for paid
        ['==', ['get', 'isUnclaimed'], true], 'pulsing-dot-grey', // Grey pulsing for unclaimed
        'pulsing-dot-cyan'                                        // Default cyan
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  }

  // Note: We removed the separate glow layer because the pulsing effect includes glow
  return [pulsingPins]
}

/**
 * Arrival pulse layer (animated on pin focus)
 * Uses feature-state to control which pin pulses
 * Animates via setPaintProperty in triggerPinPulse()
 */
export const getArrivalPulseLayer = (): CircleLayerSpecification => {
  return {
    id: 'business-pins-arrival-pulse',
    type: 'circle',
    source: 'businesses',
    // Only show pulse ring for features with isPulsing=true in feature-state
    filter: ['==', ['feature-state', 'isPulsing'], true],
    paint: {
      'circle-radius': 15, // Will be animated 15 → 50
      'circle-color': NEON_CYAN,
      'circle-opacity': 0.8, // Will be animated 0.8 → 0
      'circle-blur': 1
    }
  }
}

/**
 * Business cluster layers (for dense areas)
 * Shows elegant neon ring + count when businesses are clustered
 */
export const getClusterLayers = () => {
  // Cluster circle (subtle neon cyan glow)
  const clusterCircle: CircleLayerSpecification = {
    id: 'business-clusters',
    type: 'circle',
    source: 'businesses',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': NEON_CYAN,
      'circle-opacity': 0.6,
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,  // radius for 2-9 points
        10, 25,  // radius for 10-99 points
        100, 30  // radius for 100+ points
      ],
      'circle-blur': 0.5,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8
    }
  }

  // Cluster count label
  const clusterCount: SymbolLayerSpecification = {
    id: 'business-cluster-count',
    type: 'symbol',
    source: 'businesses',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 14
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': NEON_CYAN,
      'text-halo-width': 2
    }
  }

  return [clusterCircle, clusterCount]
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
 * Helper: Build a smooth curved arc between two points
 * Uses quadratic bezier with perpendicular offset for cinematic feel
 */
export const buildArcRoute = (
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  numPoints: number = 40
): number[][] => {
  const points: number[][] = []
  
  // Calculate control point (offset perpendicular to the line)
  const midLng = (startLng + endLng) / 2
  const midLat = (startLat + endLat) / 2
  
  // Vector from start to end
  const dx = endLng - startLng
  const dy = endLat - startLat
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Perpendicular offset (10% of distance, subtle curve)
  const offset = distance * 0.1
  const perpX = -dy / distance * offset
  const perpY = dx / distance * offset
  
  // Control point
  const controlLng = midLng + perpX
  const controlLat = midLat + perpY
  
  // Generate bezier curve points
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const oneMinusT = 1 - t
    
    // Quadratic bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const lng = oneMinusT * oneMinusT * startLng + 
                2 * oneMinusT * t * controlLng + 
                t * t * endLng
    const lat = oneMinusT * oneMinusT * startLat + 
                2 * oneMinusT * t * controlLat + 
                t * t * endLat
    
    points.push([lng, lat])
  }
  
  return points
}

/**
 * Route line from user to active business
 * ✨ Curved arc with animated gradient for guided feel
 */
export const getRouteLayers = () => {
  // Glow layer (behind, subtle)
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
      'line-opacity': 0.3,
      'line-blur': 4
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  }

  // Main line with animated gradient
  const mainLine: LineLayerSpecification = {
    id: 'route-line',
    type: 'line',
    source: 'route',
    paint: {
      // ✨ Animated gradient: darker green → bright green (travel feel)
      'line-gradient': [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0, 'rgba(0, 160, 102, 0.6)',    // Start: darker green, semi-transparent
        0.5, QWIKKER_GREEN,              // Middle: brand green
        1, QWIKKER_GREEN_BRIGHT          // End: bright green (destination)
      ],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 3,
        14, 4,
        18, 6
      ]
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  }

  return [glow, mainLine]
}
