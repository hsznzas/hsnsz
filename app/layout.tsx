import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Today's Command Center | ADHD Task Tracker",
  description: 'High-performance task tracking system optimized for ADHD. Focus on Critical items first, then use Quick Wins to build momentum.',
  keywords: ['task tracker', 'ADHD', 'productivity', 'time tracking'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  )
}
