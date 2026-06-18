import { createClient } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      parking_areas: {
        Row: {
          id: string
          name: string
          lat: number
          lng: number
          total_slots: number
          password?: string
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          lat: number
          lng: number
          total_slots?: number
          password?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          lat?: number
          lng?: number
          total_slots?: number
          password?: string
          created_at?: string
        }
      }
      slots: {
        Row: {
          id: string
          parking_area_id: string
          slot_number: number
          status: 'free' | 'occupied' | 'reserved'
          updated_at: string
        }
        Insert: {
          id?: string
          parking_area_id: string
          slot_number: number
          status?: 'free' | 'occupied' | 'reserved'
          updated_at?: string
        }
        Update: {
          id?: string
          parking_area_id?: string
          slot_number?: number
          status?: 'free' | 'occupied' | 'reserved'
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          slot_id: string
          start_time: string
          end_time: string
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slot_id: string
          start_time: string
          end_time: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slot_id?: string
          start_time?: string
          end_time?: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      predictions: {
        Row: {
          id: string
          slot_id: string
          timestamp: string
          probability: number
        }
        Insert: {
          id?: string
          slot_id: string
          timestamp: string
          probability: number
        }
        Update: {
          id?: string
          slot_id?: string
          timestamp?: string
          probability?: number
        }
      }
      system_status: {
        Row: {
          id: string
          system_id: string
          status: 'online' | 'offline'
          location: string
          last_heartbeat: string
        }
        Insert: {
          id?: string
          system_id: string
          status?: 'online' | 'offline'
          location?: string
          last_heartbeat?: string
        }
        Update: {
          id?: string
          system_id?: string
          status?: 'online' | 'offline'
          location?: string
          last_heartbeat?: string
        }
      }
    }
  }
}

// ----------------------------------------------------
// Mock Data Generation and Database Setup
// ----------------------------------------------------

const DEFAULT_AREAS = [
  {
    id: 'area-1',
    name: 'Tech Park Whitefield',
    lat: 12.9784,
    lng: 77.7412,
    total_slots: 10,
    password: 'tech',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'area-2',
    name: 'Brigade Gateway Mall',
    lat: 12.9806,
    lng: 77.7285,
    total_slots: 8,
    password: 'gate',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'area-3',
    name: 'EPIP Zone Area A',
    lat: 12.9750,
    lng: 77.7160,
    total_slots: 12,
    password: 'epip',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
]

const generateDefaultSlots = (areas: typeof DEFAULT_AREAS) => {
  const slots: any[] = []
  areas.forEach(area => {
    for (let i = 1; i <= area.total_slots; i++) {
      let status: 'free' | 'occupied' | 'reserved' = 'free'
      if (i % 3 === 0) status = 'occupied'
      else if (i % 7 === 0) status = 'reserved'
      
      slots.push({
        id: `slot-${area.id}-${i}`,
        parking_area_id: area.id,
        slot_number: i,
        status: status,
        updated_at: new Date().toISOString()
      })
    }
  })
  return slots
}

const generateDefaultSystemStatuses = (areas: typeof DEFAULT_AREAS) => {
  return areas.map(area => {
    const system_id = `parking_monitor_${area.name.toLowerCase().replace(/\s+/g, '_')}`
    return {
      id: `sys-${area.id}`,
      system_id,
      location: area.name,
      status: 'online' as const,
      last_heartbeat: new Date().toISOString()
    }
  })
}

function initMockDb() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem('smartpark_initialized')) {
    const slots = generateDefaultSlots(DEFAULT_AREAS)
    const systemStatuses = generateDefaultSystemStatuses(DEFAULT_AREAS)
    
    localStorage.setItem('smartpark_parking_areas', JSON.stringify(DEFAULT_AREAS))
    localStorage.setItem('smartpark_slots', JSON.stringify(slots))
    localStorage.setItem('smartpark_system_status', JSON.stringify(systemStatuses))
    localStorage.setItem('smartpark_reservations', JSON.stringify([]))
    localStorage.setItem('smartpark_users', JSON.stringify([
      {
        id: 'user-mock-1',
        email: 'demo@smartpark.com',
        password: 'password123',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]))
    localStorage.setItem('smartpark_initialized', 'true')
  }
}

// ----------------------------------------------------
// Mock Realtime PubSub
// ----------------------------------------------------

const mockChannels: Record<string, any> = {}

class MockChannel {
  private name: string
  listeners: Array<{ event: string, schema: string, table: string, filter?: string, callback: (payload: any) => void }> = []

  constructor(name: string) {
    this.name = name
  }

  on(event: string, config: { event?: string, schema?: string, table?: string, filter?: string }, callback: (payload: any) => void) {
    this.listeners.push({
      event: event || '*',
      schema: config.schema || 'public',
      table: config.table || '',
      filter: config.filter,
      callback
    })
    return this
  }

  subscribe() {
    mockChannels[this.name] = this
    return this
  }
}

function triggerRealtimeChange(table: string, event: string, newRecord: any, oldRecord?: any) {
  Object.values(mockChannels).forEach(channel => {
    channel.listeners.forEach((listener: any) => {
      if (listener.table === table) {
        if (listener.filter) {
          const match = listener.filter.match(/^(\w+)=eq\.(.+)$/)
          if (match) {
            const [, col, val] = match
            if (newRecord[col] !== val && (!oldRecord || oldRecord[col] !== val)) {
              return
            }
          }
        }
        listener.callback({
          eventType: event,
          new: newRecord,
          old: oldRecord
        })
      }
    })
  })
}

// ----------------------------------------------------
// Mock Auth
// ----------------------------------------------------

const mockAuth = {
  listeners: [] as Array<(event: string, session: any) => void>,
  
  async getUser() {
    initMockDb()
    const userJson = localStorage.getItem('smartpark_current_user')
    if (userJson) {
      const user = JSON.parse(userJson)
      return { data: { user }, error: null }
    }
    return { data: { user: null }, error: null }
  },
  
  onAuthStateChange(callback: (event: string, session: any) => void) {
    initMockDb()
    this.listeners.push(callback)
    const userJson = localStorage.getItem('smartpark_current_user')
    const session = userJson ? { user: JSON.parse(userJson) } : null
    callback('INITIAL_SESSION', session)
    
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback)
          }
        }
      }
    }
  },
  
  async signInWithPassword({ email, password }: any) {
    initMockDb()
    const users = JSON.parse(localStorage.getItem('smartpark_users') || '[]')
    const user = users.find((u: any) => u.email === email && u.password === password)
    if (user) {
      const userSession = { id: user.id, email: user.email, created_at: user.created_at }
      localStorage.setItem('smartpark_current_user', JSON.stringify(userSession))
      this.listeners.forEach(l => l('SIGNED_IN', { user: userSession }))
      return { data: { user: userSession, session: { user: userSession } }, error: null }
    }
    return { data: null, error: { message: 'Invalid email or password' } }
  },
  
  async signUp({ email, password }: any) {
    initMockDb()
    const users = JSON.parse(localStorage.getItem('smartpark_users') || '[]')
    if (users.find((u: any) => u.email === email)) {
      return { data: null, error: { message: 'User already exists' } }
    }
    const newUser = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      email,
      password,
      created_at: new Date().toISOString()
    }
    users.push(newUser)
    localStorage.setItem('smartpark_users', JSON.stringify(users))
    
    const userSession = { id: newUser.id, email: newUser.email, created_at: newUser.created_at }
    localStorage.setItem('smartpark_current_user', JSON.stringify(userSession))
    this.listeners.forEach(l => l('SIGNED_IN', { user: userSession }))
    return { data: { user: userSession, session: { user: userSession } }, error: null }
  },
  
  async signOut() {
    initMockDb()
    localStorage.removeItem('smartpark_current_user')
    this.listeners.forEach(l => l('SIGNED_OUT', null))
    return { error: null }
  }
}

// ----------------------------------------------------
// Mock Query Builder
// ----------------------------------------------------

class MockQueryBuilder {
  private tableName: string
  private filters: Array<(item: any) => boolean> = []
  private isSingle = false
  private orderCol = ''
  private orderAscending = true
  private dataToInsert: any = null
  private dataToUpdate: any = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(fields?: string) {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push(item => item[column] === value)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push(item => values.includes(item[column]))
    return this
  }

  gte(column: string, value: any) {
    this.filters.push(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() >= new Date(value).getTime()
    })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push(item => {
      if (!item[column]) return false
      return new Date(item[column]).getTime() <= new Date(value).getTime()
    })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column
    this.orderAscending = options?.ascending !== false
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  insert(data: any) {
    this.dataToInsert = data
    return this
  }

  update(data: any) {
    this.dataToUpdate = data
    return this
  }

  private getTableData(): any[] {
    if (this.tableName === 'predictions') {
      const slots = JSON.parse(localStorage.getItem('smartpark_slots') || '[]')
      const predictions: any[] = []
      slots.forEach((slot: any) => {
        for (let i = 0; i < 6; i++) {
          predictions.push({
            id: `pred-${slot.id}-${i}`,
            slot_id: slot.id,
            timestamp: new Date(Date.now() + i * 5 * 60 * 1000).toISOString(),
            probability: 0.5 + Math.random() * 0.4
          })
        }
      })
      return predictions
    }
    return JSON.parse(localStorage.getItem(`smartpark_${this.tableName}`) || '[]')
  }

  private saveTableData(data: any[]) {
    if (this.tableName === 'predictions') return
    localStorage.setItem(`smartpark_${this.tableName}`, JSON.stringify(data))
  }

  async execute() {
    initMockDb()

    // 1. Handle Insert
    if (this.dataToInsert) {
      const tableData = this.getTableData()
      const newItems = Array.isArray(this.dataToInsert) ? this.dataToInsert : [this.dataToInsert]
      const insertedItems = newItems.map((item: any) => ({
        id: item.id || `mock-id-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        ...item
      }))
      tableData.push(...insertedItems)
      this.saveTableData(tableData)
      
      insertedItems.forEach((item: any) => {
        triggerRealtimeChange(this.tableName, 'INSERT', item)
      })

      return { data: Array.isArray(this.dataToInsert) ? insertedItems : insertedItems[0], error: null }
    }

    // 2. Handle Update
    if (this.dataToUpdate) {
      const tableData = this.getTableData()
      let updatedCount = 0
      let lastNewItem: any = null
      const updatedData = tableData.map((item: any) => {
        const matches = this.filters.every(filter => filter(item))
        if (matches) {
          updatedCount++
          const oldItem = { ...item }
          const newItem = { ...item, ...this.dataToUpdate }
          triggerRealtimeChange(this.tableName, 'UPDATE', newItem, oldItem)
          lastNewItem = newItem
          return newItem
        }
        return item
      })
      this.saveTableData(updatedData)
      return { data: lastNewItem || this.dataToUpdate, error: null }
    }

    // 3. Handle Select
    let tableData = this.getTableData()

    if (this.filters.length > 0) {
      tableData = tableData.filter(item => this.filters.every(filter => filter(item)))
    }

    if (this.orderCol) {
      tableData.sort((a, b) => {
        let valA = a[this.orderCol]
        let valB = b[this.orderCol]
        if (typeof valA === 'string' && typeof valB === 'string') {
          return this.orderAscending ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return this.orderAscending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1)
      })
    }

    if (this.tableName === 'reservations') {
      const slots = JSON.parse(localStorage.getItem('smartpark_slots') || '[]')
      const areas = JSON.parse(localStorage.getItem('smartpark_parking_areas') || '[]')
      tableData = tableData.map(res => {
        const slot = slots.find((s: any) => s.id === res.slot_id)
        const area = slot ? areas.find((a: any) => a.id === slot.parking_area_id) : null
        return {
          ...res,
          slots: slot ? {
            slot_number: slot.slot_number,
            parking_areas: area ? {
              name: area.name
            } : null
          } : null
        }
      })
    }

    if (this.isSingle) {
      return { data: tableData.length > 0 ? tableData[0] : null, error: null }
    }

    return { data: tableData, error: null }
  }

  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute()
      resolve(result)
    } catch (err) {
      reject(err)
    }
  }
}

// ----------------------------------------------------
// Unified Wrapper Client
// ----------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let realSupabase: any = null
let useMock = false

const isPlaceholder = (val: string | undefined) => {
  if (!val) return true
  const lower = val.toLowerCase()
  return lower.includes('placeholder') || lower.includes('your_') || lower === ''
}

if (!isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)) {
  try {
    realSupabase = createClient(supabaseUrl!, supabaseAnonKey!)
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err)
    useMock = true
  }
} else {
  console.info('Supabase URL/Key is not set or using placeholder values. Falling back to frontend mock client.')
  useMock = true
}

function isNetworkError(error: any): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.status === 0 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('connect') ||
    msg.includes('timeout') ||
    msg.includes('unreachable')
  )
}

class WrappedQueryBuilder {
  private tableName: string
  private chain: Array<{ method: string; args: any[] }> = []

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(...args: any[]) {
    this.chain.push({ method: 'select', args })
    return this
  }

  eq(...args: any[]) {
    this.chain.push({ method: 'eq', args })
    return this
  }

  in(...args: any[]) {
    this.chain.push({ method: 'in', args })
    return this
  }

  gte(...args: any[]) {
    this.chain.push({ method: 'gte', args })
    return this
  }

  lte(...args: any[]) {
    this.chain.push({ method: 'lte', args })
    return this
  }

  order(...args: any[]) {
    this.chain.push({ method: 'order', args })
    return this
  }

  single(...args: any[]) {
    this.chain.push({ method: 'single', args })
    return this
  }

  insert(...args: any[]) {
    this.chain.push({ method: 'insert', args })
    return this
  }

  update(...args: any[]) {
    this.chain.push({ method: 'update', args })
    return this
  }

  async execute(): Promise<any> {
    if (useMock || !realSupabase) {
      return this.executeMock()
    }

    try {
      let builder = realSupabase.from(this.tableName)
      for (const call of this.chain) {
        builder = (builder as any)[call.method](...call.args)
      }
      
      const response = await builder
      if (response.error && isNetworkError(response.error)) {
        throw response.error
      }
      return response
    } catch (err) {
      console.warn(`Real Supabase operation failed on table ${this.tableName}, falling back to mock:`, err)
      useMock = true
      
      if (typeof window !== 'undefined') {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Supabase is down. Operating in offline/fallback mode with local dummy data.')
        }).catch(() => {})
      }
      
      return this.executeMock()
    }
  }

  private executeMock() {
    let mockBuilder = new MockQueryBuilder(this.tableName)
    for (const call of this.chain) {
      mockBuilder = (mockBuilder as any)[call.method](...call.args)
    }
    return mockBuilder.execute()
  }

  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute()
      resolve(result)
    } catch (err) {
      reject(err)
    }
  }
}

export const supabase = {
  auth: {
    async getUser() {
      if (!useMock && realSupabase) {
        try {
          const res = await realSupabase.auth.getUser()
          if (res.error && isNetworkError(res.error)) throw res.error
          return res
        } catch (err) {
          console.warn('Supabase auth.getUser failed, falling back to mock:', err)
          useMock = true
        }
      }
      return mockAuth.getUser()
    },
    onAuthStateChange(callback: any) {
      if (!useMock && realSupabase) {
        try {
          const res = realSupabase.auth.onAuthStateChange(async (event: any, session: any) => {
            callback(event, session)
          })
          return res
        } catch (err) {
          console.warn('Supabase onAuthStateChange failed, falling back to mock:', err)
          useMock = true
        }
      }
      return mockAuth.onAuthStateChange(callback)
    },
    async signInWithPassword(credentials: any) {
      if (!useMock && realSupabase) {
        try {
          const res = await realSupabase.auth.signInWithPassword(credentials)
          if (res.error && isNetworkError(res.error)) throw res.error
          return res
        } catch (err) {
          console.warn('Supabase signInWithPassword failed, falling back to mock:', err)
          useMock = true
        }
      }
      return mockAuth.signInWithPassword(credentials)
    },
    async signUp(credentials: any) {
      if (!useMock && realSupabase) {
        try {
          const res = await realSupabase.auth.signUp(credentials)
          if (res.error && isNetworkError(res.error)) throw res.error
          return res
        } catch (err) {
          console.warn('Supabase signUp failed, falling back to mock:', err)
          useMock = true
        }
      }
      return mockAuth.signUp(credentials)
    },
    async signOut() {
      if (!useMock && realSupabase) {
        try {
          return await realSupabase.auth.signOut()
        } catch (err) {
          console.warn('Supabase signOut failed, falling back to mock:', err)
          useMock = true
        }
      }
      return mockAuth.signOut()
    }
  },
  
  from(table: string) {
    if (!useMock && realSupabase) {
      return new WrappedQueryBuilder(table)
    }
    return new MockQueryBuilder(table)
  },
  
  channel(name: string) {
    if (!useMock && realSupabase) {
      try {
        return realSupabase.channel(name)
      } catch (err) {
        console.warn('Supabase channel failed, falling back to mock:', err)
        useMock = true
      }
    }
    return new MockChannel(name)
  },
  
  async removeChannel(channel: any) {
    if (!useMock && realSupabase) {
      try {
        return await realSupabase.removeChannel(channel)
      } catch (err) {
        // ignore
      }
    }
  }
}
