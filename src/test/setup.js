import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase – ne próbáljon valódi hálózati hívást indítani
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      order:  vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession:          vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange:   vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword:  vi.fn().mockResolvedValue({ error: null }),
      signOut:             vi.fn().mockResolvedValue({}),
    },
  },
}))

// IntersectionObserver mock (navbar scroll)
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

// matchMedia mock (responsive)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// scrollIntoView mock
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.scrollTo = vi.fn()
