import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoogleMapComponent } from '@/components/map/GoogleMapComponent'
import { MapPin, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase.ts'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/supabase.ts'

type ParkingArea = Database['public']['Tables']['parking_areas']['Row']
type Slot = Database['public']['Tables']['slots']['Row']

interface ParkingAreaWithOccupancy extends ParkingArea {
  freeSlots: number
  occupiedSlots: number
  reservedSlots: number
  occupancyPercentage: number
}

export function MapView() {
  const navigate = useNavigate()
  const [parkingAreasWithOccupancy, setParkingAreasWithOccupancy] = useState<ParkingAreaWithOccupancy[]>([])
  const [selectedArea, setSelectedArea] = useState<ParkingAreaWithOccupancy | null>(null)
  const [loading, setLoading] = useState(true)

  // Debug logging
  console.log('MapView render - parkingAreasWithOccupancy:', parkingAreasWithOccupancy)
  console.log('MapView render - selectedArea:', selectedArea)
  console.log('MapView render - loading:', loading)

  useEffect(() => {
    const fetchParkingAreasWithOccupancy = async () => {
      try {
        setLoading(true)
        // Fetch parking areas
        const { data: areas, error: areasError } = await supabase
          .from('parking_areas')
          .select('*')

        if (areasError) {
          throw areasError
        }

        if (!areas) {
          setParkingAreasWithOccupancy([])
          return
        }

        // Fetch slots for each area and calculate occupancy
        const areasWithOccupancy = await Promise.all(
          areas.map(async (area) => {
            const { data: slots, error: slotsError } = await supabase
              .from('slots')
              .select('*')
              .eq('parking_area_id', area.id)

            if (slotsError) {
              // Error fetching slots for area
              return {
                ...area,
                freeSlots: 0,
                occupiedSlots: 0,
                reservedSlots: 0,
                occupancyPercentage: 0
              }
            }

            const freeSlots = slots?.filter(s => s.status === 'free').length || 0
            const occupiedSlots = slots?.filter(s => s.status === 'occupied').length || 0
            const reservedSlots = slots?.filter(s => s.status === 'reserved').length || 0
            const totalSlots = area.total_slots || 0
            const occupancyPercentage = totalSlots > 0 ? ((occupiedSlots + reservedSlots) / totalSlots) * 100 : 0

            return {
              ...area,
              freeSlots,
              occupiedSlots,
              reservedSlots,
              occupancyPercentage
            }
          })
        )

        setParkingAreasWithOccupancy(areasWithOccupancy)
      } catch (error) {
        // Error fetching parking areas
        toast.error('Failed to load parking areas')
      } finally {
        setLoading(false)
      }
    }

    fetchParkingAreasWithOccupancy()

    // Set up real-time subscriptions for slot updates
    const slotsChannel = supabase
      .channel('slots-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'slots' },
        (payload) => {
          // Slots updated
          fetchParkingAreasWithOccupancy()
        }
      )
      .subscribe()

    // Also listen for parking area changes
    const areasChannel = supabase
      .channel('areas-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'parking_areas' },
        (payload) => {
          // Parking areas updated
          fetchParkingAreasWithOccupancy()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(slotsChannel)
      supabase.removeChannel(areasChannel)
    }
  }, [])

  const handleAreaSelect = (areaId: string, areaData?: ParkingAreaWithOccupancy) => {
    console.log('Area selected:', areaId, areaData) // Debug log
    
    const selectedAreaData = areaData || parkingAreasWithOccupancy.find(a => a.id === areaId)
    
    if (selectedAreaData) {
      console.log('Setting selected area:', selectedAreaData) // Debug log
      setSelectedArea(selectedAreaData)
      // Show details in sidebar only - no automatic navigation
    } else {
      console.log('No area data found for:', areaId) // Debug log
    }
  }

  // Temporarily disable loading screen to debug
  // if (loading) {
  //   return (
  //     <div className="space-y-6">
  //       <h1 className="text-3xl font-bold">Parking Map</h1>
  //       <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
  //           <p className="text-gray-600">Loading parking areas...</p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="h-screen bg-background transition-colors duration-300 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm border-b border-border shadow-soft flex-shrink-0"
      >
        <div className="px-6 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                Smart Parking Map
              </h1>
              <p className="text-muted-foreground text-xs">Real-time parking availability</p>
            </div>
            {selectedArea && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedArea(null)}
                className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/80 transition-all duration-300"
              >
                Clear Selection
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Map Section - Fixed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 h-full"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden h-full">
            <div className="w-full h-full bg-gray-100 relative">
              <GoogleMapComponent
                parkingAreas={parkingAreasWithOccupancy}
                onAreaSelect={handleAreaSelect}
              />
              {/* Fallback if map doesn't load */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-card p-4 rounded shadow-medium text-center border border-border">
                  <p className="text-muted-foreground text-sm">Map loading...</p>
                  <p className="text-xs text-muted-foreground/70">Areas: {parkingAreasWithOccupancy.length}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sidebar - Scrollable */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-80 flex-shrink-0 h-full"
        >
          {selectedArea && selectedArea.name ? (
            <div className="bg-card/90 backdrop-blur-sm rounded-xl shadow-large border border-border h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="gradient-primary p-4 text-primary-foreground flex-shrink-0">
                <h3 className="text-lg font-bold mb-1">{selectedArea.name}</h3>
                <p className="text-primary-foreground/80 text-xs">Parking Area Details</p>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Status */}
                <div className="text-center">
                  <div className={`inline-flex px-4 py-2 rounded-full text-xs font-bold shadow-soft ${
                    (selectedArea.freeSlots || 0) > (selectedArea.total_slots || 0) * 0.5
                      ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-950/40 dark:to-green-900/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : (selectedArea.freeSlots || 0) > 0
                      ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-950/40 dark:to-yellow-900/60 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/40 dark:to-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    {(selectedArea.freeSlots || 0) > (selectedArea.total_slots || 0) * 0.5
                      ? '🟢 Available'
                      : (selectedArea.freeSlots || 0) > 0
                      ? '🟡 Limited'
                      : '🔴 Full'}
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/40 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-center shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectedArea.total_slots || 0}</div>
                    <div className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">Total</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/40 p-3 rounded-lg border border-green-200 dark:border-green-800 text-center shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{selectedArea.freeSlots || 0}</div>
                    <div className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Free</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/40 p-3 rounded-lg border border-red-200 dark:border-red-800 text-center shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{selectedArea.occupiedSlots || 0}</div>
                    <div className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">Occupied</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/40 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{selectedArea.reservedSlots || 0}</div>
                    <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80 font-medium">Reserved</div>
                  </div>
                </div>

                {/* Occupancy */}
                <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">Occupancy Rate</span>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{(selectedArea.occupancyPercentage || 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 shadow-inner">
                    <div 
                      className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-purple-500 shadow-soft"
                      style={{ width: `${selectedArea.occupancyPercentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-3 bg-card/50 p-3 rounded-lg border border-border">
                  <h4 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
                    📍 Location Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground font-medium">Coordinates:</span>
                      <span className="font-mono text-foreground bg-primary/10 px-2 py-1 rounded text-xs">
                        {(selectedArea.lat || 0).toFixed(4)}, {(selectedArea.lng || 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground font-medium">Area ID:</span>
                      <span className="font-mono text-foreground bg-primary/10 px-2 py-1 rounded text-xs">{(selectedArea.id || '').toString().slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground font-medium">Status:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-950/40 px-2 py-1 rounded text-xs">🟢 Live</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <Button
                    onClick={() => navigate(`/dashboard?area=${selectedArea.id}`)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 text-primary-foreground font-semibold text-sm"
                  >
                    📊 View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `https://www.google.pt/maps/search/${encodeURIComponent(selectedArea.name)}/@${selectedArea.lat},${selectedArea.lng},17z`
                      window.open(url, '_blank')
                    }}
                    className="w-full border-border bg-card hover:bg-accent text-foreground hover:text-accent-foreground font-semibold text-sm shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300"
                  >
                    🗺️ Open in Google Maps
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card/90 backdrop-blur-sm rounded-xl shadow-large border border-border h-full flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-medium hover:shadow-large transition-all duration-300 hover:scale-105">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Select Parking Area</h3>
                <p className="text-muted-foreground text-sm">Click on any marker to view details</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}