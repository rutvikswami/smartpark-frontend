import { useState, useEffect, useRef } from 'react'
import type { Database } from '@/lib/supabase.ts'

type ParkingArea = Database['public']['Tables']['parking_areas']['Row']
type Slot = Database['public']['Tables']['slots']['Row']

interface ParkingAreaWithOccupancy extends ParkingArea {
  freeSlots: number
  occupiedSlots: number
  reservedSlots: number
  occupancyPercentage: number
}

interface MapComponentProps {
  parkingAreas: ParkingAreaWithOccupancy[]
  onAreaSelect: (areaId: string, areaData?: ParkingAreaWithOccupancy) => void
}

interface MapProps {
  center: { lat: number; lng: number }
  zoom: number
  parkingAreas: ParkingAreaWithOccupancy[]
  onAreaSelect: (areaId: string, areaData?: ParkingAreaWithOccupancy) => void
}

function MapTilerMap({ center, zoom, parkingAreas, onAreaSelect }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [map, setMap] = useState<any>(null)
  const [markersLayer, setMarkersLayer] = useState<any>(null)

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const L = (window as any).L
      if (!L) {
        return
      }
      
      // Remove any existing Leaflet instance
      if (mapRef.current._leaflet_id) {
        try {
          // Try to remove existing map instance
          const existingMap = (window as any).L.map._getContainer?.(mapRef.current)
          if (existingMap) {
            existingMap.remove()
          }
        } catch (e) {
          // Clear the leaflet id manually
          delete mapRef.current._leaflet_id
        }
      }
      
      // Create map
      const newMap = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([center.lat, center.lng], zoom)
      
      // Add MapTiler tile layer
      L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=bUtgcZnxNjR0qtG7QluP`, {
        attribution: '© MapTiler © OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(newMap)
      
      mapInstanceRef.current = newMap
      setMap(newMap)
    }
    
    // Update map view if center or zoom changes
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom)
    }
    
    // Cleanup function - only cleanup on unmount
    return () => {
      // Don't cleanup the map here since this effect runs when center/zoom changes
    }
  }, [center, zoom])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.warn('Error removing map:', e)
        }
        mapInstanceRef.current = null
        setMap(null)
      }
    }
  }, [])

  useEffect(() => {
    if (map && parkingAreas.length > 0) {
      const L = (window as any).L
      if (!L) return

      // Clear existing markers
      if (markersLayer) {
        try {
          map.removeLayer(markersLayer)
        } catch (error) {
          // Error removing markers layer
        }
      }

      const newMarkersLayer = L.layerGroup().addTo(map)
      
      parkingAreas.forEach((area) => {
        // Validate area data
        if (!area || !area.lat || !area.lng || !area.name || area.freeSlots == null) {
          // Invalid area data
          return
        }
        // Determine marker color based on occupancy
        const occupancyColor = area.occupancyPercentage > 80 ? '#EF4444' : 
                              area.occupancyPercentage > 50 ? '#F59E0B' : '#10B981'
        
        // Create custom marker icon
        const customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="
              width: 32px; 
              height: 32px; 
              background-color: ${occupancyColor}; 
              border: 2px solid white; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-weight: bold; 
              font-size: 10px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              ${area.freeSlots}
            </div>
            <div style="
              position: absolute;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              background-color: ${occupancyColor};
              color: white;
              padding: 2px 6px;
              border-radius: 8px;
              font-size: 9px;
              font-weight: bold;
              white-space: nowrap;
              border: 1px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">
              ${area.name}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })

        const marker = L.marker([area.lat, area.lng], { icon: customIcon })
          .addTo(newMarkersLayer)

        const handleMarkerClick = (e: any) => {
          e.originalEvent?.stopPropagation()
          // Single click - select area for sidebar (no popup)
          onAreaSelect(area.id, area)
        }

        marker.on('click', handleMarkerClick)
        
        // Store cleanup function for this marker
        marker._clickCleanup = () => {
          marker.off('click', handleMarkerClick)
        }
      })

      setMarkersLayer(newMarkersLayer)
    }

    // Cleanup function for markers
    return () => {
      if (markersLayer && markersLayer.eachLayer) {
        markersLayer.eachLayer((layer: any) => {
          if (layer._clickCleanup) {
            layer._clickCleanup()
          }
        })
      }
    }
  }, [map, parkingAreas, onAreaSelect])

  return <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
}

export function GoogleMapComponent({ parkingAreas, onAreaSelect }: MapComponentProps) {
  // Calculate center based on parking areas or default to Marathahalli
  const center = parkingAreas.length > 0 
    ? { 
        lat: parkingAreas.reduce((sum, area) => sum + area.lat, 0) / parkingAreas.length,
        lng: parkingAreas.reduce((sum, area) => sum + area.lng, 0) / parkingAreas.length
      }
    : { lat: 12.9600, lng: 77.7280 } // Marathahalli center coordinates (between all locations)
  
  const zoom = 14

  // Load Leaflet CSS and JS
  useEffect(() => {
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        try {
          // Add Leaflet CSS
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          link.id = 'leaflet-css'
          if (!document.getElementById('leaflet-css')) {
            document.head.appendChild(link)
          }

          // Add Leaflet JS
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          script.id = 'leaflet-js'
          
          if (!document.getElementById('leaflet-js')) {
            document.head.appendChild(script)
            
            // Wait for script to load
            await new Promise((resolve, reject) => {
              script.onload = resolve
              script.onerror = reject
            })
          }
        } catch (error) {
          console.error('Error loading Leaflet:', error)
        }
      }
    }

    loadLeaflet()

    // Cleanup function
    return () => {
      // Clean up global functions when component unmounts
      if ((window as any).selectParkingArea) {
        delete (window as any).selectParkingArea
      }
      if ((window as any).openInGoogleMaps) {
        delete (window as any).openInGoogleMaps
      }
    }
  }, [])

  return (
    <MapTilerMap
      center={center}
      zoom={zoom}
      parkingAreas={parkingAreas}
      onAreaSelect={onAreaSelect}
    />
  )
}