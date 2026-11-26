import { describe, expect, it } from 'vitest'
import { parseTheme } from './theme'

describe('admin theme', () => {
  it('valt terug op system bij onbekende waarden', () => {
    expect(parseTheme(undefined)).toBe('system')
    expect(parseTheme('blauw')).toBe('system')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
  })
})
