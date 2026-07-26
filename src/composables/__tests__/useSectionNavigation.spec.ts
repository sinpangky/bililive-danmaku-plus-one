import { describe, expect, it } from 'vitest'
import { resolveActiveSection } from '../useSectionNavigation'

const sections = [
  { id: 'general', top: -420 },
  { id: 'platforms', top: -20 },
  { id: 'colors', top: 360 },
  { id: 'favorites', top: 760 },
] as const

describe('resolveActiveSection', () => {
  it('selects the last section that crosses the activation line', () => {
    expect(resolveActiveSection(sections)).toBe('platforms')
    expect(resolveActiveSection(sections, { activationOffset: -30 })).toBe('general')
  })

  it('keeps the first section active before another section reaches the activation line', () => {
    const beforeSecondSection = sections.map((section, index) => ({
      ...section,
      top: index === 0 ? 32 : section.top + 100,
    }))

    expect(resolveActiveSection(beforeSecondSection)).toBe('general')
  })

  it('activates the final section at the bottom of the scroll container', () => {
    expect(resolveActiveSection(sections, { atBottom: true })).toBe('favorites')
  })

  it('returns undefined for an empty section list', () => {
    expect(resolveActiveSection([])).toBeUndefined()
  })
})
