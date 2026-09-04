/** Poster JPEG next to the mp4: `/videos/foo.mp4` → `/images/posters/foo.jpg` */
export function videoPoster(src: string): string {
  if (!src.startsWith('/videos/')) return src
  return src.replace(/^\/videos\//, '/images/posters/').replace(/\.mp4$/i, '.jpg')
}
