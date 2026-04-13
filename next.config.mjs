/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // picsum - 개발용 placeholder
      { protocol: 'https', hostname: 'picsum.photos' },
      // YGOPRODeck - 실제 유희왕 카드 이미지 (https://images.ygoprodeck.com/images/cards/{id}.jpg)
      { protocol: 'https', hostname: 'images.ygoprodeck.com' },
    ],
  },
}

export default nextConfig
