import { describe, expect, it } from 'vitest'
import { ensureSignature, SIGNATURE } from './signature'

describe('ensureSignature (tekst)', () => {
  it('zet IKnowRight onder de naam', () => {
    expect(ensureSignature('Hoi Jan,\n\nTot dinsdag!\n\nGroetjes,\nCasper')).toBe('Hoi Jan,\n\nTot dinsdag!\n\nGroetjes,\nCasper\nIKnowRight')
    expect(ensureSignature('Hoi Jan,\n\nGroetjes,\nCasper\n\n')).toBe('Hoi Jan,\n\nGroetjes,\nCasper\nIKnowRight\n\n')
  })
  it('laat een juiste ondertekening staan', () => {
    const ok = `Hoi Jan,\n\nTot dinsdag!\n\n${SIGNATURE}`
    expect(ensureSignature(ok)).toBe(ok)
    expect(ensureSignature('Hoi,\n\nGroetjes,\nCasper\nIKnowRight\n')).toBe('Hoi,\n\nGroetjes,\nCasper\nIKnowRight\n')
  })
  it('"Groetjes, Casper" op één regel wordt de volledige ondertekening', () => {
    expect(ensureSignature('Hoi Jan,\n\nTot snel.\n\nGroetjes, Casper')).toBe('Hoi Jan,\n\nTot snel.\n\nGroetjes,\nCasper\nIKnowRight')
  })
  it('zonder ondertekening of met Casper midden in de tekst: niets veranderen', () => {
    expect(ensureSignature('Hoi Jan,\n\nIk bel je morgen.')).toBe('Hoi Jan,\n\nIk bel je morgen.')
    expect(ensureSignature('Hoi Jan,\n\nCasper\nhier, ik bel je morgen nog even.\nDat lijkt me het beste.\nTot morgen dan.\nGroetjes')).toBe('Hoi Jan,\n\nCasper\nhier, ik bel je morgen nog even.\nDat lijkt me het beste.\nTot morgen dan.\nGroetjes')
  })
  it('kijkt niet in een geciteerde mail', () => {
    const body = 'Top, tot dan!\n\nGroetjes,\nCasper\n\nOp ma 9 nov 2026 om 10:00 schreef Jan <jan@x.be>:\n> Hoi Casper\n> Groetjes,\n> Casper'
    expect(ensureSignature(body)).toBe('Top, tot dan!\n\nGroetjes,\nCasper\nIKnowRight\n\nOp ma 9 nov 2026 om 10:00 schreef Jan <jan@x.be>:\n> Hoi Casper\n> Groetjes,\n> Casper')
  })
  it('Casper Schepkens telt ook als naam', () => {
    expect(ensureSignature('Hoi,\n\nGroetjes,\nCasper Schepkens')).toBe('Hoi,\n\nGroetjes,\nCasper Schepkens\nIKnowRight')
  })
})

describe('ensureSignature (HTML)', () => {
  it('na <br> en in een <p>', () => {
    expect(ensureSignature('<p>Hoi Jan,</p><p>Groetjes,<br>Casper</p>')).toBe('<p>Hoi Jan,</p><p>Groetjes,<br>Casper<br>IKnowRight</p>')
    expect(ensureSignature('<p>Hoi Jan,</p><p>Groetjes,</p><p>Casper</p>')).toBe('<p>Hoi Jan,</p><p>Groetjes,</p><p>Casper<br>IKnowRight</p>')
  })
  it('laat een juiste HTML-ondertekening staan', () => {
    const ok = '<p>Hoi,</p><p>Groetjes,<br>Casper<br>IKnowRight</p>'
    expect(ensureSignature(ok)).toBe(ok)
    const ok2 = '<p>Groetjes,</p><p>Casper</p><p>IKnowRight</p>'
    expect(ensureSignature(ok2)).toBe(ok2)
  })
  it('niet in de geciteerde mail', () => {
    const body = '<p>Top!</p><p>Groetjes,<br>Casper</p><div class="gmail_quote"><p>Groetjes,<br>Casper</p></div>'
    expect(ensureSignature(body)).toBe('<p>Top!</p><p>Groetjes,<br>Casper<br>IKnowRight</p><div class="gmail_quote"><p>Groetjes,<br>Casper</p></div>')
  })
})

