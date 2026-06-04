import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Contact from '../components/Contact'
import { supabase } from '../supabaseClient'

describe('Contact – megjelenés', () => {
  it('renderel egy form-ot', () => {
    render(<Contact />)
    expect(screen.getByLabelText('Neved')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Szolgáltatás')).toBeInTheDocument()
    expect(screen.getByLabelText('Üzeneted')).toBeInTheDocument()
  })
  it('a küldés gomb látható', () => {
    render(<Contact />)
    expect(screen.getByRole('button', { name: /küldés/i })).toBeInTheDocument()
  })
  it('a kapcsolat cím megjelenik', () => {
    render(<Contact />)
    expect(screen.getByText('Kapcsolat')).toBeInTheDocument()
  })
})

describe('Contact – validáció', () => {
  it('üres form – hibaüzenet jelenik meg', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText('Kérlek add meg a neved.')).toBeInTheDocument()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('csak név – érvényes email hibaüzenet', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText('Érvényes email szükséges.')).toBeInTheDocument()
  })

  it('hibás email formátum – hibaüzenet jelenik meg', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.type(screen.getByLabelText('Email'), 'nemvalid')
    await user.type(screen.getByLabelText('Üzeneted'), 'Helló!')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText('Érvényes email szükséges.')).toBeInTheDocument()
  })

  it('üzenet mező üres – hibaüzenet jelenik meg', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.type(screen.getByLabelText('Email'), 'teszt@email.com')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText('Az üzenet mező nem lehet üres.')).toBeInTheDocument()
  })
})

describe('Contact – sikeres küldés', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  it('sikeres küldés után success üzenet jelenik meg', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.type(screen.getByLabelText('Email'), 'teszt@email.com')
    await user.type(screen.getByLabelText('Üzeneted'), 'Érdeklődöm!')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText(/megérkezett/i)).toBeInTheDocument()
  })

  it('sikeres küldés után a form eltűnik', async () => {
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.type(screen.getByLabelText('Email'), 'teszt@email.com')
    await user.type(screen.getByLabelText('Üzeneted'), 'Helló!')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    await waitFor(() => {
      expect(screen.queryByLabelText('Neved')).not.toBeInTheDocument()
    })
  })

  it('Supabase insert helyes adatokkal hívódik', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    supabase.from.mockReturnValue({ insert: mockInsert })
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'Teszt Elek')
    await user.type(screen.getByLabelText('Email'), 'teszt@email.com')
    await user.type(screen.getByLabelText('Üzeneted'), 'Érdeklődöm!')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Teszt Elek', email: 'teszt@email.com', read: false,
      }))
    })
  })
})

describe('Contact – Supabase hiba', () => {
  it('hálózati hiba esetén hibaüzenet jelenik meg', async () => {
    vi.clearAllMocks()
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'Network error' } }),
    })
    const user = userEvent.setup()
    render(<Contact />)
    await user.type(screen.getByLabelText('Neved'), 'X')
    await user.type(screen.getByLabelText('Email'), 'x@x.com')
    await user.type(screen.getByLabelText('Üzeneted'), 'Üzenet')
    await user.click(screen.getByRole('button', { name: /küldés/i }))
    expect(await screen.findByText(/hiba történt/i)).toBeInTheDocument()
  })
})
