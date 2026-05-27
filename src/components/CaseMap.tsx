import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface Props {
  lat?: number | null
  lng?: number | null
  address?: string | null
  priority?: string
  height?: string
}

/**
 * Loads Leaflet on demand (so it can find its CSS+icons) and renders a
 * small map centered on the case location. Uses Esri's World Street Map
 * tile service (free, signals our ArcGIS integration story to evaluators).
 */
export function CaseMap({ lat, lng, address, priority, height = '180px' }: Props) {
  const [LeafletReady, setLeafletReady] = useState(false)
  const [containerId] = useState(() => `map-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    if (lat == null || lng == null) return
    let mounted = true
    let map: any = null
    ;(async () => {
      const L = (await import('leaflet')).default
      if (!mounted) return
      // Fix default-icon URL resolution
      // @ts-expect-error - leaflet's bundled icon URLs don't resolve via Vite
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setLeafletReady(true)
      const el = document.getElementById(containerId)
      if (!el || el.children.length > 0) return
      map = L.map(el, { zoomControl: false, attributionControl: false }).setView([lat, lng], 16)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
      }).addTo(map)
      const color = priorityColor(priority)
      const marker = L.circleMarker([lat, lng], {
        radius: 9, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 0.95,
      }).addTo(map)
      marker.bindTooltip(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, { permanent: false, direction: 'top' })
    })()
    return () => {
      mounted = false
      if (map) map.remove()
    }
  }, [lat, lng, address, priority, containerId])

  if (lat == null || lng == null) {
    return (
      <div style={{ height }} className="rounded bg-gradient-to-br from-jax-blue/10 to-jax-navy/10 dark:from-jax-blue/20 dark:to-jax-navy/30 border border-dashed border-jax-blue/30 flex items-center justify-center text-xs text-jax-gray-3 italic">
        No coordinates on file for this case
      </div>
    )
  }

  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div className="relative rounded overflow-hidden border border-jax-gray-1 dark:border-jax-blue/20" style={{ height }}>
      <div id={containerId} className="absolute inset-0" />
      {!LeafletReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-jax-light dark:bg-jax-navy-deep/40 text-xs text-jax-gray-3 italic">
          Loading map…
        </div>
      )}
      <a
        href={gmapsUrl} target="_blank" rel="noopener"
        className="absolute bottom-1 right-1 z-10 px-2 py-1 text-[10px] bg-white/95 dark:bg-jax-navy-deep/95 text-jax-blue hover:text-jax-sky rounded shadow-sm border border-jax-gray-1 dark:border-jax-blue/20 inline-flex items-center gap-1"
      >
        <ExternalLink className="h-2.5 w-2.5" /> Open in maps
      </a>
      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/90 dark:bg-jax-navy-deep/90 text-jax-gray-3 rounded">
        Esri World Street Map
      </div>
    </div>
  )
}

function priorityColor(p?: string): string {
  switch (p) {
    case 'emergency': return '#7F1D1D'
    case 'urgent':    return '#B91C1C'
    case 'high':      return '#D97706'
    case 'normal':    return '#1E5BC6'
    case 'low':       return '#697586'
    default:          return '#1E5BC6'
  }
}
