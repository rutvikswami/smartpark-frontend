import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, MapPin, Clock, Users, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OccupancyChart } from '@/components/charts/OccupancyChart'
import { PredictionChart } from '@/components/charts/PredictionChart'
import { SlotGrid } from '@/components/slots/SlotGrid'
import { ReserveSlotDialog } from '@/components/reservations/ReserveSlotDialog'
import { SystemStatusIndicator } from '@/components/monitoring/SystemStatusIndicator'
import { supabase } from '@/lib/supabase.ts'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type { Database } from '@/lib/supabase.ts'

type ParkingArea = Database['public']['Tables']['parking_areas']['Row']
type Slot = Database['public']['Tables']['slots']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row']

export function Dashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [userReservations, setUserReservations] = useState<string[]>([])
  const [reserveSlotId, setReserveSlotId] = useState<string>('')
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number>(0)

  // Fetch parking areas
  useEffect(() => {
    const fetchParkingAreas = async () => {
      const { data, error } = await supabase
        .from('parking_areas')
        .select('*')

      if (error) {
        toast.error('Failed to load parking areas')
      } else if (data) {
        setParkingAreas(data)
        
        // Check if area is specified in URL params (from map navigation)
        const areaFromUrl = searchParams.get('area')
        if (areaFromUrl && data.find(area => area.id === areaFromUrl)) {
          setSelectedAreaId(areaFromUrl)
        } else if (data.length > 0 && !selectedAreaId) {
          setSelectedAreaId(data[0].id)
        }
      }
    }

    fetchParkingAreas()
  }, [searchParams])

  // Fetch slots for selected area
  useEffect(() => {
    if (!selectedAreaId) return

    const fetchSlots = async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .eq('parking_area_id', selectedAreaId)
        .order('slot_number')

      if (error) {
        toast.error('Failed to load slots')
      } else if (data) {
        setSlots(data)
      }
    }

    fetchSlots()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`slots-${selectedAreaId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'slots', filter: `parking_area_id=eq.${selectedAreaId}` },
        (payload) => {
          fetchSlots() // Refetch all slots for simplicity
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedAreaId])

  // Fetch user reservations
  useEffect(() => {
    if (!user) return

    const fetchUserReservations = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('slot_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) {
        // Silent error for reservations
      } else if (data) {
        setUserReservations(data.map(r => r.slot_id))
      }
    }

    fetchUserReservations()
  }, [user])

  // Fetch predictions
  useEffect(() => {
    if (!selectedAreaId) return

    const fetchPredictions = async () => {
      // Get slot IDs for the selected area
      const { data: areaSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('parking_area_id', selectedAreaId)

      if (!areaSlots) return

      const slotIds = areaSlots.map(s => s.id)
      
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .in('slot_id', slotIds)
        .gte('timestamp', new Date().toISOString())
        .lte('timestamp', new Date(Date.now() + 30 * 60 * 1000).toISOString()) // Next 30 minutes
        .order('timestamp')

      if (error) {
        // Silent error for predictions
      } else if (data) {
        setPredictions(data)
      }
    }

    fetchPredictions()
  }, [selectedAreaId])

  const handleReserveSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    if (slot) {
      setReserveSlotId(slotId)
      setSelectedSlotNumber(slot.slot_number)
    }
  }

  const handleConfirmReservation = async (startTime: string, endTime: string) => {
    if (!user || !reserveSlotId) return

    const { error } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        slot_id: reserveSlotId,
        start_time: startTime,
        end_time: endTime,
        status: 'active'
      })

    if (error) {
      toast.error('Failed to create reservation')
    } else {
      // Update slot status
      await supabase
        .from('slots')
        .update({ status: 'reserved' })
        .eq('id', reserveSlotId)

      toast.success('Slot reserved successfully!')
      setReserveSlotId('')
      setUserReservations(prev => [...prev, reserveSlotId])
    }
  }

  const selectedArea = parkingAreas.find(area => area.id === selectedAreaId)
  
  const occupancyData = {
    free: slots.filter(s => s.status === 'free').length,
    occupied: slots.filter(s => s.status === 'occupied').length,
    reserved: slots.filter(s => s.status === 'reserved').length,
  }

  // Generate prediction chart data
  const predictionChartData = Array.from({ length: 6 }, (_, i) => {
    const time = new Date(Date.now() + i * 5 * 60 * 1000)
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    
    // Calculate average probability for this time slot
    const timeStamp = time.toISOString()
    const relevantPredictions = predictions.filter(p => 
      new Date(p.timestamp).getTime() <= time.getTime() &&
      new Date(p.timestamp).getTime() > time.getTime() - 5 * 60 * 1000
    )
    
    const avgProbability = relevantPredictions.length > 0
      ? relevantPredictions.reduce((sum, p) => sum + p.probability, 0) / relevantPredictions.length
      : Math.random() * 0.3 + 0.7 // Fallback to random data for demo
    
    return {
      time: timeStr,
      probability: avgProbability
    }
  })

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your parking slots in real-time</p>
          </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4">
          {selectedArea && (
            <button
              onClick={() => {
                const url = `https://www.google.pt/maps/search/${encodeURIComponent(selectedArea.name)}/@${selectedArea.lat},${selectedArea.lng},17z`
                window.open(url, '_blank')
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">View in Google Maps</span>
              <span className="sm:hidden">Maps</span>
            </button>
          )}
          <div className="w-full sm:w-64">
            <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
              <SelectTrigger className="bg-card border-border shadow-soft hover:shadow-medium transition-all duration-300">
                <SelectValue placeholder="Select parking area" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border shadow-large">
                {parkingAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id} className="hover:bg-accent/50 transition-colors">
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6"
        >
          <Card className="bg-card border-border shadow-soft hover:shadow-medium card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Slots</CardTitle>
              <Car className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{selectedArea?.total_slots || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Available spaces</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-soft hover:shadow-medium card-hover bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">Free Slots</CardTitle>
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-400">{occupancyData.free}</div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">Ready to use</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-soft hover:shadow-medium card-hover bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">Occupied</CardTitle>
              <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400">{occupancyData.occupied}</div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Currently in use</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border shadow-soft hover:shadow-medium card-hover bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-400">Reserved</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-yellow-700 dark:text-yellow-400">{occupancyData.reserved}</div>
              <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-1">Upcoming bookings</p>
            </CardContent>
          </Card>

          {/* System Status Indicator */}
          <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-1">
            <SystemStatusIndicator 
              systemId={selectedArea ? `parking_monitor_${selectedArea.name.toLowerCase().replace(/\s+/g, '_')}` : undefined}
              location={selectedArea?.name}
            />
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-card rounded-lg border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <OccupancyChart data={occupancyData} />
          </div>
          <div className="bg-card rounded-lg border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <PredictionChart data={predictionChartData} />
          </div>
        </motion.div>

        {/* Slot Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border shadow-soft hover:shadow-medium transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border">
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Parking Slots - {selectedArea?.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on a free slot to reserve it
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <SlotGrid
                slots={slots}
                onReserveSlot={handleReserveSlot}
                userReservations={userReservations}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Reserve Slot Dialog */}
        <ReserveSlotDialog
          isOpen={!!reserveSlotId}
          onClose={() => setReserveSlotId('')}
          onConfirm={handleConfirmReservation}
          slotNumber={selectedSlotNumber}
        />
      </div>
    </div>
  )
}