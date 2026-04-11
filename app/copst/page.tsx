'use client'

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import './copst.css'

const WORDS = [
  'Yup', 'YESS', 'Done', 'Got you', 'Ouch', 'صح عليك',
  'COPST', 'Boom', 'حبيبي', 'ايووا', 'حلووو', 'تعجبني',
  'اووبااا', 'صحححح', 'BAMM', 'Yeeha',
]

const EMOJIS = ['🚀', '✅', '🔥', '💯', '⚡', '✨', '👏', '💪', '🎯', '🤙']

interface StyleConfig {
  name: string
  bg: string
  text: string
  glow: boolean
  border: boolean
  frosted?: boolean
  bar?: boolean
}

const STYLES: StyleConfig[] = [
  { name: 'Green Glow', bg: 'transparent', text: '#33d64a', glow: true, border: false },
  { name: 'Green on Dark', bg: 'rgba(0,0,0,0.7)', text: '#33d64a', glow: false, border: false },
  { name: 'White on Green', bg: 'rgba(51,214,74,0.7)', text: '#fff', glow: false, border: false },
  { name: 'Minimal', bg: 'transparent', text: '#33d64a', glow: false, border: false },
  { name: 'Outline', bg: 'transparent', text: '#33d64a', glow: false, border: true },
  { name: 'Frosted Glass', bg: 'rgba(255,255,255,0.08)', text: '#33d64a', glow: false, border: false, frosted: true },
  { name: 'Solid', bg: '#33d64a', text: '#fff', glow: false, border: false },
  { name: 'Green Bar', bg: '#33d64a', text: '#33d64a', glow: false, border: false, bar: true },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

// ─── Copy Toast ───

function CopyToast({ visible, word, emoji }: { visible: boolean; word: string; emoji: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none px-4 w-full max-w-lg"
        >
          <div
            className="text-4xl sm:text-6xl md:text-8xl font-black text-green select-none text-center break-words"
            style={{
              textShadow: '0 0 60px rgba(51,214,74,0.6), 0 0 120px rgba(51,214,74,0.3)',
            }}
          >
            {emoji} {word}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Hint badge ───

function CopyHint({ dismissed }: { dismissed: boolean }) {
  const isMobile = useIsMobile()

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ delay: 3, duration: 0.6 }}
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-sm"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-surface-2 border border-border text-text-dim text-xs sm:text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse flex-none" />
            {isMobile ? 'try long-press → copy on any text' : 'try selecting text and pressing ⌘C'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Section wrapper with scroll animation ───

function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ─── Style preview cards ───

function StyleCard({ style, word }: { style: StyleConfig; word: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { once: true, margin: '-30px' })

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {style.bar ? (
        <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border bg-surface group active:scale-[0.98] sm:hover:border-green/20 transition-all duration-300">
          <div className="h-1 sm:h-1.5 bg-green" />
          <div className="px-3 sm:px-5 py-4 sm:py-6">
            <div className="flex gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff5f57]" />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#febc2e]" />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#28c840]" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="h-1.5 sm:h-2 rounded bg-border w-3/4" />
              <div className="h-1.5 sm:h-2 rounded bg-border w-1/2" />
            </div>
          </div>
          <div className="px-3 sm:px-5 pb-2 sm:pb-3">
            <span className="text-[10px] sm:text-xs text-text-dim font-mono">{style.name}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl sm:rounded-2xl border border-border bg-surface overflow-hidden group active:scale-[0.98] sm:hover:border-green/20 transition-all duration-300">
          <div
            className="h-24 sm:h-32 flex items-center justify-center relative"
            style={{ background: '#0a0a0a' }}
          >
            <span
              className="text-lg sm:text-2xl font-bold select-none transition-transform duration-300 sm:group-hover:scale-110"
              style={{
                color: style.text,
                textShadow: style.glow
                  ? '0 0 40px rgba(51,214,74,0.7), 0 0 80px rgba(51,214,74,0.3)'
                  : 'none',
                background: style.bg !== 'transparent' ? style.bg : 'none',
                padding: style.bg !== 'transparent' ? '6px 14px' : '0',
                borderRadius: '12px',
                border: style.border ? '2px solid #33d64a' : 'none',
                backdropFilter: style.frosted ? 'blur(16px)' : 'none',
              }}
            >
              {word}
            </span>
          </div>
          <div className="px-3 sm:px-5 py-2 sm:py-3">
            <span className="text-[10px] sm:text-xs text-text-dim font-mono">{style.name}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Floating words background ───

interface FloatingWord {
  id: number
  word: string
  x: number
  y: number
  duration: number
  size: number
  isArabic: boolean
}

function FloatingWords() {
  const [items, setItems] = useState<FloatingWord[]>([])
  const idCounter = useRef(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    const spawn = () => {
      const id = idCounter.current++
      const word = pick(WORDS)
      const x = 5 + Math.random() * 85
      const y = 5 + Math.random() * 85
      const duration = 2.5 + Math.random() * 2
      const size = isMobile ? 12 + Math.random() * 18 : 14 + Math.random() * 28
      const isArabic = /[\u0600-\u06FF]/.test(word)

      setItems(prev => [...prev.slice(isMobile ? -12 : -20), { id, word, x, y, duration, size, isArabic }])
    }

    spawn()
    spawn()
    if (!isMobile) spawn()
    const iv = setInterval(spawn, isMobile ? 1200 : 800)
    return () => clearInterval(iv)
  }, [isMobile])

  useEffect(() => {
    if (items.length === 0) return
    const oldest = items[0]
    const timer = setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== oldest.id))
    }, (oldest.duration + 0.5) * 1000)
    return () => clearTimeout(timer)
  }, [items])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {items.map(item => (
        <span
          key={item.id}
          className="absolute animate-float-word font-bold text-green/[0.10] sm:text-green/[0.12] select-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            '--duration': `${item.duration}s`,
            direction: item.isArabic ? 'rtl' : 'ltr',
          } as CSSProperties}
        >
          {item.word}
        </span>
      ))}
    </div>
  )
}

// ─── Clipboard history mockup ───

function HistoryMockup() {
  const items = [
    { text: 'npm install framer-motion', time: 'Just now' },
    { text: 'https://hsnsz.com/api/v2/auth', time: '2m ago' },
    { text: 'const handleCopy = useCallback(…', time: '5m ago' },
    { text: 'SELECT * FROM users WHERE…', time: '12m ago' },
    { text: 'rgba(51, 214, 74, 0.6)', time: '18m ago' },
  ]

  return (
    <div className="w-full max-w-[280px] sm:max-w-xs mx-auto">
      <div className="rounded-xl sm:rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl shadow-black/40">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 border-b border-border bg-surface-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green flex-none">
            <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
            <rect x="4" y="6" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="text-[11px] sm:text-xs font-semibold">Clipboard History</span>
          <span className="flex-1" />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-text-dim flex-none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        {items.map((item, i) => (
          <div key={i} className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-start gap-2 sm:gap-3 border-b border-border/50 last:border-0">
            <span className="mt-0.5 flex-none w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green/20 text-green text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-mono text-text truncate">{item.text}</p>
              <p className="text-[9px] sm:text-[10px] text-text-dim mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between bg-surface-2 border-t border-border">
          <span className="text-[9px] sm:text-[10px] text-text-dim">Click to copy · Double-click to paste</span>
        </div>
      </div>
    </div>
  )
}

// ─── Animated demo sequence ───

function DemoSequence() {
  const [step, setStep] = useState(0)
  const [demoWord, setDemoWord] = useState('COPST')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: '-80px' })

  useEffect(() => {
    if (!inView) return
    const cycle = () => {
      setStep(0)
      setTimeout(() => setStep(1), 600)
      setTimeout(() => setStep(2), 1200)
      setTimeout(() => {
        setDemoWord(pick(WORDS))
        setStep(3)
      }, 1800)
      setTimeout(() => setStep(4), 3200)
    }
    cycle()
    const iv = setInterval(cycle, 4200)
    return () => clearInterval(iv)
  }, [inView])

  return (
    <div ref={ref} className="relative w-full max-w-lg mx-auto">
      <div className="rounded-xl sm:rounded-2xl border border-border bg-[#0a0a0a] overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border bg-surface">
          <div className="flex gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[10px] sm:text-[11px] text-text-dim font-mono ml-1 sm:ml-2">untitled.js</span>
        </div>
        <div className="p-3 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto">
          <div className="text-text-dim whitespace-nowrap">
            <span className="text-[#c678dd]">const</span>{' '}
            <span className="text-[#61afef]">message</span>{' '}
            <span className="text-text-dim">=</span>{' '}
            <span
              className="transition-all duration-300 rounded px-0.5 -mx-0.5"
              style={{
                background: step >= 1 && step < 4 ? 'rgba(51,214,74,0.2)' : 'transparent',
                color: '#98c379',
              }}
            >
              &quot;your clipboard just leveled up&quot;
            </span>
            <span className="text-text-dim">;</span>
          </div>
          <div className="mt-1 text-text-dim/40 whitespace-nowrap">
            <span className="text-[#c678dd]">export</span>{' '}
            <span className="text-[#c678dd]">default</span>{' '}
            <span className="text-[#61afef]">message</span>;
          </div>
        </div>

        <AnimatePresence>
          {step >= 2 && step < 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4"
            >
              <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg">
                <kbd className="text-[10px] sm:text-xs font-mono text-text bg-bg px-1 sm:px-1.5 py-0.5 rounded border border-border">⌘</kbd>
                <kbd className="text-[10px] sm:text-xs font-mono text-text bg-bg px-1 sm:px-1.5 py-0.5 rounded border border-border">C</kbd>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              className="text-4xl sm:text-5xl md:text-6xl font-black text-green"
              style={{
                textShadow: '0 0 50px rgba(51,214,74,0.5), 0 0 100px rgba(51,214,74,0.2)',
              }}
            >
              {demoWord}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Feature line ───

function FeatureLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-start sm:items-center gap-3 sm:gap-4 group"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green flex-none mt-2 sm:mt-0 group-hover:shadow-[0_0_8px_rgba(51,214,74,0.6)] transition-shadow" />
      <span className="text-base sm:text-lg md:text-xl text-text/80 font-medium leading-snug">{children}</span>
    </motion.div>
  )
}

// ─── Main Page ───

export default function CopstPage() {
  const [toastVisible, setToastVisible] = useState(false)
  const [toastWord, setToastWord] = useState('')
  const [toastEmoji, setToastEmoji] = useState('')
  const [hintDismissed, setHintDismissed] = useState(false)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    setHintDismissed(true)
    setToastWord(pick(WORDS))
    setToastEmoji(pick(EMOJIS))
    setToastVisible(true)

    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToastVisible(false), 1200)
  }, [])

  useEffect(() => {
    document.addEventListener('copy', handleCopy)
    return () => document.removeEventListener('copy', handleCopy)
  }, [handleCopy])

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="copst-page min-h-screen">
      <div className="noise" />
      <CopyToast visible={toastVisible} word={toastWord} emoji={toastEmoji} />
      <CopyHint dismissed={hintDismissed} />

      {/* ─── Hero ─── */}
      <header className="relative min-h-[100svh] flex flex-col items-center justify-center px-5 sm:px-6 overflow-hidden">
        <FloatingWords />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 text-center w-full"
        >
          <h1
            className="mx-auto w-fit text-[22vw] sm:text-[18vw] md:text-[12vw] lg:text-[10vw] font-black italic leading-none tracking-tighter text-green select-all cursor-text"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              textShadow: '0 0 80px rgba(51,214,74,0.35), 0 0 160px rgba(51,214,74,0.15)',
              boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.15)',
            }}
          >
            COPST
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-text-dim max-w-md mx-auto px-2"
          >
            your clipboard, but it gives a damn.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <a
              href="#download"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-full bg-green text-bg font-semibold text-sm active:scale-95 hover:brightness-110 transition-all hover:shadow-[0_0_30px_rgba(51,214,74,0.3)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-full border border-border text-text-dim text-sm font-medium active:scale-95 hover:border-green/30 hover:text-text transition-all"
            >
              See how it works
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </motion.div>
      </header>

      {/* ─── How it works ─── */}
      <div id="how" className="py-20 sm:py-32 px-5 sm:px-6">
        <Section className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="order-1">
              <span className="text-[10px] sm:text-xs font-mono text-green tracking-widest uppercase">How it works</span>
              <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Copy something.<br />
                <span className="text-text-dim">Get a reaction.</span>
              </h2>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base text-text-dim leading-relaxed max-w-sm">
                Every time you hit ⌘C, COPST throws a word on your screen.
                Random. Customizable. Sometimes in Arabic.
                It also keeps your last 10 copies in the menu bar.
              </p>
            </div>
            <div className="order-2">
              <DemoSequence />
            </div>
          </div>
        </Section>
      </div>

      {/* ─── Styles ─── */}
      <div className="py-20 sm:py-32 px-5 sm:px-6">
        <Section className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-[10px] sm:text-xs font-mono text-green tracking-widest uppercase">8 Styles</span>
            <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-bold">
              Pick how your copies look.
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {STYLES.map((style) => (
              <StyleCard key={style.name} style={style} word={pick(WORDS)} />
            ))}
          </div>
        </Section>
      </div>

      {/* ─── History mockup ─── */}
      <div className="py-20 sm:py-32 px-5 sm:px-6">
        <Section className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="order-2 md:order-1">
              <HistoryMockup />
            </div>
            <div className="order-1 md:order-2">
              <span className="text-[10px] sm:text-xs font-mono text-green tracking-widest uppercase">Clipboard History</span>
              <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Everything you copied.<br />
                <span className="text-text-dim">Right there.</span>
              </h2>
              <p className="mt-4 sm:mt-6 text-sm sm:text-base text-text-dim leading-relaxed max-w-sm">
                Your last 10 items live in the menu bar.
                Click once to copy it again.
                Double-click to paste it directly.
                No window. No app switching.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* ─── Features ─── */}
      <div className="py-20 sm:py-32 px-5 sm:px-6">
        <Section className="max-w-2xl mx-auto">
          <span className="text-[10px] sm:text-xs font-mono text-green tracking-widest uppercase">Details</span>
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <FeatureLine delay={0}>Menu bar app — stays out of your way</FeatureLine>
            <FeatureLine delay={0.06}>8 notification styles, fully customizable</FeatureLine>
            <FeatureLine delay={0.12}>Random words and emoji on every copy</FeatureLine>
            <FeatureLine delay={0.18}>Adjustable animation timing and glow</FeatureLine>
            <FeatureLine delay={0.24}>Custom fonts and colors</FeatureLine>
            <FeatureLine delay={0.3}>Works with ⌘C and ⌘X globally</FeatureLine>
            <FeatureLine delay={0.36}>macOS 13 Ventura and later</FeatureLine>
            <FeatureLine delay={0.42}>Free. Open source. No tracking.</FeatureLine>
          </div>
        </Section>
      </div>

      {/* ─── Words section ─── */}
      <div className="py-20 sm:py-32 px-5 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green/[0.02] to-transparent pointer-events-none" />
        <Section className="max-w-2xl mx-auto text-center relative z-10">
          <span className="text-[10px] sm:text-xs font-mono text-green tracking-widest uppercase">The Words</span>
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {WORDS.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-surface border border-border text-xs sm:text-sm font-mono text-text/70 active:scale-95 active:text-green sm:hover:text-green sm:hover:border-green/30 transition-all cursor-default select-all"
              >
                {word}
              </motion.span>
            ))}
          </div>
          <p className="mt-6 sm:mt-8 text-text-dim text-xs sm:text-sm">
            These ship by default. Replace them with anything you want.
          </p>
        </Section>
      </div>

      {/* ─── Download ─── */}
      <div id="download" className="py-28 sm:py-40 px-5 sm:px-6">
        <Section className="max-w-xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl md:text-7xl font-black text-green"
            style={{
              textShadow: '0 0 60px rgba(51,214,74,0.25)',
            }}
          >
            Get COPST
          </h2>
          <p className="mt-4 sm:mt-6 text-text-dim text-sm sm:text-base">
            Free download. macOS 13+.
          </p>
          <div className="mt-8 sm:mt-10">
            <a
              href="https://hsnsz.com"
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-full bg-green text-bg font-bold text-base sm:text-lg active:scale-95 hover:brightness-110 transition-all hover:shadow-[0_0_40px_rgba(51,214,74,0.35)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download DMG
            </a>
          </div>
          <p className="mt-5 sm:mt-6 text-[10px] sm:text-xs text-text-dim/60 font-mono">
            v1.0 · Universal (Apple Silicon + Intel)
          </p>
        </Section>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-8 sm:py-10 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-green">COPST</span>
            <span className="text-text-dim text-xs sm:text-sm">© 2026</span>
          </div>
          <a
            href="https://hsnsz.com"
            className="text-xs sm:text-sm text-text-dim hover:text-green transition-colors font-mono"
            target="_blank"
            rel="noopener noreferrer"
          >
            hsnsz.com
          </a>
        </div>
      </footer>
    </div>
  )
}
