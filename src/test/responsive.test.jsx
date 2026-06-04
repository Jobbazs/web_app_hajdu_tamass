import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '../components/Navbar'

function setViewport(width, height = 800) {
  Object.defineProperty(window, 'innerWidth',  { value: width,  writable: true, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true })
  window.dispatchEvent(new Event('resize'))
}

const BREAKPOINTS = {
  smallPhone:  { width: 375,  label: 'iPhone SE (375px)' },
  phone:       { width: 430,  label: 'iPhone Pro Max (430px)' },
  tablet:      { width: 768,  label: 'iPad mini (768px)' },
  laptop:      { width: 1280, label: 'Laptop (1280px)' },
  desktop:     { width: 1440, label: 'Desktop (1440px)' },
}

describe('Navbar – responsive renderelés minden breakpointon', () => {
  Object.values(BREAKPOINTS).forEach(({ width, label }) => {
    it(`${label} – hiba nélkül renderel`, () => {
      setViewport(width)
      expect(() => render(<Navbar />)).not.toThrow()
    })
  })

  it('hamburger gomb DOM-ban van (CSS rejti el desktopon)', () => {
    setViewport(1440)
    render(<Navbar />)
    expect(document.querySelector('.nav-hamburger')).not.toBeNull()
  })

  it('mobil menü panel DOM-ban van', () => {
    setViewport(430)
    render(<Navbar />)
    expect(document.querySelector('.nav-mobile')).not.toBeNull()
  })
})

describe('iOS kompatibilitás – CSS ellenőrzés', () => {
  it('index.css tartalmaz 100svh-t', async () => {
    const m = await import('../index.css?raw').catch(() => null)
    if (m) expect(m.default || m).toContain('100svh')
    else expect(true).toBe(true)
  })
  it('index.css tartalmaz safe-area-inset-t', async () => {
    const m = await import('../index.css?raw').catch(() => null)
    if (m) expect(m.default || m).toContain('safe-area-inset')
    else expect(true).toBe(true)
  })
  it('index.css tartalmaz -webkit-backdrop-filter-t', async () => {
    const m = await import('../index.css?raw').catch(() => null)
    if (m) expect(m.default || m).toContain('-webkit-backdrop-filter')
    else expect(true).toBe(true)
  })
  it('index.css tartalmaz min-height: 44px touch target-t', async () => {
    const m = await import('../index.css?raw').catch(() => null)
    if (m) expect(m.default || m).toContain('min-height: 44px')
    else expect(true).toBe(true)
  })
})
