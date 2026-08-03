'use client'

import { useEffect, useRef } from 'react'
import type { PublicCity } from '@/components/partners/partners-opportunity-page'
import { trackPartnersEvent } from '@/lib/partners/analytics'
import {
  PARTNERS_EARTH_NIGHT_MAP,
  PARTNERS_EARTH_DAY_MAP,
} from '@/components/partners/sections/visual-assets'

interface TerritoryMapProps {
  cities: PublicCity[]
  mapToken?: string | null
  mapStyle?: string
  selectedSlug?: string | null
  onSelectCity: (city: PublicCity) => void
  variant?: 'reserve' | 'hero'
}

const REVOLUTION_MS = 100_000
/** Keep ≤ 1 so the sphere isn't clipped by the canvas edge */
const GLOBE_SCALE = 0.98

/** Status → RGB 0..1 — available pins are not rendered on the public globe */
const STATUS_RGB: Record<string, [number, number, number]> = {
  owned: [0, 0.769, 0.416], // #00C46A live
  reserved: [0.961, 0.647, 0.141], // #F5A524
}

const EARTH_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
uniform float uRot;
uniform float uScale;
out vec2 vUv;
out float vFacing;
void main(){
  float c = cos(uRot), s = sin(uRot);
  // rotateY — same for earth + pins
  vec3 p = vec3(aPos.x * c + aPos.z * s, aPos.y, -aPos.x * s + aPos.z * c);
  vUv = aUv;
  vFacing = p.z;
  gl_Position = vec4(p.x * uScale, p.y * uScale, -p.z * 0.5, 1.0);
}`

const EARTH_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in float vFacing;
uniform sampler2D uDay;
uniform sampler2D uNight;
out vec4 outColor;
void main(){
  if (vFacing < 0.0) discard;
  vec3 day = texture(uDay, vUv).rgb;
  vec3 night = texture(uNight, vUv).rgb;
  vec3 color = day * 0.4 + night * 1.5 * (1.0 - day * 0.4);
  float limb = pow(clamp(vFacing, 0.0, 1.0), 0.5);
  color *= mix(0.4, 1.0, limb);
  // Specular only — no green rim/atmosphere
  float spec = pow(clamp(vFacing * 0.85 + 0.15, 0.0, 1.0), 24.0);
  color += vec3(0.12) * spec;
  outColor = vec4(color, 1.0);
}`

const PIN_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aColor;
layout(location=2) in float aPulse; // 1 = live (pulse), 0 = steady
uniform float uRot;
uniform float uScale;
uniform float uPulsePhase;
uniform float uDpr;
out vec3 vColor;
out float vAlpha;
void main(){
  float c = cos(uRot), s = sin(uRot);
  vec3 p = vec3(aPos.x * c + aPos.z * s, aPos.y, -aPos.x * s + aPos.z * c);
  // Hide back-hemisphere pins in the vertex stage
  if (p.z < 0.12) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // off-screen
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    vColor = aColor;
    return;
  }
  gl_Position = vec4(p.x * uScale, p.y * uScale, -p.z * 0.5 - 0.01, 1.0);
  float pulse = aPulse > 0.5
    ? (0.55 + 0.45 * sin(uPulsePhase))
    : 0.8;
  // Live pins pulse larger; reserved stay solid amber (same weight so FOMO is visible)
  float base = aPulse > 0.5 ? 16.0 : 14.0;
  gl_PointSize = (base + 10.0 * pulse * aPulse) * uDpr * (0.75 + 0.25 * p.z);
  vColor = aColor;
  vAlpha = 0.55 + 0.45 * p.z;
}`

const PIN_FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = length(q);
  if (d > 1.0) discard;
  float core = smoothstep(1.0, 0.15, d);
  float glow = exp(-d * 2.8) * 0.85;
  outColor = vec4(vColor, vAlpha * max(core, glow * 0.65));
}`

/**
 * Equirectangular convention (NASA / three-globe):
 * u=0 → lng -180°, u=0.5 → lng 0° (Greenwich), u=1 → lng +180°
 * Greenwich faces +Z so the Atlantic/Africa is front at rot=0.
 */
function geoToCart(latDeg: number, lngDeg: number) {
  const lat = (latDeg * Math.PI) / 180
  const lng = (lngDeg * Math.PI) / 180
  const cosLat = Math.cos(lat)
  return {
    x: cosLat * Math.sin(lng),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lng),
  }
}

function createSphere(segments: number) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let y = 0; y <= segments; y++) {
    const v = y / segments
    const latDeg = 90 - v * 180
    for (let x = 0; x <= segments; x++) {
      const u = x / segments
      const lngDeg = u * 360 - 180
      const p = geoToCart(latDeg, lngDeg)
      positions.push(p.x, p.y, p.z)
      uvs.push(u, v)
    }
  }

  const stride = segments + 1
  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * stride + x
      const b = a + stride
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader')
  }
  return sh
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vert))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || 'link')
  }
  return p
}

function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const tex = gl.createTexture()!
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.generateMipmap(gl.TEXTURE_2D)
      resolve(tex)
    }
    img.onerror = () => reject(new Error(url))
    img.src = url
  })
}

export function PartnersTerritoryMap({
  cities,
  selectedSlug,
  onSelectCity,
  variant = 'reserve',
}: TerritoryMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const citiesRef = useRef(cities)
  const selectedRef = useRef(selectedSlug)
  const onSelectRef = useRef(onSelectCity)
  const rotationRef = useRef(0)
  const pinCountRef = useRef(0)
  const reducedMotionRef = useRef(false)

  citiesRef.current = cities
  selectedRef.current = selectedSlug
  onSelectRef.current = onSelectCity

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const onChange = () => {
      reducedMotionRef.current = mq.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    })
    if (!gl) return

    let raf = 0
    let cancelled = false
    const start = performance.now()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const earthProg = link(gl, EARTH_VERT, EARTH_FRAG)
    const pinProg = link(gl, PIN_VERT, PIN_FRAG)

    const sphere = createSphere(96)
    const earthVao = gl.createVertexArray()!
    gl.bindVertexArray(earthVao)
    const posBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    const uvBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)
    const idxBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW)

    // Pin buffers — interleaved pos(3) + color(3) + pulse(1)
    const pinVao = gl.createVertexArray()!
    const pinBuf = gl.createBuffer()!
    gl.bindVertexArray(pinVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, pinBuf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24)

    const earthURot = gl.getUniformLocation(earthProg, 'uRot')
    const earthUScale = gl.getUniformLocation(earthProg, 'uScale')
    const earthUDay = gl.getUniformLocation(earthProg, 'uDay')
    const earthUNight = gl.getUniformLocation(earthProg, 'uNight')
    const pinURot = gl.getUniformLocation(pinProg, 'uRot')
    const pinUScale = gl.getUniformLocation(pinProg, 'uScale')
    const pinUPulse = gl.getUniformLocation(pinProg, 'uPulsePhase')
    const pinUDpr = gl.getUniformLocation(pinProg, 'uDpr')

    let dayTex: WebGLTexture | null = null
    let nightTex: WebGLTexture | null = null
    let ready = false

    Promise.all([
      loadTexture(gl, PARTNERS_EARTH_DAY_MAP),
      loadTexture(gl, PARTNERS_EARTH_NIGHT_MAP),
    ])
      .then(([d, n]) => {
        if (cancelled) return
        dayTex = d
        nightTex = n
        ready = true
      })
      .catch((e) => console.error('Globe textures failed:', e))

    const uploadPins = (list: PublicCity[]) => {
      const rows: number[] = []
      for (const city of list) {
        // Public globe: live + reserved only (no "available" pins)
        if (city.status !== 'owned' && city.status !== 'reserved') continue
        if (city.lat == null || city.lng == null) continue
        if (!Number.isFinite(city.lat) || !Number.isFinite(city.lng)) continue
        const p = geoToCart(city.lat, city.lng)
        const rgb = STATUS_RGB[city.status] || STATUS_RGB.reserved
        const pulse = city.status === 'owned' ? 1 : 0
        rows.push(p.x, p.y, p.z, rgb[0], rgb[1], rgb[2], pulse)
      }
      pinCountRef.current = rows.length / 7
      gl.bindBuffer(gl.ARRAY_BUFFER, pinBuf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rows), gl.DYNAMIC_DRAW)
    }
    uploadPins(citiesRef.current)

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)))
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)

    // Pick pins in the same space as the shaders
    const hitTest = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const size = rect.width
      const ndcX = ((clientX - rect.left) / size) * 2 - 1
      const ndcY = -(((clientY - rect.top) / size) * 2 - 1)
      const rot = rotationRef.current
      const c = Math.cos(rot)
      const s = Math.sin(rot)
      let best: PublicCity | null = null
      let bestDist = 0.1

      for (const city of citiesRef.current) {
        if (city.status !== 'owned' && city.status !== 'reserved') continue
        if (city.lat == null || city.lng == null) continue
        const p0 = geoToCart(city.lat, city.lng)
        const x = p0.x * c + p0.z * s
        const y = p0.y
        const z = -p0.x * s + p0.z * c
        if (z < 0.12) continue
        const sx = x * GLOBE_SCALE
        const sy = y * GLOBE_SCALE
        // Zoomed scale can push pins slightly past NDC ±1 — still pickable
        const d = Math.hypot(sx - ndcX, sy - ndcY)
        if (d < bestDist) {
          bestDist = d
          best = city
        }
      }
      return best
    }

    let lastPinKey = ''

    const draw = (now: number) => {
      if (cancelled) return
      if (!reducedMotionRef.current) {
        rotationRef.current = (((now - start) / REVOLUTION_MS) * Math.PI * 2) % (Math.PI * 2)
      }
      const rot = rotationRef.current

      // Refresh pin buffer if city set changed
      const key = citiesRef.current.map((c) => `${c.city_slug}:${c.status}:${c.lat}:${c.lng}`).join('|')
      if (key !== lastPinKey) {
        lastPinKey = key
        uploadPins(citiesRef.current)
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      if (ready && dayTex && nightTex) {
        gl.disable(gl.BLEND)
        gl.depthMask(true)
        gl.useProgram(earthProg)
        gl.bindVertexArray(earthVao)
        gl.uniform1f(earthURot, rot)
        gl.uniform1f(earthUScale, GLOBE_SCALE)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, dayTex)
        gl.uniform1i(earthUDay, 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, nightTex)
        gl.uniform1i(earthUNight, 1)
        gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0)
      }

      if (pinCountRef.current > 0) {
        gl.enable(gl.BLEND)
        gl.depthMask(false)
        gl.useProgram(pinProg)
        gl.bindVertexArray(pinVao)
        gl.uniform1f(pinURot, rot)
        gl.uniform1f(pinUScale, GLOBE_SCALE)
        gl.uniform1f(pinUPulse, now / 1400)
        gl.uniform1f(pinUDpr, dpr)
        gl.drawArrays(gl.POINTS, 0, pinCountRef.current)
        gl.depthMask(true)
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    const onClick = (e: MouseEvent) => {
      const city = hitTest(e.clientX, e.clientY)
      if (!city) return
      trackPartnersEvent('partners_city_searched')
      onSelectRef.current(city)
    }
    const onMove = (e: MouseEvent) => {
      canvas.style.cursor = hitTest(e.clientX, e.clientY) ? 'pointer' : 'default'
    }
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mousemove', onMove)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [])

  const isHero = variant === 'hero'

  return (
    <div
      className={
        isHero
          ? 'relative mx-auto w-full max-w-xl lg:max-w-2xl'
          : 'relative mx-auto w-full max-w-2xl'
      }
    >
      <div
        ref={wrapRef}
        className={`relative mx-auto aspect-square ${isHero ? 'w-full' : 'w-full max-w-[640px]'}`}
      >
        {/* Soft glow behind — sits outside the canvas so nothing clips square */}
        <div
          className="partners-globe-glow pointer-events-none absolute inset-[-12%] rounded-full"
          aria-hidden
        />
        <canvas
          ref={canvasRef}
          className="relative z-[1] h-full w-full"
          aria-label="Territory globe — click a city marker to select"
        />
      </div>

      {!isHero && (
        <div className="mt-5 flex justify-center gap-5 text-[11px] text-white/75">
          <Legend color="#00C46A" label="Live" />
          <Legend color="#F5A524" label="Reserved" />
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      />
      {label}
    </span>
  )
}
