import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import SplashScreen from '@/components/SplashScreen'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ThinQ Mom',
  description: 'LG ThinQ 스마트홈과 함께하는 임산부 케어',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ThinQ Mom',
  },
}

export const viewport: Viewport = {
  themeColor: '#ec4899',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/아이콘.png" />
        <link rel="icon" href="/아이콘.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen bg-white">
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}