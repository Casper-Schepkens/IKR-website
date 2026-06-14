import { VIDEO_PATHS } from './videos'

export type CaseGridItem = {
  id: string
  slug: string
  clientName: string
  video: string
  logo: string
}

export const caseGridItems: CaseGridItem[] = [
  {
    id: 'wasbar',
    slug: 'template',
    clientName: 'Wasbar',
    video: VIDEO_PATHS.wasbarTiktok,
    logo: '/images/client_logos/wasbar logo2.jpg',
  },
  {
    id: 'ohma',
    slug: 'template',
    clientName: 'Ohma',
    video: VIDEO_PATHS.puretoTheelepels,
    logo: '/images/client_logos/ohma logo.png',
  },
  {
    id: 'tempus',
    slug: 'tempus',
    clientName: 'Tempus',
    video: VIDEO_PATHS.tempusCase,
    logo: '/images/client_logos/tempus logo.png',
  },
  {
    id: 'ms',
    slug: 'template',
    clientName: 'MS',
    video: VIDEO_PATHS.puretoBrandoefening,
    logo: '/images/client_logos/MS logo.png',
  },
]

// ─── Case detail ─────────────────────────────────────────────────────────────

export type CaseDetailVideo = {
  src: string
  stat: string
}

export type CaseDetailStoryBlock = {
  title: string
  body: string
  image?: string
}

export type CaseDetail = {
  slug: string
  bedrijf: string
  logo: string
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

/** Baseplate — kopieer en pas aan per klant */
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
      body: 'We startten met een intake om het merk en de doelen van {bedrijf} te begrijpen. Daarna ontwikkelden we een contentkalender met formats die bewezen werken voor food brands — en gingen op locatie filmen met een creator die het merk begrijpt.',
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
    { label: 'Topvideo views', value: '20K' },
    { label: 'Websitebezoeken', value: '90+' },
  ],
  videos: [{ src: VIDEO_PATHS.tempusCase, stat: '20K' }],
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

export const caseDetails: Record<string, CaseDetail> = {
  [caseDetailTemplate.slug]: caseDetailTemplate,
  [caseDetailTempus.slug]: caseDetailTempus,
}

export const caseDetailSlugs = Object.keys(caseDetails)
