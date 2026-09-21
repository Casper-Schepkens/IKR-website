import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: false });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(4000);
// No GSAP manipulation - exact what user sees
await page.screenshot({ path: 'C:/tmp/ikr-real.png' });
await browser.close();
