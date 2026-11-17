import { expect, test } from '@playwright/test'

const PAGES = ['/admin/werkplek', '/admin/sales', '/admin/sales/inbox', '/admin/sales/calls', '/admin/sales/cold-mails', '/admin/klanten', '/admin/financien', '/admin/productie', '/admin/weekly', '/admin/kalender', '/admin/sops', '/admin/instellingen']

test.describe('dashboard (demomodus)', () => {
  test('elke pagina laadt zonder fout en zonder zijwaarts scrollen', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const path of PAGES) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), path).toBe(200)
      await expect(page.locator('h1').first(), path).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(1)
    }
    expect(errors).toEqual([])
  })

  test('nieuwe lead aanmaken opent zijn fiche', async ({ page }) => {
    await page.goto('/admin/sales?nieuw=1')
    const name = `E2E Lead ${Date.now()}`
    await page.locator('input[name="name"]').fill(name)
    await page.locator('input[name="email"]').fill(`e2e${Date.now()}@voorbeeld.be`)
    await page.locator('form:has(input[name="name"]) button[type="submit"]').click()
    await page.waitForURL(/\/admin\/sales\/leads\//)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  })

  test('foute e-mail: de lead wordt niet aangemaakt', async ({ page }) => {
    await page.goto('/admin/sales?nieuw=1')
    await page.locator('input[name="name"]').fill('Zonder adres')
    // De browser aanvaardt dit adres (type=email), onze controle niet: zo testen we de server.
    await page.locator('input[name="email"]').fill('jan@voorbeeld')
    await page.locator('form:has(input[name="name"]) button[type="submit"]').click()
    await expect(page).toHaveURL(/fout=/)
    await expect(page.getByText(/e-mailadres klopt niet/)).toBeVisible()
  })

  test('Mijn menu: een pagina verbergen haalt ze uit de zijbalk, openen kan nog', async ({ page, isMobile }) => {
    test.skip(isMobile, 'zijbalk op desktop')
    await page.goto('/admin/instellingen')
    const nav = page.locator('nav')
    await expect(nav.getByRole('link', { name: 'Cold mails' })).toBeVisible()
    const box = page.getByRole('checkbox', { name: 'Cold mails' })
    await box.uncheck()
    await expect(nav.getByRole('link', { name: 'Cold mails' })).toHaveCount(0)
    expect((await page.goto('/admin/sales/cold-mails'))?.status()).toBe(200)
    await page.goto('/admin/instellingen')
    await page.getByRole('button', { name: 'Terug naar de standaard' }).click()
    await expect(page.locator('nav').getByRole('link', { name: 'Cold mails' })).toBeVisible()
  })
})

test.describe('gsm', () => {
  test('het menu is ingeklapt, opent en sluit na een klik', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'enkel op gsm-breedte')
    await page.goto('/admin/werkplek')
    const menu = page.locator('#admin-menu')
    await expect(menu).toBeHidden()
    await page.getByRole('button', { name: /^Menu/ }).click()
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Klanten' }).click()
    await page.waitForURL('**/admin/klanten')
    await expect(menu).toBeHidden()
  })
})
