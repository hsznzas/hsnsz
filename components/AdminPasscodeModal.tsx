'use client'

import { useState, type FormEvent } from 'react'

interface AdminPasscodeModalProps {
  isOpen: boolean
  onSubmit: (passcode: string) => boolean
  onClose?: () => void
  title?: string
}

export function AdminPasscodeModal({
  isOpen,
  onSubmit,
  onClose,
  title = 'Admin Access',
}: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const ok = onSubmit(passcode)
    if (ok) {
      setPasscode('')
      setError('')
      onClose?.()
      return
    }
    setError('Incorrect passcode.')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter the passcode to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={(event) => {
              setPasscode(event.target.value)
              if (error) setError('')
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Passcode"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
