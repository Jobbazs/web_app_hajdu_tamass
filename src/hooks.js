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
