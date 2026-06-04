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
      .select('*')
      .eq('visible', true)
      .order('sort_order', { ascending: true })
    if (error) setError(error)
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { items, loading, error, refetch: fetch }
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

// ─── Site content (hero, about szövegek) ────────────────────
export function useSiteContent() {
  const [content, setContent] = useState({})
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('site_content')
      .select('key, value')
    // { key: value } objektummá alakítjuk
    const map = {}
    ;(data || []).forEach(row => { map[row.key] = row.value })
    setContent(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { content, loading, refetch: fetch }
}
