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
}

export default nextConfig
