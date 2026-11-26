import { describe, expect, it } from 'vitest'
import { nextTheme, parseTheme } from './theme'

describe('admin theme', () => {
  it('valt terug op system bij onbekende waarden', () => {
    expect(parseTheme(undefined)).toBe('system')
    expect(parseTheme('blauw')).toBe('system')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
  })
  it('wisselt system → licht → donker → system', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })
})
