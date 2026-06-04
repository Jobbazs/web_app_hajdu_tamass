import { describe, it, expect } from 'vitest'
import {
  OWNER, SERVICES, PORTFOLIO_ITEMS,
  FILTER_LABELS, SERVICE_OPTIONS,
} from '../data'

describe('data.js – OWNER', () => {
  it('van neve', () => {
    expect(OWNER.name).toBeTruthy()
    expect(typeof OWNER.name).toBe('string')
  })
  it('van nameShort', () => {
    expect(OWNER.nameShort).toBeTruthy()
  })
  it('van title', () => {
    expect(OWNER.title).toBeTruthy()
  })
  it('van location', () => {
    expect(OWNER.location).toBeTruthy()
  })
  it('van 3 bio szöveg', () => {
    expect(OWNER.bio1).toBeTruthy()
    expect(OWNER.bio2).toBeTruthy()
    expect(OWNER.bio3).toBeTruthy()
  })
  it('érvényes social linkek ha meg vannak adva', () => {
    if (OWNER.instagram) expect(OWNER.instagram).toMatch(/^https?:\/\//)
    // if (OWNER.tiktok)    expect(OWNER.tiktok).toMatch(/^https?:\/\//)
    // if (OWNER.behance)   expect(OWNER.behance).toMatch(/^https?:\/\//)
  })
})

describe('data.js – SERVICES', () => {
  it('pontosan 3 szolgáltatás van', () => {
    expect(SERVICES).toHaveLength(3)
  })
  it('minden szolgáltatásnak van id, name, description', () => {
    SERVICES.forEach(s => {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.description).toBeTruthy()
    })
  })
  it('az id-k egyediek', () => {
    const ids = SERVICES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('data.js – PORTFOLIO_ITEMS', () => {
  it('legalább 4 portfólió elem van', () => {
    expect(PORTFOLIO_ITEMS.length).toBeGreaterThanOrEqual(4)
  })
  it('minden elemnek van id, title, category, span', () => {
    PORTFOLIO_ITEMS.forEach(item => {
      expect(item.id,       `id hiányzik: ${JSON.stringify(item)}`).toBeDefined()
      expect(item.title,    `title hiányzik – id:${item.id}`).toBeTruthy()
      expect(item.category, `category hiányzik – id:${item.id}`).toBeTruthy()
      expect(item.span,     `span hiányzik – id:${item.id}`).toBeTruthy()
    })
  })
  it('az id-k egyediek', () => {
    const ids = PORTFOLIO_ITEMS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('category értékek csak engedélyezettek', () => {
    const allowed = ['event', 'portrait', 'video', 'urbex']
    PORTFOLIO_ITEMS.forEach(item => {
      expect(allowed, `ismeretlen category: ${item.category}`).toContain(item.category)
    })
  })
  it('span értékek csak engedélyezettek', () => {
    const allowed = ['large', 'medium', 'small']
    PORTFOLIO_ITEMS.forEach(item => {
      expect(allowed, `ismeretlen span: ${item.span}`).toContain(item.span)
    })
  })
  it('cloudinaryUrl ha meg van adva, https URL', () => {
    PORTFOLIO_ITEMS.forEach(item => {
      if (item.cloudinaryUrl) {
        expect(item.cloudinaryUrl, `nem https URL – id:${item.id}`).toMatch(/^https?:\/\//)
      }
    })
  })
  it('videoUrl ha meg van adva, https URL', () => {
    PORTFOLIO_ITEMS.forEach(item => {
      if (item.videoUrl) {
        expect(item.videoUrl, `videoUrl nem https – id:${item.id}`).toMatch(/^https?:\/\//)
      }
    })
  })
  it('van legalább 1 large span elem', () => {
    expect(PORTFOLIO_ITEMS.some(i => i.span === 'large')).toBe(true)
  })
})

describe('data.js – FILTER_LABELS', () => {
  it('van all, event, portrait, video, urbex label', () => {
    expect(FILTER_LABELS.all).toBeTruthy()
    expect(FILTER_LABELS.event).toBeTruthy()
    expect(FILTER_LABELS.portrait).toBeTruthy()
    expect(FILTER_LABELS.video).toBeTruthy()
    expect(FILTER_LABELS.urbex).toBeTruthy()
  })
})

describe('data.js – SERVICE_OPTIONS', () => {
  it('legalább 2 opció van', () => {
    expect(SERVICE_OPTIONS.length).toBeGreaterThanOrEqual(2)
  })
  it('az első elem a placeholder', () => {
    expect(SERVICE_OPTIONS[0]).toMatch(/válassz/i)
  })
})
