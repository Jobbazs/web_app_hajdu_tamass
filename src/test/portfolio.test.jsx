import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Portfolio from '../components/Portfolio'
import { PORTFOLIO_ITEMS } from '../data'

// Filter gombok a .portfolio-filters div-ben vannak
const getFilterBtn = (label) => {
  const filters = document.querySelector('.portfolio-filters')
  return within(filters).getByText(label)
}

describe('Portfolio – megjelenés', () => {
  it('renderel fejléccel és filterekkel', () => {
    render(<Portfolio />)
    expect(screen.getByText('Portfólió')).toBeInTheDocument()
    expect(document.querySelectorAll('.filter-btn').length).toBeGreaterThanOrEqual(5)
  })

  it('alapból "Mind" filter aktív', () => {
    render(<Portfolio />)
    const activeBtn = document.querySelector('.filter-btn.active')
    expect(activeBtn).not.toBeNull()
    expect(activeBtn.textContent).toBe('Mind')
  })

  it('alapból az összes portfólió elem látható (img alt alapján)', () => {
    render(<Portfolio />)
    PORTFOLIO_ITEMS.forEach(item => {
      expect(screen.queryByAltText(item.title)).not.toBeNull()
    })
  })
})

describe('Portfolio – filter', () => {
  it('filter váltás után az aktív osztály átkerül', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    const portraitBtn = getFilterBtn('Portré')
    await user.click(portraitBtn)
    expect(portraitBtn.className).toContain('active')
    expect(document.querySelector('.filter-btn.active').textContent).toBe('Portré')
  })

  it('portrait filter csak portré képeket mutat', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    await user.click(getFilterBtn('Portré'))
    const portraits = PORTFOLIO_ITEMS.filter(i => i.category === 'portrait')
    const nonPortraits = PORTFOLIO_ITEMS.filter(i => i.category !== 'portrait')
    portraits.forEach(item => {
      expect(screen.queryByAltText(item.title)).not.toBeNull()
    })
    nonPortraits.forEach(item => {
      expect(screen.queryByAltText(item.title)).toBeNull()
    })
  })

  it('event filter csak event képeket mutat', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    await user.click(getFilterBtn('Rendezvény'))
    const events = PORTFOLIO_ITEMS.filter(i => i.category === 'event')
    events.forEach(item => {
      expect(screen.queryByAltText(item.title)).not.toBeNull()
    })
  })

  it('Mind-re visszaváltva minden kép visszajön', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    await user.click(getFilterBtn('Portré'))
    await user.click(getFilterBtn('Mind'))
    PORTFOLIO_ITEMS.forEach(item => {
      expect(screen.queryByAltText(item.title)).not.toBeNull()
    })
  })
})

describe('Portfolio – modal', () => {
  it('képre kattintva megnyílik a modal (counter látható)', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    const firstImg = screen.getByAltText(PORTFOLIO_ITEMS[0].title)
    await user.click(firstImg.closest('[role="button"]'))
    expect(screen.getByText(/\d+ \/ \d+/)).toBeInTheDocument()
  })

  it('X gombra bezárul a modal', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    const firstImg = screen.getByAltText(PORTFOLIO_ITEMS[0].title)
    await user.click(firstImg.closest('[role="button"]'))
    await user.click(screen.getByLabelText(/bezár/i))
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull()
  })

  it('ESC-re bezárul a modal', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    const firstImg = screen.getByAltText(PORTFOLIO_ITEMS[0].title)
    await user.click(firstImg.closest('[role="button"]'))
    await user.keyboard('{Escape}')
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull()
  })

  it('Következő gomb: 2. elemre lép', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    await user.click(screen.getByAltText(PORTFOLIO_ITEMS[0].title).closest('[role="button"]'))
    await user.click(screen.getByRole('button', { name: /következő/i }))
    expect(screen.getByText(/^2 \/ /)).toBeInTheDocument()
  })

  it('Előző gomb: körbeér az utolsóra', async () => {
    const user = userEvent.setup()
    render(<Portfolio />)
    await user.click(screen.getByAltText(PORTFOLIO_ITEMS[0].title).closest('[role="button"]'))
    const total = PORTFOLIO_ITEMS.length
    await user.click(screen.getByRole('button', { name: /előző/i }))
    expect(screen.getByText(new RegExp(`^${total} \\/ ${total}`))).toBeInTheDocument()
  })
})
