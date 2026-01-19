'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAdminGate } from '@/lib/hooks/useAdminGate'
import { AdminPasscodeModal } from '@/components/AdminPasscodeModal'

export function AdminDashboardLink() {
  const { isUnlocked, isChecking, unlock } = useAdminGate()
  const [showModal, setShowModal] = useState(false)

  if (isChecking) {
    return (
      <span className="text-sm text-slate-400">Checking admin access...</span>
    )
  }

  return (
    <>
      {isUnlocked ? (
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors duration-300 group"
        >
          Enter The Super To Do List
          <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
            →
          </span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors duration-300 group"
        >
          Admin access required
          <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
            →
          </span>
        </button>
      )}
      <AdminPasscodeModal
        isOpen={showModal}
        onSubmit={(passcode) => {
          const ok = unlock(passcode)
          if (ok) setShowModal(false)
          return ok
        }}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
