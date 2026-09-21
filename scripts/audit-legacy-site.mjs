/**
 * Legacy content audit: crawl iknowright.be (WordPress REST API),
 * index new Next.js site, generate gap matrix + audit report.
 *
 * Usage: node scripts/audit-legacy-site.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** App root = git repo root (Next.js lives at repository root). */
const ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = ROOT
const OUT_DIR = path.join(REPO_ROOT, 'legacy-content')
const PAGES_DIR = path.join(OUT_DIR, 'pages')
const AUDIT_MD = path.join(REPO_ROOT, 'docs', 'product', 'legacy-content-audit.md')

const WP_API = 'https://iknowright.be/wp-json/wp/v2/pages?per_page=100'

/** Manual route mapping: old WP path → new site route(s) + default status hint */
const ROUTE_MAP = {
  '/': { newRoutes: ['/'], category: 'main' },
  '/wat-we-doen/': { newRoutes: ['/aanpak'], category: 'main' },
  '/werkwijze/': { newRoutes: ['/aanpak'], category: 'main' },
  '/cases/': { newRoutes: ['/cases'], category: 'main' },
  '/cases/tempus/': { newRoutes: ['/cases/tempus'], category: 'main' },
  '/cases/maison-slash/': { newRoutes: ['/cases/maison-slash'], category: 'main' },
  '/cases/anneke-govaerts/': { newRoutes: ['/cases/anneke-govaerts'], category: 'main' },
  '/cases/other/': { newRoutes: ['/cases'], category: 'main' },
  '/cases/food/aiki/': { newRoutes: ['/cases'], category: 'main' },
  '/cases/food/otacos/': { newRoutes: ['/cases'], category: 'main' },
  '/cases/food/panos/': { newRoutes: ['/cases'], category: 'main' },
  '/pricing/': { newRoutes: ['/pricing'], category: 'main' },
  '/contact/': { newRoutes: ['/contact'], category: 'main' },
  '/over-ons/': { newRoutes: ['/(team section)'], category: 'main' },
  '/jobs/': { newRoutes: ['/aanpak', '/contact?type=solliciteren'], category: 'main' },
  '/legal/': { newRoutes: ['(missing)'], category: 'main' },
  '/landing-page/': { newRoutes: ['(not migrated)'], category: 'landing' },
  '/landing-page-v2/': { newRoutes: ['(not migrated)'], category: 'landing' },
  '/landing-page-v2-succes/': { newRoutes: ['(not migrated)'], category: 'landing' },
  '/landing-page-crazy-offer/': { newRoutes: ['(not migrated)'], category: 'landing' },
  '/vsl/': { newRoutes: ['(not migrated)'], category: 'vsl' },
  '/vsl_eng/': { newRoutes: ['(not migrated)'], category: 'vsl' },
  '/coming-soon-2/': { newRoutes: ['(skip)'], category: 'utility' },
  '/thank-you/': { newRoutes: ['(skip)'], category: 'utility' },
}

const NEW_SITE_FILES = [
  'src/app/page.tsx',
  'src/app/aanpak/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/cases/page.tsx',
  'src/app/cases/[slug]/page.tsx',
  'src/app/privacy/page.tsx',
  'src/components/ikr/HeroSection.tsx',
  'src/components/ikr/BrandStrip.tsx',
  'src/components/ikr/StatsSection.tsx',
  'src/components/ikr/TeamSection.tsx',
  'src/components/ikr/ProcessSection.tsx',
  'src/components/ikr/CasesSection.tsx',
  'src/components/ikr/ReviewsSection.tsx',
  'src/components/ikr/CTASection.tsx',
  'src/components/ikr/AanpakPageContent.tsx',
  'src/components/ikr/PricingPageContent.tsx',
  'src/components/ikr/ContactPageContent.tsx',
  'src/components/ikr/CasesPageContent.tsx',
  'src/components/ikr/CaseDetailPageContent.tsx',
  'src/components/ikr/SiteFooter.tsx',
  'src/components/ikr/Navbar.tsx',
  'src/data/cases.ts',
  'src/data/videos.ts',
  'src/app/layout.tsx',
  'src/app/privacy/page.tsx',
]

/** Key phrases from old site we expect to find in new site (for partial/migrated detection) */
const KEY_PHRASE_CHECKS = {
  '/': {
    mustHave: [
      'food brands',
      'honger',
      'Content Strategie',
      'Content Creatie',
      'Advertenties',
      'Anne Cornu',
      'Anneke Govaerts',
      'TikTok',
      '46%',
    ],
    niceToHave: ['Waarom enkel TikTok', 'Online Marketing Monkey', 'Plan je intake'],
  },
  '/wat-we-doen/': {
    mustHave: ['contentstrategie', 'contentcreatie', 'social media'],
    niceToHave: ['Is dat wel iets voor mij', 'niet willen dansen op TikTok'],
  },
  '/werkwijze/': {
    mustHave: ['Intake', 'Kick-off', 'Draaidag'],
    niceToHave: ['geen moeilijke trajecten', 'marketingjargon'],
  },
  '/cases/tempus/': {
    mustHave: ['650', 'verpleegkundigen', 'HR'],
    niceToHave: ['650 000', 'jobbeurzen'],
  },
  '/cases/maison-slash/': {
    mustHave: ['Maison Slash', '145', 'viraal'],
    niceToHave: ['28000%', 'magazines'],
  },
  '/cases/anneke-govaerts/': {
    mustHave: ['1300', 'migraine', 'VRT'],
    niceToHave: ['Pelckmans', 'Radio 1'],
  },
  '/cases/food/aiki/': {
    mustHave: ['Aïki', '50', 'noodle'],
    niceToHave: ['1500 likes'],
  },
  '/cases/food/otacos/': {
    mustHave: ["O'Tacos", '16k'],
    niceToHave: [],
  },
  '/legal/': {
    mustHave: ['BE1014.718.978', 'Vondelstraat', 'Lebbeke'],
    niceToHave: ['IBAN', 'KREDBEBB'],
  },
  '/over-ons/': {
    mustHave: ['Casper', 'Cédric', 'Milan'],
    niceToHave: ['ontstond vanuit', 'organische content'],
  },
  '/jobs/': {
    mustHave: ['freelancer', 'videomaker'],
    niceToHave: ['portfolio'],
  },
}

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMediaUrls(html) {
  if (!html) return []
  const urls = new Set()
  const re = /https?:\/\/iknowright\.be\/wp-content\/uploads\/[^\s"'<>]+/gi
  let m
  while ((m = re.exec(html)) !== null) urls.add(m[0])
  return [...urls]
}

function pathnameFromLink(link) {
  try {
    return new URL(link).pathname
  } catch {
    return link
  }
}

function extractStringsFromSource(source) {
  const strings = new Set()
  const patterns = [
    /'([^'\\]{4,})'/g,
    /"([^"\\]{4,})"/g,
    /`([^`\\]{4,})`/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(source)) !== null) {
      const s = m[1].trim()
      if (/^[a-zA-Z0-9_./-]+$/.test(s) && !s.includes(' ')) continue
      if (s.startsWith('var(') || s.startsWith('#')) continue
      strings.add(s)
    }
  }
  return [...strings]
}

function normalizePath(p) {
  if (!p.startsWith('/')) p = '/' + p
  if (!p.endsWith('/')) p += '/'
  return p
}

async function fetchWpPages() {
  const res = await fetch(WP_API)
  if (!res.ok) throw new Error(`WP API failed: ${res.status}`)
  const pages = await res.json()
  return pages.map((p) => {
    const pathname = normalizePath(pathnameFromLink(p.link))
    const plainText = stripHtml(p.content?.rendered || '')
    const excerpt = stripHtml(p.excerpt?.rendered || '')
    const mediaUrls = extractMediaUrls(p.content?.rendered || '')
    return {
      id: p.id,
      title: stripHtml(p.title?.rendered || ''),
      slug: p.slug,
      link: p.link,
      pathname,
      modified: p.modified,
      excerpt,
      plainText,
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      mediaUrls,
    }
  })
}

function indexNewSite() {
  const routes = []
  const appDir = path.join(ROOT, 'src/app')
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(prefix, entry.name)
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel)
      else if (entry.name === 'page.tsx') {
        const route = '/' + rel.replace(/\\/g, '/').replace(/\/page\.tsx$/, '').replace(/^\/?/, '')
        routes.push(route === '/.' ? '/' : route.replace(/\/\[slug\]/, '/[slug]'))
      }
    }
  }
  walk(appDir)

  const files = {}
  let allText = ''
  for (const rel of NEW_SITE_FILES) {
    const abs = path.join(ROOT, rel)
    if (!fs.existsSync(abs)) continue
    const content = fs.readFileSync(abs, 'utf8')
    files[rel] = {
      strings: extractStringsFromSource(content),
      charCount: content.length,
    }
    allText += '\n' + content
  }

  const combinedLower = allText.toLowerCase()

  return {
    generatedAt: new Date().toISOString(),
    routes: [...new Set(routes)].sort(),
    filesIndexed: Object.keys(files),
    combinedTextLength: allText.length,
    files,
    snippets: {
      phones: [...allText.matchAll(/0\d[\d\s./-]{7,}/g)].map((m) => m[0]),
      emails: [...allText.matchAll(/[\w.-]+@iknowright\.be/gi)].map((m) => m[0]),
    },
    combinedLower,
  }
}

function checkPhrases(combinedLower, phrases) {
  const found = []
  const missing = []
  for (const p of phrases) {
    if (combinedLower.includes(p.toLowerCase())) found.push(p)
    else missing.push(p)
  }
  return { found, missing }
}

function inferStatus(page, newIndex, checks) {
  const map = ROUTE_MAP[page.pathname]
  const category = map?.category || 'unknown'

  if (category === 'utility') return 'Skip'
  if (category === 'landing' || category === 'vsl') return 'Decision'

  if (!checks) {
    if (page.pathname === '/legal/') return 'Missing'
    return 'Partial'
  }

  const must = checkPhrases(newIndex.combinedLower, checks.mustHave || [])
  const nice = checkPhrases(newIndex.combinedLower, checks.niceToHave || [])

  const mustRatio = checks.mustHave?.length
    ? must.found.length / checks.mustHave.length
    : 1

  if (mustRatio >= 0.85 && nice.missing.length === 0) return 'Migrated'
  if (mustRatio >= 0.5) return 'Partial'
  if (category === 'landing' || category === 'vsl') return 'Decision'
  return mustRatio > 0 ? 'Partial' : 'Missing'
}

function buildGapMatrix(pages, newIndex) {
  return pages.map((page) => {
    const map = ROUTE_MAP[page.pathname] || { newRoutes: ['(unmapped)'], category: 'unknown' }
    const checks = KEY_PHRASE_CHECKS[page.pathname]
    const status = inferStatus(page, newIndex, checks)
    const must = checks
      ? checkPhrases(newIndex.combinedLower, checks.mustHave || [])
      : { found: [], missing: [] }
    const nice = checks
      ? checkPhrases(newIndex.combinedLower, checks.niceToHave || [])
      : { found: [], missing: [] }

    return {
      oldUrl: page.link,
      pathname: page.pathname,
      title: page.title,
      slug: page.slug,
      category: map.category,
      newRoutes: map.newRoutes,
      status,
      mustHaveFound: must.found,
      mustHaveMissing: must.missing,
      niceToHaveFound: nice.found,
      niceToHaveMissing: nice.missing,
      wordCount: page.wordCount,
      mediaCount: page.mediaUrls.length,
    }
  })
}

function writePageMarkdown(page) {
  const filename = `${page.slug || page.id}.md`
  const body = `# ${page.title}

- **URL:** ${page.link}
- **Slug:** ${page.slug}
- **Modified:** ${page.modified}
- **Words:** ${page.wordCount}

## Excerpt

${page.excerpt || '(empty)'}

## Plain text

${page.plainText || '(empty)'}

## Media (${page.mediaUrls.length})

${page.mediaUrls.map((u) => `- ${u}`).join('\n') || '(none)'}
`
  fs.writeFileSync(path.join(PAGES_DIR, filename), body, 'utf8')
}

function buildAuditMarkdown(pages, newIndex, gapMatrix) {
  const byStatus = {}
  for (const row of gapMatrix) {
    byStatus[row.status] = byStatus[row.status] || []
    byStatus[row.status].push(row)
  }

  const mainPages = gapMatrix.filter((r) => r.category === 'main')
  const landingPages = gapMatrix.filter((r) => r.category === 'landing' || r.category === 'vsl')
  const utilityPages = gapMatrix.filter((r) => r.category === 'utility')

  const phones = [...new Set(newIndex.snippets.phones)]
  const actionItems = []

  // High priority actions from gap analysis
  const reviews = gapMatrix.find((r) => r.pathname === '/')
  if (reviews?.mustHaveMissing?.includes('Anne Cornu')) {
    actionItems.push({
      priority: 'P0',
      action: 'Vervang fake homepage-reviews (Wout Desmedt e.a.) door echte quotes: Anne Cornu (Maison Slash) + Dr. Anneke Govaerts',
      source: '/',
      target: 'ReviewsSection.tsx, CasesPageContent.tsx',
    })
  }
  if (reviews?.mustHaveMissing?.includes('46%')) {
    actionItems.push({
      priority: 'P1',
      action: 'Overweeg "Waarom enkel TikTok?"-sectie met 46%-stat (35+) — ontbreekt op nieuwe homepage',
      source: '/',
      target: 'Homepage (nieuwe sectie) of /aanpak',
    })
  }
  const legal = gapMatrix.find((r) => r.pathname === '/legal/')
  if (legal?.status === 'Missing') {
    actionItems.push({
      priority: 'P0',
      action: 'Maak /legal pagina met bedrijfsgegevens (Vondelstraat 65, Lebbeke, BTW, IBAN, tel)',
      source: '/legal/',
      target: 'Nieuwe route src/app/legal/page.tsx + footer link',
    })
  }
  if (phones.length > 1) {
    actionItems.push({
      priority: 'P0',
      action: `Harmoniseer telefoonnummer — codebase heeft: ${phones.join(' vs ')}. Oude /legal: 0471571399`,
      source: '/legal/, footer, contact',
      target: 'SiteFooter.tsx, ContactPageContent.tsx',
    })
  }
  actionItems.push({
    priority: 'P0',
    action: 'Footer legal links fixen: Privacy → /privacy; Cookie + Algemene voorwaarden pagina\'s ontbreken',
    source: 'Oude footer',
    target: 'SiteFooter.tsx',
  })
  const watWeDoen = gapMatrix.find((r) => r.pathname === '/wat-we-doen/')
  if (watWeDoen?.niceToHaveMissing?.length) {
    actionItems.push({
      priority: 'P1',
      action: '"Is dat wel iets voor mij?"-doelgroepcopy overnemen (geen dansen op TikTok, restaurant/retail…)',
      source: '/wat-we-doen/',
      target: '/aanpak',
    })
  }
  if (watWeDoen?.mustHaveFound?.some((s) => s.toLowerCase().includes('social media'))) {
    actionItems.push({
      priority: 'Decision',
      action: 'Social media management was 4e dienst op oude site — nieuwe site heeft strategie/creatie/advertenties. Bewuste keuze documenteren.',
      source: '/wat-we-doen/',
      target: 'ProcessSection / AanpakPageContent',
    })
  }
  const overOns = gapMatrix.find((r) => r.pathname === '/over-ons/')
  if (overOns?.niceToHaveMissing?.length) {
    actionItems.push({
      priority: 'P2',
      action: 'Origin story ("IKR ontstond vanuit…") — nu alleen korte team-sectie op homepage',
      source: '/over-ons/',
      target: 'Homepage team of aparte /over-ons',
    })
  }
  for (const lp of landingPages) {
    actionItems.push({
      priority: 'Decision',
      action: `Landing/VSL: ${lp.pathname} — migreren, redirecten, of WP laten draaien voor actieve ads`,
      source: lp.oldUrl,
      target: '(Casper: check Meta/Google ad links)',
    })
  }

  const feelNotes = `
De oude site voelt **conversationeel en geruststellend**: "geen fancy woorden", "Ben jij dat van die video's?", emoji's sporadisch, directe CTA's ("Plan je intake"). Veel **objection handling** (TikTok is niet enkel tieners, "Is dat wel iets voor mij?").

De nieuwe site voelt **visueler en strakker** (Figma V2): kortere copy, sterkere typografie, food-brand focus explicieter in hero/brand strip. Minder uitleg, meer bewijs via stats/cases.

Risico: nieuwe site verliest **vertrouwen-opbouw** (langere uitleg, testimonials, TikTok-educatie) ten gunste van design. Aanbevolen: echte reviews + legal + minstens één "waarom TikTok"-moment behouden.
`.trim()

  let md = `# Legacy content audit — iknowright.be vs nieuwe site

Generated: ${new Date().toISOString().slice(0, 10)}

Raw data: [\`legacy-content/\`](legacy-content/) (JSON + per-pagina markdown)

---

## Samenvatting

| Status | Aantal |
|--------|--------|
${Object.entries(byStatus)
  .map(([s, rows]) => `| ${s} | ${rows.length} |`)
  .join('\n')}

**Oude site:** ${pages.length} WordPress-pagina's via REST API  
**Nieuwe site:** ${newIndex.routes.length} routes, ${newIndex.filesIndexed.length} bestanden geïndexeerd

---

## Overall feel

${feelNotes}

---

## Gap matrix — hoofdpagina's

| Oud | Nieuw | Status | Must-have mist |
|-----|-------|--------|----------------|
${mainPages
  .map(
    (r) =>
      `| [${r.title}](${r.oldUrl}) | ${r.newRoutes.join(', ')} | **${r.status}** | ${r.mustHaveMissing.slice(0, 3).join('; ') || '—'} |`,
  )
  .join('\n')}

---

## Gap matrix — landing & VSL

| Oud | Status | Notities |
|-----|--------|----------|
${landingPages
  .map((r) => `| [${r.title}](${r.oldUrl}) | **${r.status}** | ${r.wordCount} woorden, ${r.mediaCount} media |`)
  .join('\n')}

---

## Gap matrix — utility (skip)

${utilityPages.map((r) => `- [${r.title}](${r.oldUrl}) → ${r.status}`).join('\n')}

---

## Copy die zeker over moet (must-have snippets)

### Testimonials (homepage — nu fake op nieuwe site)

**Anne Cornu — CEO Maison Slash**
> Ik werk nu een tijdje samen met het team van het bureau en ik voel gewoon: zij snappen TikTok. Waar ik soms wat uit de doelgroep val, pakken zij het op. Ik ben oprecht blij dat ze ons helpen om onze TikTok van Maison Slash naar een hoger niveau te duwen.

**Dr. Anneke Govaerts — Migraine specialiste**
> Ik was helemaal onbekend in de TIK-TOK wereld. Zij hebben mijn hand vastgehouden bij de eerste stapjes/ filmpjes, en mij direct op een juiste manier een plaats kunnen geven als hoofdpijn-expert op dat forum. Sindsdien kreeg ik veel meer media-aandacht.

### Legal (ontbreekt volledig op nieuwe site)

Van [\`/legal\`](https://iknowright.be/legal/):

- IKnowRight, Vondelstraat 65, 9280 Lebbeke
- BTW: BE1014.718.978
- IBAN: BE03 7310 6214 9184, BIC: KREDBEBB
- Tel: 0471571399
- contact@iknowright.be

### "Waarom enkel TikTok?" (homepage oud — ontbreekt nieuw)

> TikTok is hét platform bij uitstek om nieuwe prospects te bereiken… Véél meer nog dan bij Instagram reels of Facebook posts!
> Misvatting: "enkel de jongeren zitten op TikTok." FOUT! … meer dan **46%** van de TikTok gebruikers ouder dan 34 jaar!

### Doelgroep (wat-we-doen — deels ontbreekt)

> Niet willen dansen op TikTok, maar wél willen opvallen. Meer klanten, personeel of merkherkenning…

### Zonder IKR / Met IKR (landing pages — bruikbaar voor /aanpak)

Sterke before/after bullets op \`/landing-page\` en \`/landing-page-v2\` — zie [\`legacy-content/pages/landing-page.md\`](legacy-content/pages/landing-page.md).

---

## Per-pagina detail

${gapMatrix
  .map((r) => {
    return `### ${r.title} (\`${r.pathname}\`)

- **Status:** ${r.status}
- **Oud:** ${r.oldUrl}
- **Nieuw:** ${r.newRoutes.join(', ')}
- **Must-have gevonden:** ${r.mustHaveFound.join(', ') || '—'}
- **Must-have mist:** ${r.mustHaveMissing.join(', ') || '—'}
- **Nice-to-have mist:** ${r.niceToHaveMissing.join(', ') || '—'}
`
  })
  .join('\n')}

---

## Actielijst (geprioriteerd)

| Prio | Actie | Bron | Doel |
|------|-------|------|------|
${actionItems
  .sort((a, b) => a.priority.localeCompare(b.priority))
  .map((a) => `| ${a.priority} | ${a.action} | ${a.source} | ${a.target} |`)
  .join('\n')}

---

## Casper review (handmatig invullen)

- [ ] **Telefoonnummer correct?** Oud legal: \`0471571399\`. Nieuw footer: \`0471 57 13 99\`. Nieuw contact: \`04 71 49 75 12\`.
- [ ] **Welke landing/VSL URLs zitten nog in actieve ads?** (bepaalt redirect vs migratie bij domain switch)
- [ ] **Must-have vs nice-to-have** — markeer acties hierboven
- [ ] **/over-ons** aparte pagina of origin story op homepage?
- [ ] **Social media management** als 4e dienst behouden?

---

## Nieuwe site routes

${newIndex.routes.map((r) => `- \`${r}\``).join('\n')}

---

## Telefoons & emails in nieuwe codebase

- Telefoons: ${phones.join(', ') || '(none found)'}
- Emails: ${[...new Set(newIndex.snippets.emails)].join(', ') || '(none found)'}
`

  return md
}

async function main() {
  fs.mkdirSync(PAGES_DIR, { recursive: true })

  console.log('Fetching WordPress pages…')
  const pages = await fetchWpPages()
  pages.sort((a, b) => a.pathname.localeCompare(b.pathname))

  fs.writeFileSync(path.join(OUT_DIR, 'raw.json'), JSON.stringify(pages, null, 2), 'utf8')
  for (const page of pages) writePageMarkdown(page)
  console.log(`  → ${pages.length} pages → ${OUT_DIR}`)

  console.log('Indexing new site…')
  const newIndex = indexNewSite()
  fs.writeFileSync(path.join(OUT_DIR, 'new-site-index.json'), JSON.stringify(newIndex, null, 2), 'utf8')
  console.log(`  → ${newIndex.routes.length} routes, ${newIndex.filesIndexed.length} files`)

  console.log('Building gap matrix…')
  const gapMatrix = buildGapMatrix(pages, newIndex)
  fs.writeFileSync(path.join(OUT_DIR, 'gap-matrix.json'), JSON.stringify(gapMatrix, null, 2), 'utf8')

  console.log('Writing audit report…')
  const auditMd = buildAuditMarkdown(pages, newIndex, gapMatrix)
  fs.mkdirSync(path.dirname(AUDIT_MD), { recursive: true })
  fs.writeFileSync(AUDIT_MD, auditMd, 'utf8')

  console.log('\nDone.')
  console.log(`  ${OUT_DIR}/`)
  console.log(`  ${AUDIT_MD}`)
  const counts = {}
  for (const r of gapMatrix) counts[r.status] = (counts[r.status] || 0) + 1
  console.log('  Status:', counts)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
