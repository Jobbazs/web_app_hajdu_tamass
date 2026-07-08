import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

// ─── Portfólió elemek ────────────────────────────────────────
export function usePortfolio() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*, portfolio_categories(id, slug, label_hu, label_en)')
      .eq('visible', true)
      .order('sort_order', { ascending: true })
    if (error) setError(error)
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { items, loading, error, refetch: fetch }
}

// ─── Portfólió kategóriák ────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('portfolio_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { categories, loading, refetch: fetch }
}

// ─── Szolgáltatások ──────────────────────────────────────────
export function useServices() {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true })
    setServices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { services, loading, refetch: fetch }
}

// ─── Site content ────────────────────────────────────────────
export function useSiteContent() {
  const [content, setContent] = useState({})
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('site_content').select('key, value')
    const map = {}
    ;(data || []).forEach(row => { map[row.key] = row.value })
    setContent(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { content, loading, refetch: fetch }
}

// ─── Custom sections – ADMIN: minden szekciót visszaad (visible és rejtett is)
export function useAllCustomSections() {
  const [sections, setSections] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('custom_sections')
      .select('*')
      .order('sort_order', { ascending: true })
    setSections(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { sections, loading, refetch: fetch }
}

// ─── Custom sections – FŐOLDAL: csak a látható szekciók
export function useCustomSections() {
  const [sections, setSections] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('custom_sections')
      .select('*')
      .eq('visible', true)
      .order('sort_order', { ascending: true })
    setSections(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { sections, loading, refetch: fetch }
}

// ─── Időpontfoglalás – elérhető slotok (publikus) ────────────
export function useAvailableSlots() {
  const [slots,   setSlots]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('available_slots')   // a view-t olvassa
      .select('*')
      .order('slot_date', { ascending: true })
    setSlots(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { slots, loading, refetch: fetch }
}

// ─── Admin: összes slot (látható és rejtett) ──────────────────
export function useAllSlots() {
  const [slots,   setSlots]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointment_slots')
      .select('*')
      .order('slot_date', { ascending: true })
    setSlots(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { slots, loading, refetch: fetch }
}

// ─── Admin: foglalások ────────────────────────────────────────
export function useAppointments(filter = 'all') {
  const [appointments, setAppointments] = useState([])
  const [loading,      setLoading]      = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('appointments')
      .select('*, appointment_slots(title, slot_date, start_time, end_time, service_type)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setAppointments(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetch() }, [fetch])
  return { appointments, loading, refetch: fetch }
}

// ─── Admin: megbízhatósági lista ──────────────────────────────
export function useClientReliability() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('client_reliability')
      .select('*')
      .order('reliability_level', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { clients, loading, refetch: fetch }
}
