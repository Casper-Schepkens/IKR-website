import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.129.11'],
  images: {
    localPatterns: [{ pathname: '/images/**' }],
  },
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(dirname),
  },
  async redirects() {
    return [
      { source: '/wat-we-doen', destination: '/aanpak', permanent: true },
      { source: '/werkwijze', destination: '/aanpak', permanent: true },
      { source: '/over-ons', destination: '/', permanent: true },
      { source: '/jobs', destination: '/contact?type=solliciteren', permanent: true },
      { source: '/cases/food/:slug', destination: '/cases', permanent: true },
      { source: '/cases/other', destination: '/cases', permanent: true },
      { source: '/landing-page', destination: '/', permanent: true },
      { source: '/landing-page-crazy-offer', destination: '/', permanent: true },
      { source: '/landing-page-v2', destination: '/', permanent: true },
      { source: '/landing-page-v2-succes', destination: '/', permanent: true },
      { source: '/landing-page/:path*', destination: '/', permanent: true },
      { source: '/vsl', destination: '/', permanent: true },
      { source: '/vsl_eng', destination: '/', permanent: true },
      { source: '/coming-soon', destination: '/', permanent: true },
      { source: '/coming-soon-2', destination: '/', permanent: true },
      { source: '/thank-you', destination: '/', permanent: true },
      { source: '/termsfeed/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/termsfeed/cookies-policy', destination: '/cookies', permanent: true },
      { source: '/termsfeed/terms-and-conditions', destination: '/algemene-voorwaarden', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/privacybeleid', destination: '/privacy', permanent: true },
      { source: '/cookiebeleid', destination: '/cookies', permanent: true },
      { source: '/cookies-policy', destination: '/cookies', permanent: true },
    ]
  },
}

export default nextConfig
