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
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('hsnzas-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        {children}
      </body>
    </html>
  )
}
