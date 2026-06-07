import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ThinQ Mom',
    short_name: 'ThinQ Mom',
    description: 'LG ThinQ 스마트홈과 함께하는 임산부 케어',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf2f8',
    theme_color: '#ec4899',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}