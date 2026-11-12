import { describe, expect, it } from 'vitest'
import { bestTarget, isNavCommand, PAGES, searchTargets, type NavTarget } from './targets'

const targets: NavTarget[] = [
  ...PAGES,
  { label: 'Tempus', sub: 'Klant', href: '/admin/klanten?klant=t', kind: 'klant' },
  { label: 'Tempus', sub: 'Productie', href: '/admin/productie?klant=t', kind: 'productie' },
  { label: 'Chez Albert', sub: 'Klant', href: '/admin/klanten?klant=c', kind: 'klant' },
  { label: 'Chez Albert', sub: 'Productie', href: '/admin/productie?klant=c', kind: 'productie' },
  { label: 'Jan Peeters (Bakkerij Peeters)', sub: 'Lead', href: '/admin/sales/leads/j', kind: 'lead' },
]

describe('ga naar', () => {
  it('herkent navigatiezinnen, geen gewone vragen', () => {
    expect(isNavCommand('zet de pagina van klant Tempus eens open')).toBe(true)
    expect(isNavCommand('ga naar financiën')).toBe(true)
    expect(isNavCommand('open productie van Chez Albert')).toBe(true)
    expect(isNavCommand('hoeveel feedbackrondes geven we?')).toBe(false)
    expect(isNavCommand('kan je een mail opstellen voor Jan')).toBe(false)
  })
  it('vindt het juiste doel', () => {
    expect(bestTarget(targets, 'zet de pagina van klant Tempus eens open')?.href).toBe('/admin/klanten?klant=t')
    expect(bestTarget(targets, 'open productie van chez albert')?.href).toBe('/admin/productie?klant=c')
    expect(bestTarget(targets, 'ga naar financien')?.href).toBe('/admin/financien')
    expect(bestTarget(targets, 'ga naar de kalender')?.href).toBe('/admin/kalender')
    expect(bestTarget(targets, 'open lead peeters')?.href).toBe('/admin/sales/leads/j')
    expect(bestTarget(targets, 'ga naar bestaatniet')).toBeNull()
  })
  it('zoeken in het venster (Ctrl+K)', () => {
    expect(searchTargets(targets, 'temp').map((t) => t.sub)).toEqual(['Klant', 'Productie'])
    expect(searchTargets(targets, 'draaidag')[0].label).toBe('Productie')
    expect(searchTargets(targets, 'fin').map((t) => t.label)).toEqual(['Financiën'])
  })
})
