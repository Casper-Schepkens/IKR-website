import { CASE_CHANNEL_VIDEOS, VIDEO_PATHS, type CaseChannelVideo } from './videos'

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
  logo?: string
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

/** Influencer-opdrachten binnen food — tonen als werk, geen volledige case study.
 *  Video's lokaal in public/videos/food/ (geconverteerd van de originele .mov's). */
export const foodWorkItems: FoodWorkItem[] = [
  {
    id: 'aiki',
    clientName: 'Aïki',
    video: VIDEO_PATHS.foodWorkAiki,
    views: '50K',
    highlight: 'Grootste noodlemerk van België, 1.500+ likes',
  },
  {
    id: 'otacos',
    clientName: "O'Tacos",
    video: VIDEO_PATHS.foodWorkOtacos,
    views: '16K',
    highlight: 'Fastfoodketen, 16K+ organische views',
  },
  {
    id: 'panos',
    clientName: 'Panos',
    video: VIDEO_PATHS.foodWorkPanos,
    views: '',
    highlight: 'Bakkerijketen, influencer-opdracht',
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
  /** Weglaten = geen cover. `logo` = merkbanner i.p.v. foto. */
  heroImage?: string
  heroVariant?: 'photo' | 'logo'
  outcomeLine?: string
  summary: string[]
  results: { label: string; value: string }[]
  videos: CaseDetailVideo[]
  story: CaseDetailStoryBlock[]
  /** Weglaten bij early cases zonder quote. */
  testimonial?: {
    name: string
    role: string
    quote: string
  }
}

/** Baseplate — kopieer en pas aan per klant (niet live op de site). */
export const caseDetailTemplate: CaseDetail = {
  slug: 'template',
  bedrijf: '{bedrijf}',
  logo: '/images/client_logos/wasbar.png',
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
      body: 'We startten met een intake om het merk en de doelen van {bedrijf} te begrijpen. Daarna ontwikkelden we een contentkalender met formats die bewezen werken, en gingen op locatie filmen met een creator die het merk begrijpt.',
    },
  ],
  testimonial: {
    name: '{naam}',
    role: '{functie}, {bedrijf}',
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
  outcomeLine: '1 miljoen views, en 1 tot 2 sollicitaties per dag',
  summary: [
    'Tempus Thuisverpleging werkt al bijna een jaar op vaste basis met IKnowRight. Hun grootste uitdaging: zoveel mogelijk jonge verpleegkundigen aantrekken via TikTok. HR-marketing, geen productpromo.',
    'We maakten content die jonge zorgprofessionals aanspreekt: herkenbare situaties, authentieke formats en een consistente aanwezigheid op @tempusverpleging.',
    'Het resultaat: 1 miljoen views, 886K bereik en een community die 78% vrouw is, plus 1 tot 2 sollicitaties per dag via TikTok.',
  ],
  results: [
    { label: 'Views', value: '1M+' },
    { label: 'Bereik', value: '886K' },
    { label: 'Topvideo', value: '142K' },
    { label: "Video's", value: '71' },
    { label: 'Likes', value: '25K' },
    { label: 'Community', value: '78% vrouw' },
  ],
  videos: [...CASE_CHANNEL_VIDEOS.tempus],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Tempus moest opvallen in een krappe arbeidsmarkt voor verpleegkundigen. Klassieke jobposts bereikten de jonge doelgroep niet: ze zitten op TikTok, niet op vacaturesites.',
    },
    {
      title: 'ONZE AANPAK VOOR TEMPUS',
      body: 'We bouwden een contentlijn rond HR-marketing: video\'s die het werk bij Tempus tonen zoals jonge verpleegkundigen het beleven. Consistente output, formats die delen stimuleren, en metrics die verder gaan dan likes, zoals sollicitaties en gesprekken op jobbeurzen.',
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
  logo: '/images/client_logos/MS logo.png',
  tags: ['Media', 'TikTok', 'Ouderschap'],
  heroImage: '/images/client_logos/MS logo.png',
  heroVariant: 'logo',
  outcomeLine: '1.2 miljoen views, topvideo 170K organisch',
  summary: [
    'Maison Slash België verkoopt magazines voor ouders. Hun doel op TikTok: ouders aanspreken met content die herkenbaar en deelbaar is.',
    'Het account bestond al, maar de cijfers explodeerden pas toen IKnowRight erbij kwam. Honderd video\'s later staat de teller op 1.2 miljoen views.',
    'Het resultaat: 1.2 miljoen views, 961K bereik en een community die 68% vrouw is, met een organische hit van 170K.',
  ],
  results: [
    { label: 'Views', value: '1.2M' },
    { label: 'Bereik', value: '961K' },
    { label: 'Topvideo', value: '170K' },
    { label: "Video's", value: '100' },
    { label: 'Likes', value: '30K' },
    { label: 'Community', value: '68% vrouw' },
  ],
  videos: [...CASE_CHANNEL_VIDEOS.maisonSlash],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Maison Slash had een TikTok-account, maar het bereikte niet de jonge ouder-doelgroep op schaal. Ze zochten content die past bij een magazine-merk zonder corporate te voelen.',
    },
    {
      title: 'ONZE AANPAK VOOR MAISON SLASH',
      body: 'We maakten scroll-stoppende video\'s voor @maisonslashbelgie: formats die ouders herkennen en delen. De sterkste video haalde 170.000 organische views. In totaal 1.2 miljoen views op 100 video\'s.',
    },
  ],
  testimonial: {
    name: 'Maison Slash',
    role: 'Magazines voor ouders',
    quote:
      'Ons TikTok-account bestond al, maar onze cijfers explodeerden pas met IKnowRight. Eén video ging viraal en zette alles in beweging.',
  },
}

/** Early food case — samenwerking gestart; geen resultaten/video's tot er organisch bewijs is. */
export const caseDetailChezAlbert: CaseDetail = {
  slug: 'chez-albert',
  bedrijf: 'Chez Albert',
  logo: '/images/client_logos/chez-albert.png',
  tags: ['Food', 'TikTok', 'Gestart'],
  heroImage: '/images/client_logos/chez-albert.png',
  heroVariant: 'logo',
  outcomeLine: 'Samenwerking gestart — TikTok i.s.m. IKR',
  summary: [
    'Chez Albert is een food brand waarmee IKnowRight recent de samenwerking is gestart. Focus: TikTok-content die het merk laat proeven en scroll-stoppend aanvoelt.',
    'We bouwen samen de contentlijn op: formats, tone of voice en een vaste aanwezigheid op TikTok. Resultaten en video\'s volgen hier zodra er sterke organische hits zijn.',
  ],
  results: [],
  videos: [],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Chez Albert wil zichtbaar worden bij een jongere food-doelgroep op TikTok. Klassieke promo voelt te glad; ze zoeken content die authentiek smaakt en past bij het merk.',
    },
    {
      title: 'ONZE AANPAK VOOR CHEZ ALBERT',
      body: 'We starten met intake, merkfit en een contentkalender op maat. Daarna filmen en editen we scroll-stoppende video\'s i.s.m. IKR — consistent, food-first, zonder gehaaste vanity metrics.',
    },
  ],
  // TikTok handle TBD — do not invent. Testimonial volgt later.
}

/** Early food case — @lilaloubiscuits; boosted bereik ≠ organisch case-resultaat. */
export const caseDetailLilalou: CaseDetail = {
  slug: 'lilalou',
  bedrijf: 'Lilalou',
  logo: '/images/client_logos/lilalou.jpg',
  tags: ['Food', 'TikTok', 'Gestart'],
  heroImage: '/images/client_logos/lilalou.jpg',
  heroVariant: 'logo',
  outcomeLine: 'Food brand op TikTok — samenwerking gestart',
  summary: [
    'Lilalou (biscuits) werkt met IKnowRight aan TikTok-content via @lilaloubiscuits. De samenwerking is gestart: we bouwen aan formats die het merk laten zien én smaken.',
    'Alles tot nu toe is vooral boosted bereik — er is nog geen sterke organische hero-video. Daarom tonen we hier geen view- of topvideo-cijfers als organisch resultaat.',
    'Deze case groeit mee: zodra er organische hits en lokale clips zijn, vullen we gallery en resultaten aan.',
  ],
  results: [],
  videos: [],
  story: [
    {
      title: 'DE UITDAGING',
      body: 'Lilalou wil als food brand opvallen op TikTok zonder alleen op paid boost te leunen. Het doel: herkenbare, deelbare content die organisch blijft hangen bij biscuit-liefhebbers.',
    },
    {
      title: 'ONZE AANPAK VOOR LILALOU',
      body: 'Samen met @lilaloubiscuits zetten we een food-first contentlijn op: product in beeld, snappy edits en formats die werken op TikTok. IKR begeleidt strategie, creatie en publicatie terwijl de organische lijn groeit.',
    },
  ],
}

/** Bron: https://iknowright.be/cases/anneke-govaerts */
export const caseDetailAnnekeGovaerts: CaseDetail = {
  slug: 'anneke-govaerts',
  bedrijf: 'Anneke Govaerts',
  tags: ['Healthcare', 'TikTok', 'Awareness'],
  outcomeLine: '1.300+ volgers en landelijke PR in anderhalve maand',
  summary: [
    'Dr. Anneke Govaerts is migraine-specialist en auteur. Haar doelen op TikTok: meer awareness rond migraine én meer verkoop van haar boeken.',
    'We bouwden een contentlijn die medische expertise toegankelijk maakt: video\'s die educeren, herkenning geven en vertrouwen opbouwen bij @anneke_govaerts.',
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
    },
    {
      title: 'ONZE AANPAK VOOR ANNEKE GOVAERTS',
      body: 'We vertaalden complexe migraine-kennis naar herkenbare, deelbare video\'s. Consistente output leverde gemiddeld 26.000 organische views per video, en trok aandacht van VRT, Radio 1 en uitgeverij Pelckmans.',
    },
  ],
  testimonial: {
    name: 'Dr. Anneke Govaerts',
    role: 'Migraine-specialist & auteur',
    quote:
      'In anderhalve maand meer dan 1.300 volgers, gemiddeld 26.000 views per video, en media-aandacht van VRT en Radio 1. TikTok werkt voor awareness.',
  },
}

export const caseDetails: Record<string, CaseDetail> = {
  [caseDetailTempus.slug]: caseDetailTempus,
  [caseDetailMaisonSlash.slug]: caseDetailMaisonSlash,
  [caseDetailAnnekeGovaerts.slug]: caseDetailAnnekeGovaerts,
  [caseDetailChezAlbert.slug]: caseDetailChezAlbert,
  [caseDetailLilalou.slug]: caseDetailLilalou,
}

export const caseDetailSlugs = Object.keys(caseDetails)

export function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function caseLinkProps(href: string) {
  return isExternalHref(href)
    ? { href, target: '_blank' as const, rel: 'noreferrer' }
    : { href }
}

// ─── Single source: grid van caseDetails; showers mogen extra kanalen ─────────

/** Volgorde homepage-/cases-overview (alleen laag-1 cases met detailpagina). */
const CASE_GRID_ORDER = ['tempus', 'maison-slash', 'anneke-govaerts'] as const

type ShowerChannel = {
  channelKey: keyof typeof CASE_CHANNEL_VIDEOS
  handle: string
  /** Gezet → klik naar `/cases/{slug}`. Anders naar de TikTok-post. */
  caseSlug?: string
  name: string
  logo?: string
  caption: string
}

/** Showers: cases + food-kanalen zonder fake detailpagina. */
const SHOWER_CHANNELS: readonly ShowerChannel[] = [
  { channelKey: 'tempus', caseSlug: 'tempus', handle: '@tempusverpleging', name: 'Tempus', caption: '' },
  { channelKey: 'maisonSlash', caseSlug: 'maison-slash', handle: '@maisonslashbelgie', name: 'Maison Slash', caption: '' },
  { channelKey: 'annekeGovaerts', caseSlug: 'anneke-govaerts', handle: '@anneke_govaerts', name: 'Anneke Govaerts', caption: '' },
  {
    channelKey: 'ohma',
    handle: '@ohma_gent',
    name: 'Oh!ma',
    logo: '/images/client_logos/ohma logo.png',
    caption: 'Oh!ma Gent',
  },
  {
    channelKey: 'wasbar',
    handle: '@wasbarontiktok',
    name: 'Wasbar',
    logo: '/images/client_logos/wasbar.png',
    caption: 'Wasbar',
  },
]

/**
 * 4 videoshower-plekken. Per klantmap: shower 0 pakt 1e/5e/9e, shower 1 de 2e/6e, enz.
 * Eén video in het mapje → die video overal. Geen match voor die shower → klant overslaan
 * (niet terugvallen op video 1 — dat veroorzaakt herhaling).
 */
const VIDEO_SHOWER_COUNT = 4
export type VideoShowerIndex = 0 | 1 | 2 | 3

const CHANNEL_KEY_BY_SLUG: Record<(typeof CASE_GRID_ORDER)[number], keyof typeof CASE_CHANNEL_VIDEOS> = {
  tempus: 'tempus',
  'maison-slash': 'maisonSlash',
  'anneke-govaerts': 'annekeGovaerts',
}

function videosForShower(channelKey: keyof typeof CASE_CHANNEL_VIDEOS, shower: VideoShowerIndex): CaseChannelVideo[] {
  const folder = CASE_CHANNEL_VIDEOS[channelKey].filter((v) => !v.hideFromShowers)
  if (folder.length === 0) return []
  if (folder.length === 1) return [folder[0]]
  return folder.filter((_, i) => i % VIDEO_SHOWER_COUNT === shower)
}

function resolveChannel(channel: ShowerChannel) {
  if (channel.caseSlug) {
    const detail = caseDetails[channel.caseSlug]
    if (!detail) throw new Error(`Missing case detail for shower channel: ${channel.caseSlug}`)
    return {
      name: detail.bedrijf,
      logo: detail.logo,
      caption: detail.outcomeLine ?? detail.summary[0] ?? detail.bedrijf,
      hrefFor: (_video: CaseChannelVideo) => `/cases/${detail.slug}`,
    }
  }
  return {
    name: channel.name,
    logo: channel.logo,
    caption: channel.caption,
    hrefFor: (video: CaseChannelVideo) => video.tiktokUrl,
  }
}

function cycleFill<T>(items: T[], count: number): T[] {
  if (items.length === 0) return []
  return Array.from({ length: count }, (_, i) => items[i % items.length])
}

/** Eerste video per kanaal, daarna extra's — zodat 5 fan-slots 5 merken tonen. */
function showerPicksFirstThenRest(shower: VideoShowerIndex) {
  const firsts: { channel: ShowerChannel; video: CaseChannelVideo }[] = []
  const rest: { channel: ShowerChannel; video: CaseChannelVideo }[] = []
  for (const channel of SHOWER_CHANNELS) {
    const videos = videosForShower(channel.channelKey, shower)
    if (videos[0]) firsts.push({ channel, video: videos[0] })
    for (const video of videos.slice(1)) rest.push({ channel, video })
  }
  return [...firsts, ...rest]
}

function toGridItem(detail: CaseDetail, videoSrc: string): CaseGridItem {
  return {
    id: detail.slug,
    slug: detail.slug,
    clientName: detail.bedrijf,
    video: videoSrc,
    logo: detail.logo,
  }
}

/** Overview + homepage cases — shower 1 (2e, 6e, … per mapje). Alleen laag-1. */
export const caseGridItems: CaseGridItem[] = CASE_GRID_ORDER.flatMap((slug) => {
  const detail = caseDetails[slug]
  if (!detail) throw new Error(`Missing case detail for grid: ${slug}`)
  const video = videosForShower(CHANNEL_KEY_BY_SLUG[slug], 1)[0]
  if (!video) return []
  return [toGridItem(detail, video.src)]
})

/** Aanpak-carousel — shower 3 (4e, 8e, … per mapje). */
export const caseCarouselItems: CaseCarouselItem[] = SHOWER_CHANNELS.flatMap((channel) => {
  const meta = resolveChannel(channel)
  return videosForShower(channel.channelKey, 3).map((video) => ({
    src: video.src,
    href: meta.hrefFor(video),
    label: meta.name,
    logo: meta.logo,
  }))
})

// ─── Homepage fan-carousel + Aanpak phone-feed (verschillende showers) ───────

/** Layout slots (Figma) — bron-video's via SHOWER_CHANNELS, shower 0. */
const HOMEPAGE_CAROUSEL_LAYOUT = [
  { id: 'far-left', left: -11.6, top: 127, rotation: -16, zIndex: 1 },
  { id: 'near-left', left: 9.86, top: 48, rotation: -10, zIndex: 2 },
  { id: 'center', left: 36.53, top: 0, rotation: 0, zIndex: 5, shadow: true },
  { id: 'near-right', left: 56.81, top: 48, rotation: 10, zIndex: 2 },
  { id: 'far-right', left: 74.1, top: 127, rotation: 16, zIndex: 1 },
] as const

type ShowerPick = { channel: ShowerChannel; video: CaseChannelVideo }

/** Shower 0 (1e, 5e, … per mapje) — 5 layout-slots, eerst 1 per merk. */
const HOMEPAGE_CAROUSEL_PICKS: ShowerPick[] = cycleFill(
  showerPicksFirstThenRest(0),
  HOMEPAGE_CAROUSEL_LAYOUT.length,
)

export type HomepageCarouselCard = {
  id: string
  left: number
  top: number
  rotation: number
  zIndex: number
  src: string
  href: string
  label: string
  logo?: string
  shadow?: boolean
}

export const homepageCarouselCards: HomepageCarouselCard[] = HOMEPAGE_CAROUSEL_LAYOUT.map((layout, i) => {
  const pick = HOMEPAGE_CAROUSEL_PICKS[i]
  if (!pick) throw new Error(`Missing homepage carousel pick for slot ${layout.id}`)
  const meta = resolveChannel(pick.channel)
  return {
    id: layout.id,
    left: layout.left,
    top: layout.top,
    rotation: layout.rotation,
    zIndex: layout.zIndex,
    shadow: 'shadow' in layout ? layout.shadow : undefined,
    src: pick.video.src,
    href: meta.hrefFor(pick.video),
    label: meta.name,
    logo: meta.logo,
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
  channelId: string
}

function toFeedItem(channel: ShowerChannel, video: CaseChannelVideo): CaseFeedItem {
  const meta = resolveChannel(channel)
  return {
    src: video.src,
    user: channel.handle,
    caption: meta.caption,
    song: `Original Sound - ${meta.name}`,
    likes: video.stat,
    comments: '0',
    href: meta.hrefFor(video),
    channelId: channel.channelKey,
  }
}

/** Round-robin over merken zodat starters niet 2× dezelfde klant na elkaar zetten. */
function roundRobinByChannel(items: CaseFeedItem[]): CaseFeedItem[] {
  const queues = new Map<string, CaseFeedItem[]>()
  for (const item of items) {
    const queue = queues.get(item.channelId) ?? []
    queue.push(item)
    queues.set(item.channelId, queue)
  }
  const order = [...queues.keys()]
  const result: CaseFeedItem[] = []
  while (result.length < items.length) {
    for (const id of order) {
      const next = queues.get(id)?.shift()
      if (next) result.push(next)
    }
  }
  return result
}

function shuffleNoAdjacentSame(items: CaseFeedItem[], previousChannelId?: string): CaseFeedItem[] {
  const remaining = [...items]
  const result: CaseFeedItem[] = []
  let last = previousChannelId
  while (remaining.length > 0) {
    const candidates = remaining.filter((item) => item.channelId !== last)
    const pool = candidates.length > 0 ? candidates : remaining
    const pick = pool[Math.floor(Math.random() * pool.length)]
    remaining.splice(remaining.indexOf(pick), 1)
    result.push(pick)
    last = pick.channelId
  }
  return result
}

/** Shower 2 (3e, 7e, …) — vaste start van de gsm-feed, 1 merk per beurt. */
export const aanpakHeroFeedStarters: CaseFeedItem[] = roundRobinByChannel(
  SHOWER_CHANNELS.flatMap((channel) =>
    videosForShower(channel.channelKey, 2).map((video) => toFeedItem(channel, video)),
  ),
)

/** Gsm-feed: starters, daarna alle andere clips (geen seksenquete), geschud zonder dezelfde klant na elkaar. */
export function buildAanpakPhoneFeed(): CaseFeedItem[] {
  const starterSrc = new Set(aanpakHeroFeedStarters.map((item) => item.src))
  const rest = SHOWER_CHANNELS.flatMap((channel) =>
    CASE_CHANNEL_VIDEOS[channel.channelKey]
      .filter((video) => !video.hideFromShowers && !starterSrc.has(video.src))
      .map((video) => toFeedItem(channel, video)),
  )
  const lastStarter = aanpakHeroFeedStarters.at(-1)?.channelId
  return [...aanpakHeroFeedStarters, ...shuffleNoAdjacentSame(rest, lastStarter)]
}

/** SSR-fallback = starters; client vervangt dit door `buildAanpakPhoneFeed()`. */
export const aanpakHeroFeedVideos = aanpakHeroFeedStarters
