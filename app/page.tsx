import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full px-8 md:px-16 py-8">
        <span className="text-sm font-medium tracking-wide text-slate-900">
          Haseeb
        </span>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col justify-center px-8 md:px-16 pb-32">
        <div className="max-w-3xl">
          {/* Hero Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 leading-[1.1] tracking-tight mb-8">
            Building systems for clarity and execution.
          </h1>

          {/* Subtext */}
          <p className="text-sm md:text-base text-slate-500 leading-relaxed tracking-wide max-w-md mb-12">
            Entrepreneur, developer, and builder of high-performance tools for the distracted mind.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors duration-300 group"
            >
              Enter The Super To Do List
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </Link>
            <Link
              href="/lifetime-calendar"
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors duration-300 group"
            >
              View Lifetime Resource Tank
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-8 md:px-16 py-8">
        <nav className="flex items-center gap-8">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-300 tracking-wide"
          >
            Twitter
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-300 tracking-wide"
          >
            GitHub
          </a>
          <a
            href="mailto:hello@example.com"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-300 tracking-wide"
          >
            Email
          </a>
        </nav>
      </footer>
    </div>
  )
}
