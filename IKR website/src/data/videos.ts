export const VIDEO_PATHS = {
  wasbarTiktok: '/videos/wasbar-tiktok.mp4',
  puretoTheelepels: '/videos/pureto-theelepels.mp4',
  puretoBrandoefening: '/videos/pureto-brandoefening.mp4',
  ikrShowcase1: '/videos/ikr-showcase-1.mp4',
  ikrShowcase2: '/videos/ikr-showcase-2.mp4',
  /** Gehost op huidige site — lokaal kopiëren naar public/videos/tempus-case.mp4 wanneer gewenst */
  tempusCase:
    'https://iknowright.be/wp-content/uploads/2025/11/v24044gl0000cvnttofog65op1i44log.mp4',
} as const

export type CarouselCardConfig = {
  id: string
  left: number
  top: number
  rotation: number
  zIndex: number
  src: string
  shadow?: boolean
}

export const carouselCards: CarouselCardConfig[] = [
  { id: 'far-left', left: -11.6, top: 127, rotation: -16, zIndex: 1, src: VIDEO_PATHS.puretoBrandoefening },
  { id: 'near-left', left: 9.86, top: 48, rotation: -10, zIndex: 2, src: VIDEO_PATHS.puretoTheelepels },
  { id: 'center', left: 36.53, top: 0, rotation: 0, zIndex: 5, src: VIDEO_PATHS.wasbarTiktok, shadow: true },
  { id: 'near-right', left: 56.81, top: 48, rotation: 10, zIndex: 2, src: VIDEO_PATHS.ikrShowcase1 },
  { id: 'far-right', left: 74.1, top: 127, rotation: 16, zIndex: 1, src: VIDEO_PATHS.ikrShowcase2 },
]

export const caseCarouselVideos = [
  VIDEO_PATHS.puretoTheelepels,
  VIDEO_PATHS.ikrShowcase2,
  VIDEO_PATHS.wasbarTiktok,
  VIDEO_PATHS.puretoBrandoefening,
  VIDEO_PATHS.ikrShowcase1,
] as const

export const heroFeedVideos = [
  {
    src: VIDEO_PATHS.wasbarTiktok,
    user: '@wasbar',
    caption: 'POV: je gaat naar de wasbar 🧺',
    song: 'Original Sound - Wasbar',
    likes: '12.4K',
    comments: '842',
  },
  {
    src: VIDEO_PATHS.puretoTheelepels,
    user: '@pureto',
    caption: 'Dit is waarom je moet koken met Pureto',
    song: 'Original Sound - Pureto',
    likes: '8.2K',
    comments: '316',
  },
  {
    src: VIDEO_PATHS.puretoBrandoefening,
    user: '@pureto',
    caption: 'Brandoefening van de week 🔥',
    song: 'Trending Audio - FoodTok',
    likes: '15.1K',
    comments: '1.2K',
  },
  {
    src: VIDEO_PATHS.ikrShowcase1,
    user: '@iknowright',
    caption: 'Content die resultaten oplevert ✨',
    song: 'Original Sound - IKnowRight',
    likes: '22K',
    comments: '2.4K',
  },
] as const
