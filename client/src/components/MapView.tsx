import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import type { MapPoint } from '@/types/map'
import 'leaflet/dist/leaflet.css'

export type { MapPoint } from '@/types/map'

/** Optional pulsing-style layer for Phase 3 admin “active alerts” (extends Phase 4 base map). */
export interface ActiveAlertPoint {
  id: string
  lat: number
  lng: number
}

interface MapViewProps {
  patients?: MapPoint[]
  volunteers?: MapPoint[]
  hospitals?: MapPoint[]
  activeAlerts?: ActiveAlertPoint[]
  center: [number, number]
  zoom?: number
  className?: string
  scrollWheelZoom?: boolean
}

function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map])
  return null
}

function FitPoints({
  points,
  fallbackCenter,
}: {
  points: [number, number][]
  fallbackCenter: [number, number]
}) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) {
      map.setView(fallbackCenter, map.getZoom())
      return
    }
    if (points.length === 1) {
      const p = points[0]
      if (p) {
        map.setView(p, 13)
      }
      return
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 14 })
  }, [map, points, fallbackCenter])
  return null
}

export function MapView({
  patients = [],
  volunteers = [],
  hospitals = [],
  activeAlerts = [],
  center,
  zoom = 14,
  className,
  scrollWheelZoom = false,
}: MapViewProps) {
  const allPoints = useMemo(() => {
    const pts: [number, number][] = [
      ...patients.map((p) => [p.lat, p.lng] as [number, number]),
      ...volunteers.map((p) => [p.lat, p.lng] as [number, number]),
      ...hospitals.map((p) => [p.lat, p.lng] as [number, number]),
      ...activeAlerts.map((p) => [p.lat, p.lng] as [number, number]),
    ]
    return pts
  }, [patients, volunteers, hospitals, activeAlerts])

  return (
    <div className={className ?? 'h-64 w-full overflow-hidden rounded-md'}>
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom={scrollWheelZoom}>
        <InvalidateOnMount />
        <FitPoints points={allPoints} fallbackCenter={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {patients.map((p) => (
          <CircleMarker
            key={`p-${p.id}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.85 }}
          >
            <Popup>{p.name || 'Patient'}</Popup>
          </CircleMarker>
        ))}
        {volunteers.map((p) => (
          <CircleMarker
            key={`v-${p.id}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.85 }}
          >
            <Popup>{p.name || 'Volunteer'}</Popup>
          </CircleMarker>
        ))}
        {hospitals.map((p) => (
          <CircleMarker
            key={`h-${p.id}`}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.85 }}
          >
            <Popup>{p.name || 'Hospital'}</Popup>
          </CircleMarker>
        ))}
        {activeAlerts.map((p) => (
          <CircleMarker
            key={`a-${p.id}`}
            center={[p.lat, p.lng]}
            radius={14}
            pathOptions={{ color: '#dc2626', fillOpacity: 0.15 }}
          >
            <Popup>Alert</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
