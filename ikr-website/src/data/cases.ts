import { CASE_CHANNEL_VIDEOS, VIDEO_PATHS } from './videos'

// ─── Overview grid types (afgeleid van caseDetails — zie onderaan) ────────────

export type CaseGridItem = {
  id: string
  slug: string
  clientName: string
  video: string
  logo?: string
}

export type CaseCarouselItem = {
  src: string
  href: string
  label: string
}

// ─── Food werk (influencer-opdrachten, geen detailpagina) ─────────────────────

export type FoodWorkItem = {
  id: string
  clientName: string
  video: string
  views: string
  highlight: string
  logo?: string
}

/** Influencer-opdrachten binnen food — tonen als werk, geen volledige case study. */
export const foodWorkItems: FoodWorkItem[] = [
  {
    id: 'aiki',
    clientName: 'Aïki',
    video: VIDEO_PATHS.foodWorkAiki,
    views: '50K',
    highlight: 'Grootste noodlemerk van België — 1.500+ likes',
  },
  {
    id: 'otacos',
    clientName: "O'Tacos",
    video: VIDEO_PATHS.foodWorkOtacos,
    views: '16K',
    highlight: 'Fastfoodketen — 16K+ organische views',
  },
  {
    id: 'panos',
    clientName: 'Panos',
    video: VIDEO_PATHS.foodWorkPanos,
    views: '—',
    highlight: 'Bakkerijketen — influencer-opdracht',
  },
]

// ─── Case detail ─────────────────────────────────────────────────────────────

export type CaseDetailVideo = {
  src: string
  stat: string
  tiktokUrl?: string
}

export type CaseDetailStoryBlock = {
  title: string
  body: string
  image?: string
}

export type CaseDetail = {
  slug: string
  bedrijf: string
  logo?: string
  tags: string[]
  heroImage: string
  outcomeLine?: string
  summary: string[]
  results: { label: string; value: string }[]
  videos: CaseDetailVideo[]
  story: CaseDetailStoryBlock[]
  testimonial: {
    name: string
    role: string
    quote: string
  }
}

/** Baseplate — kopieer en pas aan per klant (niet live op de site). */
export const caseDetailTemplate: CaseDetail = {
  slug: 'template',
  bedrijf: '{bedrijf}',
  logo: '/images/client_logos/wasbar logo2.jpg',
  tags: ['Social Media', '{jaar}'],
  heroImage: '/images/freelancer-cta.jpg',
  outcomeLine: '{bedrijf} groeide naar {views} views in {periode}',
  summary: [
    '{bedrijf} wilde meer zichtbaarheid op TikTok bij een jongere doelgroep, maar miste de tijd en expertise om consistente content te maken.',
    'IKnowRight ontwikkelde een contentstrategie op maat, kwam op locatie filmen en leverde scroll-stoppende video\'s die pasten bij het merk van {bedrijf}.',
    'Het resultaat: meetbaar meer bereik, hogere engagement en een social feed waar {bedrijf} trots op is.',
  ],
  results: [
    { label: 'Views', value: '{views}' },
    { label: 'Engagement', value: '{engagement}' },
    { label: 'Volgers', value: '{volgers}' },
    { label: 'Video\'s', value: '{aantal}' },
  ],
  videos: [
    { src: VIDEO_PATHS.wasbarTiktok, stat: '33K' },
    { src: VIDEO_PATHS.puretoTheelepels, stat: '1.9M' },
    { src: VIDEO_PATHS.ikrShowcase2, stat: '78K' },
    { src: VIDEO_PATHS.puretoBrandoefening, stat: '12K' },
  ],
  story: [
    {
      title: 'DE UITDAGING',
      body: '{bedrijf} had een sterk product, maar hun social media bereikte niet de doelgroep die ze wilde aanspreken. Bestaande content voelde te gepolijst en haakte niet op TikTok.',
      image: '/images/contact-team.jpg',
    },
    {
      title: 'ONZE AANPAK VOOR {bedrijf}',
      body: 'We startten met een intake om het merk en de doelen van {bedrijf} te begrijpen. Daarna ontwikkelden we een contentkalender met formats die bewezen werken — en gingen op locatie filmen met een creator die het merk begrijpt.',
    },
  ],
  testimonial: {
    name: '{naam}',
    role: '{functie} — {bedrijf}',
    quote:
      'Ik ben super tevreden over de groei van mijn sociale media dankzij IKnowRight! {bedrijf} ziet eindelijk resultaat op TikTok.',
  },
}

/** Bron: https://iknowright.be/cases/tempus */
export const caseDetailTempus: CaseDetail = {
  slug: 'tempus',
  bedrijf: 'Tempus',
  logo: '/images/client_logos/tempus logo.png',
  tags: ['HR Marketing', 'TikTok'],
  heroImage: '/images/cases/tempus/hero.jpg',
  outcomeLine: '650.000+ unieke kijkers in de eerste vier maanden',
  summary: [
    'Tempus Thuisverpleging werkt al bijna een jaar op vaste basis met IKnowRight. Hun grootste uitdaging: zoveel mogelijk jonge verpleegkundigen aantrekken via TikTok — HR-marketing, geen productpromo.',
    'We maakten content die jonge zorgprofessionals aanspreekt: herkenbare situaties, authentieke formats en een consistente aanwezigheid op @tempusverpleging.',
    'Het resultaat: massaal bereik, gesprekken op jobbeurzen en video\'s die niet alleen views opleveren, maar ook concrete websitebezoeken.',
  ],
  results: [
    { label: 'Unieke kijkers', value: '650K+' },
    { label: 'Gem. views/video', value: '25K' },
    { label: 'Topvideo views', value: '142K' },
    { label: 'Websitebezoeken', value: '90+' },
  ],
  videos: [...CASE_CHANNEL_VIDEOS.tempus],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Tempus moest opvallen in een krappe arbeidsmarkt voor verpleegkundigen. Klassieke jobposts bereikten de jonge doelgroep niet — ze zitten op TikTok, niet op vacaturesites.',
      image: '/images/cases/tempus/story-challenge.jpg',
    },
    {
      title: 'ONZE AANPAK VOOR TEMPUS',
      body: 'We bouwden een contentlijn rond HR-marketing: video\'s die het werk bij Tempus tonen zoals jonge verpleegkundigen het beleven. Consistente output, formats die delen stimuleren, en metrics die verder gaan dan likes — zoals websitebezoeken en gesprekken op jobbeurzen.',
      image: '/images/cases/tempus/story-approach.jpg',
    },
  ],
  testimonial: {
    name: 'Tempus',
    role: 'Thuisverpleging',
    quote:
      'Op jobbeurzen voor verpleegkundigen is Tempus hét bedrijf waar jonge verpleegkundigen vandaag de dag het meeste over praten.',
  },
}

/** Bron: https://iknowright.be/cases/maison-slash */
export const caseDetailMaisonSlash: CaseDetail = {
  slug: 'maison-slash',
  bedrijf: 'Maison Slash',
  tags: ['Media', 'TikTok', 'Ouderschap'],
  heroImage:
    'https://iknowright.be/wp-content/uploads/2025/11/8413f8bc-e817-4357-9da3-e9970562e494-1024x427.jpeg',
  outcomeLine: '170K+ organische views op topvideo — na één maand',
  summary: [
    'Maison Slash België verkoopt magazines voor ouders. Hun doel op TikTok: ouders aanspreken met content die herkenbaar en deelbaar is.',
    'Het account bestond al, maar de cijfers explodeerden pas toen IKnowRight erbij kwam. Na slechts één maand lieten we een video organisch viraal gaan.',
    'Het resultaat: een account dat plots relevant werd voor hun doelgroep — met een virale hit die het merk op de kaart zette bij jonge ouders.',
  ],
  results: [
    { label: 'Topvideo', value: '170K' },
    { label: 'Video views', value: '+28.000%' },
    { label: 'Likes', value: '+96.000%' },
    { label: 'Shares', value: '+749.000%' },
  ],
  videos: [...CASE_CHANNEL_VIDEOS.maisonSlash],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Maison Slash had een TikTok-account, maar het bereikte niet de jonge ouder-doelgroep op schaal. Ze zochten content die past bij een magazine-merk zonder corporate te voelen.',
      image: '/images/contact-team.jpg',
    },
    {
      title: 'ONZE AANPAK VOOR MAISON SLASH',
      body: 'We maakten scroll-stoppende video\'s voor @maisonslashbelgie — formats die ouders herkennen en delen. Binnen een maand ging een video organisch viraal met meer dan 170.000 weergaven. De groei kwam vooral door die hit, maar die video hebben we zelf gemaakt en gelanceerd.',
    },
  ],
  testimonial: {
    name: 'Maison Slash',
    role: 'Magazines voor ouders',
    quote:
      'Ons TikTok-account bestond al — maar onze cijfers explodeerden pas met IKnowRight. Eén video ging viraal en zette alles in beweging.',
  },
}

/** Bron: https://iknowright.be/cases/anneke-govaerts */
export const caseDetailAnnekeGovaerts: CaseDetail = {
  slug: 'anneke-govaerts',
  bedrijf: 'Anneke Govaerts',
  tags: ['Healthcare', 'TikTok', 'Awareness'],
  heroImage: '/images/contact-team.jpg',
  outcomeLine: '1.300+ volgers en landelijke PR in anderhalve maand',
  summary: [
    'Dr. Anneke Govaerts is migraine-specialist en auteur. Haar doelen op TikTok: meer awareness rond migraine én meer verkoop van haar boeken.',
    'We bouwden een contentlijn die medische expertise toegankelijk maakt — video\'s die educeren, herkenning geven en vertrouwen opbouwen bij @anneke_govaerts.',
    'Het resultaat: snelle audience-groei, consistent bereik per video én PR buiten TikTok: VRT, Radio 1 en een repost door uitgeverij Pelckmans.',
  ],
  results: [
    { label: 'Volgers', value: '1.300+' },
    { label: 'Gem. views/video', value: '26K' },
    { label: 'Gem. likes', value: '415' },
    { label: 'Topvideo views', value: '82K' },
  ],
  videos: [...CASE_CHANNEL_VIDEOS.annekeGovaerts],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Anneke had expertise en een boek, maar miste het bereik om migraine-bewustzijn op te bouwen bij een jong publiek. Klassieke medical marketing voelde te afstandelijk voor TikTok.',
      image: '/images/contact-team.jpg',
    },
    {
      title: 'ONZE AANPAK VOOR ANNEKE GOVAERTS',
      body: 'We vertaalden complexe migraine-kennis naar herkenbare, deelbare video\'s. Consistente output leverde gemiddeld 26.000 organische views per video — en trok aandacht van VRT, Radio 1 en uitgeverij Pelckmans.',
    },
  ],
  testimonial: {
    name: 'Dr. Anneke Govaerts',
    role: 'Migraine-specialist & auteur',
    quote:
      'In anderhalve maand meer dan 1.300 volgers, gemiddeld 26.000 views per video — en media-aandacht van VRT en Radio 1. TikTok werkt voor awareness.',
  },
}

export const caseDetails: Record<string, CaseDetail> = {
  [caseDetailTempus.slug]: caseDetailTempus,
  [caseDetailMaisonSlash.slug]: caseDetailMaisonSlash,
  [caseDetailAnnekeGovaerts.slug]: caseDetailAnnekeGovaerts,
}

export const caseDetailSlugs = Object.keys(caseDetails)

// ─── Single source: grid + carousel afgeleid van caseDetails ─────────────────

/** Volgorde homepage /cases overview / Aanpak-carousel. */
const CASE_GRID_ORDER = ['tempus', 'maison-slash', 'anneke-govaerts'] as const

/**
 * Welke video uit `caseDetails[slug].videos` als thumbnail (niet altijd #1 views).
 * Maison Slash: index 2 = 757364… (niet seksenquete-topvideo).
 */
const CASE_GRID_PREVIEW_INDEX: Record<string, number> = {
  tempus: 0,
  'maison-slash': 2,
  'anneke-govaerts': 0,
}

function toGridItem(detail: CaseDetail): CaseGridItem {
  const idx = CASE_GRID_PREVIEW_INDEX[detail.slug] ?? 0
  const video = detail.videos[idx]?.src ?? detail.videos[0]?.src ?? ''
  return {
    id: detail.slug,
    slug: detail.slug,
    clientName: detail.bedrijf,
    video,
    logo: detail.logo,
  }
}

/** Overview + homepage — zelfde bron als detailpagina's. */
export const caseGridItems: CaseGridItem[] = CASE_GRID_ORDER.map((slug) => {
  const detail = caseDetails[slug]
  if (!detail) throw new Error(`Missing case detail for grid: ${slug}`)
  return toGridItem(detail)
})

/** Aanpak-carousel — zelfde cases, link naar detail. */
export const caseCarouselItems: CaseCarouselItem[] = caseGridItems.map((item) => ({
  src: item.video,
  href: `/cases/${item.slug}`,
  label: item.clientName,
}))

// ─── Homepage fan-carousel + Aanpak phone-feed (zelfde case-video's) ─────────

const CASE_TIKTOK_HANDLE: Record<string, string> = {
  tempus: '@tempusverpleging',
  'maison-slash': '@maisonslashbelgie',
  'anneke-govaerts': '@anneke_govaerts',
}

/** Layout slots (Figma) — bron-video's komen uit caseDetails via HOMEPAGE_CAROUSEL_PICKS. */
const HOMEPAGE_CAROUSEL_LAYOUT = [
  { id: 'far-left', left: -11.6, top: 127, rotation: -16, zIndex: 1 },
  { id: 'near-left', left: 9.86, top: 48, rotation: -10, zIndex: 2 },
  { id: 'center', left: 36.53, top: 0, rotation: 0, zIndex: 5, shadow: true },
  { id: 'near-right', left: 56.81, top: 48, rotation: 10, zIndex: 2 },
  { id: 'far-right', left: 74.1, top: 127, rotation: 16, zIndex: 1 },
] as const

/** Welke case-video per carousel-slot (5 stuks). */
const HOMEPAGE_CAROUSEL_PICKS: { slug: string; videoIndex: number }[] = [
  { slug: 'tempus', videoIndex: 1 },
  { slug: 'maison-slash', videoIndex: 0 },
  { slug: 'tempus', videoIndex: 0 },
  { slug: 'anneke-govaerts', videoIndex: 0 },
  { slug: 'maison-slash', videoIndex: 2 },
]

export type HomepageCarouselCard = {
  id: string
  left: number
  top: number
  rotation: number
  zIndex: number
  src: string
  href: string
  label: string
  shadow?: boolean
}

export const homepageCarouselCards: HomepageCarouselCard[] = HOMEPAGE_CAROUSEL_LAYOUT.map((layout, i) => {
  const pick = HOMEPAGE_CAROUSEL_PICKS[i]
  const detail = caseDetails[pick.slug]
  if (!detail) throw new Error(`Missing case for homepage carousel: ${pick.slug}`)
  const video = detail.videos[pick.videoIndex] ?? detail.videos[0]
  if (!video) throw new Error(`Missing video for homepage carousel: ${pick.slug}`)
  return {
    id: layout.id,
    left: layout.left,
    top: layout.top,
    rotation: layout.rotation,
    zIndex: layout.zIndex,
    shadow: 'shadow' in layout ? layout.shadow : undefined,
    src: video.src,
    href: `/cases/${detail.slug}`,
    label: detail.bedrijf,
  }
})

export type CaseFeedItem = {
  src: string
  user: string
  caption: string
  song: string
  likes: string
  comments: string
  href: string
}

/** Aanpak gsm-feed — echte case-video's i.p.v. showcase placeholders. */
const AANPAK_FEED_PICKS: { slug: string; videoIndex: number }[] = [
  { slug: 'tempus', videoIndex: 0 },
  { slug: 'maison-slash', videoIndex: 0 },
  { slug: 'anneke-govaerts', videoIndex: 0 },
  { slug: 'maison-slash', videoIndex: 2 },
]

export const aanpakHeroFeedVideos: CaseFeedItem[] = AANPAK_FEED_PICKS.map((pick) => {
  const detail = caseDetails[pick.slug]
  if (!detail) throw new Error(`Missing case for aanpak feed: ${pick.slug}`)
  const video = detail.videos[pick.videoIndex] ?? detail.videos[0]
  if (!video) throw new Error(`Missing video for aanpak feed: ${pick.slug}`)
  const handle = CASE_TIKTOK_HANDLE[detail.slug] ?? `@${detail.slug}`
  return {
    src: video.src,
    user: handle,
    caption: detail.outcomeLine ?? detail.summary[0] ?? detail.bedrijf,
    song: `Original Sound - ${detail.bedrijf}`,
    likes: video.stat,
    comments: '—',
    href: `/cases/${detail.slug}`,
  }
})
