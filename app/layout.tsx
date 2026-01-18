import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "The Super To Do List | ADHD-Optimized Hyper-Focus",
  description: 'The ultimate task management system for ADHD minds. Today view, streaks, time tracking, and hyper-focus architecture.',
  keywords: ['task tracker', 'ADHD', 'productivity', 'time tracking', 'hyper-focus', 'streaks'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-serif" suppressHydrationWarning>
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
