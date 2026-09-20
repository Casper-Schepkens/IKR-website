export const VIDEO_PATHS = {
  wasbarTiktok: '/videos/wasbar-tiktok.mp4',
  puretoTheelepels: '/videos/pureto-theelepels.mp4',
  puretoBrandoefening: '/videos/pureto-brandoefening.mp4',
  ikrShowcase1: '/videos/ikr-showcase-1.mp4',
  ikrShowcase2: '/videos/ikr-showcase-2.mp4',
  foodWorkAiki: '/videos/food/aiki.mp4',
  foodWorkOtacos: '/videos/food/otacos.mp4',
  foodWorkPanos: '/videos/food/panos.mp4',
} as const

/** Top presterende TikTok-video's per kanaal.
 *  Tempus: Metricool full history (20 sep 2026), alle clips IKR.
 *  Maison Slash: IKR-period gallery (sinds eerste IKR-video 2025-09-24).
 *    Metricool posts incomplete before ~2026-04; stats = TikTok live / download-time.
 *    Top hit 759815… = 169.600 → 170K (Casper / scrape 20 sep 2026).
 *  Anneke: views bij download (jun 2026); account niet in Metricool.
 *  Oh!ma: views bij download (31 aug 2026), showers zonder case-pagina.
 *  Wasbar: views bij download (31 aug 2026); case /cases/wasbar + showers; niet in Metricool. */
export type CaseChannelVideo = {
  src: string
  stat: string
  tiktokUrl: string
  /** Niet in homepage/aanpak-showers (wel op de case-detailgalerij). */
  hideFromShowers?: boolean
}

export const CASE_CHANNEL_VIDEOS: Record<
  'tempus' | 'maisonSlash' | 'ohma' | 'wasbar' | 'annekeGovaerts',
  CaseChannelVideo[]
> = {
  tempus: [
    {
      src: '/videos/cases/tempus/7598572509436316961.mp4',
      stat: '142K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7598572509436316961',
    },
    {
      src: '/videos/cases/tempus/7531711349668318496.mp4',
      stat: '134K',
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
    {
      src: '/videos/cases/tempus/7622615623528484129.mp4',
      stat: '74K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7622615623528484129',
    },
    {
      src: '/videos/cases/tempus/7624532943393934625.mp4',
      stat: '55K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7624532943393934625',
    },
    {
      src: '/videos/cases/tempus/7616755694116654368.mp4',
      stat: '54K',
      tiktokUrl: 'https://www.tiktok.com/@tempusverpleging/video/7616755694116654368',
    },
  ],
  maisonSlash: [
    {
      src: '/videos/cases/maison-slash/7598150186996682017.mp4',
      stat: '170K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7598150186996682017',
      // Seksenquete-topvideo: wel op de case-pagina, niet in de 4 marketing-showers.
      hideFromShowers: true,
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
    {
      src: '/videos/cases/maison-slash/7661565150620568864.mp4',
      stat: '7.8K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7661565150620568864',
    },
    {
      src: '/videos/cases/maison-slash/7675310208951864608.mp4',
      stat: '4.5K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7675310208951864608',
    },
    {
      src: '/videos/cases/maison-slash/7673901570282491168.mp4',
      stat: '1.5K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7673901570282491168',
    },
    {
      src: '/videos/cases/maison-slash/7642716189461957920.mp4',
      stat: '1.2K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7642716189461957920',
    },
    {
      src: '/videos/cases/maison-slash/7663514981513710880.mp4',
      stat: '1.1K',
      tiktokUrl: 'https://www.tiktok.com/@maisonslashbelgie/video/7663514981513710880',
    },
  ],
  ohma: [
    {
      src: '/videos/cases/ohma/7664962329964072224.mp4',
      stat: '54K',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7664962329964072224',
    },
    {
      src: '/videos/cases/ohma/7663814810986876192.mp4',
      stat: '840',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7663814810986876192',
    },
    {
      src: '/videos/cases/ohma/7665347240625458464.mp4',
      stat: '33K',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7665347240625458464',
    },
    {
      src: '/videos/cases/ohma/7672432397513739552.mp4',
      stat: '3.6K',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7672432397513739552',
    },
    {
      src: '/videos/cases/ohma/7673914949609065760.mp4',
      stat: '943',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7673914949609065760',
    },
    {
      src: '/videos/cases/ohma/7669369080708680993.mp4',
      stat: '881',
      tiktokUrl: 'https://www.tiktok.com/@ohma_gent/video/7669369080708680993',
    },
  ],
  wasbar: [
    {
      src: '/videos/cases/wasbar/7673163275403676960.mp4',
      stat: '69K',
      tiktokUrl: 'https://www.tiktok.com/@wasbarontiktok/video/7673163275403676960',
    },
    {
      src: '/videos/cases/wasbar/7676094290140908832.mp4',
      stat: '1.1K',
      tiktokUrl: 'https://www.tiktok.com/@wasbarontiktok/video/7676094290140908832',
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
}
