import type { Metadata, Viewport } from 'next'
import StandbyDisplayClient from './StandbyDisplayClient'

export const metadata: Metadata = {
  title: 'StandbyMe Display | ThinQ Mom',
  description: 'ThinQ Mom Care synced StandbyMe display',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090b10',
}

export default function StandbyDisplayPage() {
  return <StandbyDisplayClient />
}
