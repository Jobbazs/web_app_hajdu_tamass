import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../components/Login'
import Admin from '../components/Admin'
import { supabase } from '../supabaseClient'

const mockMessages = [
  { id: '1', name: 'Teszt Elek', email: 'teszt@email.com', service: 'Portré fotózás',
    message: 'Érdeklődöm az árakról.', read: false, created_at: '2025-03-15T10:30:00Z' },
  { id: '2', name: 'Nagy Anna', email: 'anna@email.com', service: 'Rendezvény / Buli fotózás',
    message: 'Bulit szervezünk.', read: true, created_at: '2025-03-10T14:00:00Z' },
]

const setupAdminMock = (data = []) => {
  const chain = {
    select: vi.fn(),
    order:  vi.fn().mockResolvedValue({ data, error: null }),
    eq:     vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
  }
  chain.select.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)  // returns chain so .eq() can chain, but also resolves
  // override: order() resolves directly (for filter=all case, no .eq() is called)
  chain.order.mockImplementation(() => Promise.resolve({ data, error: null }))
  supabase.from.mockReturnValue(chain)
}

describe('Login – megjelenés', () => {
  it('renderel email és jelszó mezővel', () => {
    render(<Login />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Jelszó')).toBeInTheDocument()
  })
  it('a belépés gomb látható', () => {
    render(<Login />)
    expect(screen.getByRole('button', { name: /belépés/i })).toBeInTheDocument()
  })
})

describe('Login – auth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('helyes adatokkal signInWithPassword hívódik', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<Login />)
    await user.type(screen.getByLabelText('Email'), 'admin@test.com')
    await user.type(screen.getByLabelText('Jelszó'), 'pw123')
    await user.click(screen.getByRole('button', { name: /belépés/i }))
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com', password: 'pw123',
      })
    })
  })

  it('hibás bejelentkezés – hibaüzenet jelenik meg', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid' } })
    const user = userEvent.setup()
    render(<Login />)
    await user.type(screen.getByLabelText('Email'), 'rossz@x.com')
    await user.type(screen.getByLabelText('Jelszó'), 'rossz')
    await user.click(screen.getByRole('button', { name: /belépés/i }))
    expect(await screen.findByText('Hibás email vagy jelszó.')).toBeInTheDocument()
  })
})

describe('Admin – megjelenés', () => {
  beforeEach(() => { vi.clearAllMocks(); setupAdminMock([]) })

  it('renderel fejléccel', () => {
    render(<Admin />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('filter gombok megjelennek', () => {
    render(<Admin />)
    expect(screen.getByRole('button', { name: 'Mind' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Olvasatlan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Olvasott' })).toBeInTheDocument()
  })

  it('üres állapot – "Nincs üzenet" jelenik meg', async () => {
    setupAdminMock([])
    render(<Admin />)
    expect(await screen.findByText('Nincs üzenet.')).toBeInTheDocument()
  })
})

describe('Admin – üzenetek betöltése', () => {
  beforeEach(() => vi.clearAllMocks())

  it('üzenetek megjelennek betöltés után', async () => {
    setupAdminMock(mockMessages)
    render(<Admin />)
    expect(await screen.findByText('Teszt Elek')).toBeInTheDocument()
    expect(await screen.findByText('Nagy Anna')).toBeInTheDocument()
  })

  it('"Új" badge jelenik meg olvasatlan üzenetnél', async () => {
    setupAdminMock(mockMessages)
    render(<Admin />)
    // Az "Új" badge class-alapon ellenőrizhető
    await waitFor(() => {
      const badges = document.querySelectorAll('.admin-badge:not(.read)')
      expect(badges.length).toBeGreaterThan(0)
    })
  })
})

describe('Admin – kilépés', () => {
  beforeEach(() => { vi.clearAllMocks(); setupAdminMock([]) })

  it('kilépés gomb megjelenik', () => {
    render(<Admin />)
    expect(screen.getByRole('button', { name: 'Kilépés' })).toBeInTheDocument()
  })

  it('kilépés gombra kattintva signOut hívódik', async () => {
    const user = userEvent.setup()
    render(<Admin />)
    await user.click(screen.getByRole('button', { name: 'Kilépés' }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
