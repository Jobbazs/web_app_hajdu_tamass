import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar   from '../components/Navbar'
import Hero     from '../components/Hero'
import About    from '../components/About'
import Services from '../components/Services'
import Footer   from '../components/Footer'
import { OWNER, SERVICES } from '../data'

describe('Navbar', () => {
  it('renderel a logóval', () => {
    render(<Navbar />)
    expect(document.querySelector('.nav-logo')).not.toBeNull()
  })
  it('desktop nav linkek DOM-ban vannak', () => {
    render(<Navbar />)
    expect(document.querySelector('.nav-links')).not.toBeNull()
    expect(document.querySelectorAll('.nav-links a').length).toBe(4)
  })
  it('hamburger gomb renderel', () => {
    render(<Navbar />)
    expect(screen.getByLabelText(/menü megnyitása/i)).toBeInTheDocument()
  })
  it('hamburger kattintásra mobil menü megnyílik', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByLabelText(/menü megnyitása/i))
    expect(document.querySelector('.nav-mobile.open')).not.toBeNull()
  })
  it('nyitott menü újra kattintásra bezárul', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByLabelText(/menü megnyitása/i))
    await user.click(screen.getByLabelText(/menü bezárása/i))
    expect(document.querySelector('.nav-mobile.open')).toBeNull()
  })
})

describe('Hero', () => {
  it('a főcím megjelenik', () => {
    render(<Hero />)
    expect(screen.getByText(/ahol a fény/i)).toBeInTheDocument()
  })
  it('CTA gomb renderel', () => {
    render(<Hero />)
    expect(screen.getByRole('button', { name: /portfólió/i })).toBeInTheDocument()
  })
  it('CTA kattintható', async () => {
    const user = userEvent.setup()
    const mockEl = document.createElement('div')
    mockEl.id = 'portfolio'
    document.body.appendChild(mockEl)
    render(<Hero />)
    await user.click(screen.getByRole('button', { name: /portfólió/i }))
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    document.body.removeChild(mockEl)
  })
})

describe('About', () => {
  it('"Rólam" szekció renderel', () => {
    render(<About />)
    expect(screen.getByText('Rólam')).toBeInTheDocument()
  })
  it('tag-ek megjelennek', () => {
    render(<About />)
    expect(screen.getByText('Videóklipp')).toBeInTheDocument()
    expect(screen.getByText('Urbex')).toBeInTheDocument()
    expect(screen.getByText('Rave / Buli')).toBeInTheDocument()
  })
  it('placeholder látható ha nincs portraitUrl', () => {
    render(<About />)
    if (!OWNER.portraitUrl) {
      expect(screen.getByText(/portré fotó/i)).toBeInTheDocument()
    }
  })
})

describe('Services', () => {
  it('mind a 3 szolgáltatás megjelenik', () => {
    render(<Services />)
    SERVICES.forEach(s => {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    })
  })
  it('sorszámok megjelennek', () => {
    render(<Services />)
    SERVICES.forEach(s => {
      expect(screen.getByText(s.id)).toBeInTheDocument()
    })
  })
})

describe('Footer', () => {
  it('social linkek megjelennek', () => {
    render(<Footer />)
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    // expect(screen.getByText('TikTok')).toBeInTheDocument()
    // expect(screen.getByText('Behance')).toBeInTheDocument()
  })
  it('jelenlegi év megjelenik', () => {
    render(<Footer />)
    expect(screen.getByText(new RegExp(new Date().getFullYear().toString()))).toBeInTheDocument()
  })
})
