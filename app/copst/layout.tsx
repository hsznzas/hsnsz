import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'COPST — Your clipboard, but it gives a damn',
  description: 'A macOS menu bar app that reacts to your clipboard with words, emoji, and style.',
}

export default function CopstLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
