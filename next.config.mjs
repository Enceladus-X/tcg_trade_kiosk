/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // YGOPRODeck - 실제 유희왕 카드 이미지 (나중에 외부 URL 입력 시 사용)
      { protocol: 'https', hostname: 'images.ygoprodeck.com' },
    ],
  },
}

export default nextConfig
