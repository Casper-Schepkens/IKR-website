export const VIDEO_PATHS = {
  wasbarTiktok: '/videos/wasbar-tiktok.mp4',
  puretoTheelepels: '/videos/pureto-theelepels.mp4',
  puretoBrandoefening: '/videos/pureto-brandoefening.mp4',
  ikrShowcase1: '/videos/ikr-showcase-1.mp4',
  ikrShowcase2: '/videos/ikr-showcase-2.mp4',
  foodWorkAiki: 'https://iknowright.be/wp-content/uploads/2026/03/Aiki.mov',
  foodWorkOtacos: 'https://iknowright.be/wp-content/uploads/2026/03/Otacos.mov',
  foodWorkPanos: 'https://iknowright.be/wp-content/uploads/2026/03/panos.mov',
} as const

/** Top presterende TikTok-video's per case-kanaal (views bij download, jun 2026). */
export type CaseChannelVideo = {
  src: string
  stat: string
  tiktokUrl: string
}

export const CASE_CHANNEL_VIDEOS = {
  tempus: [
    {
      src: '/videos/cases/tempus/7598572509436316961.mp4',
      stat: '142K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7598572509436316961',
    },
    {
      src: '/videos/cases/tempus/7531711349668318496.mp4',
      stat: '135K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7531711349668318496',
    },
    {
      src: '/videos/cases/tempus/7577745341856959777.mp4',
      stat: '79K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7577745341856959777',
    },
    {
      src: '/videos/cases/tempus/7619353308892777760.mp4',
      stat: '76K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7619353308892777760',
    },
  ],
  maisonSlash: [
    {
      src: '/videos/cases/maison-slash/7598150186996682017.mp4',
      stat: '170K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7598150186996682017',
    },
    {
      src: '/videos/cases/maison-slash/7562140206158073120.mp4',
      stat: '148K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7562140206158073120',
    },
    {
      src: '/videos/cases/maison-slash/7573647751959858464.mp4',
      stat: '71K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7573647751959858464',
    },
    {
      src: '/videos/cases/maison-slash/7611955630290537760.mp4',
      stat: '64K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7611955630290537760',
    },
  ],
  annekeGovaerts: [
    {
      src: '/videos/cases/anneke-govaerts/7455698691433696534.mp4',
      stat: '82K',
      tiktokUrl: 'https://www.tiktok.com/@anneke_govaerts/video/7455698691433696534',
    },
    {
      src: '/videos/cases/anneke-govaerts/7463489643057532182.mp4',
      stat: '74K',
      tiktokUrl: 'https://www.tiktok.com/@anneke_govaerts/video/7463489643057532182',
    },
    {
      src: '/videos/cases/anneke-govaerts/7472777299973131542.mp4',
      stat: '56K',
      tiktokUrl: 'https://www.tiktok.com/@anneke_govaerts/video/7472777299973131542',
    },
    {
      src: '/videos/cases/anneke-govaerts/7469056290371800342.mp4',
      stat: '35K',
      tiktokUrl: 'https://www.tiktok.com/@anneke_govaerts/video/7469056290371800342',
    },
  ],
} satisfies Record<string, CaseChannelVideo[]>
