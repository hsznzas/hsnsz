'use client'

import { useState, useCallback } from 'react'
import { useAdminGate } from '@/lib/hooks/useAdminGate'
import { useQuranTimer } from '@/lib/hooks/useQuranTimer'
import { AdminPasscodeModal } from '@/components/AdminPasscodeModal'
import StatsHeader from '@/components/quranspeed/StatsHeader'
import QuranChart from '@/components/quranspeed/QuranChart'
import SessionLog from '@/components/quranspeed/SessionLog'
import RecordButton from '@/components/quranspeed/RecordButton'
import StopModal from '@/components/quranspeed/StopModal'

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg animate-bounce"
      onAnimationEnd={onDone}
    >
      {message}
    </div>
  )
}

export default function QuranSpeedPage() {
  const { isUnlocked, isChecking, unlock } = useAdminGate()
  const timer = useQuranTimer()
  const [stopModalOpen, setStopModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleRecord = useCallback(async () => {
    const { success, startPage } = await timer.startRecording()
    if (success) {
      showToast(`بدأ التسجيل من صفحة ${startPage}`)
    }
  }, [timer, showToast])

  const handleStopPress = useCallback(() => {
    setStopModalOpen(true)
  }, [])

  const handleConfirmStop = useCallback(
    async (endPage: number) => {
      const { success, duration, pages } = await timer.stopRecording(endPage)
      setStopModalOpen(false)
      if (success) {
        const mins = Math.floor(duration / 60)
        showToast(`تم الحفظ: ${pages} صفحة في ${mins} دقيقة`)
      }
    },
    [timer, showToast]
  )

  const handleCancelSession = useCallback(async () => {
    await timer.cancelRecording()
    setStopModalOpen(false)
    showToast('تم إلغاء الجلسة')
  }, [timer, showToast])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] dark:bg-[#1a1a1a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1a1a]">
        <AdminPasscodeModal isOpen onSubmit={unlock} title="سرعة التلاوة" />
      </div>
    )
  }

  if (timer.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] dark:bg-[#1a1a1a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#faf8f5] dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 transition-colors"
      style={{
        fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui, sans-serif',
      }}
    >
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="mx-auto max-w-2xl px-4 pt-6 pb-32 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold">سرعة التلاوة</h1>
          <p className="text-sm text-gray-500 mt-1">تتبع وتحليل سرعة قراءة القرآن</p>
        </header>

        <StatsHeader sessions={timer.sessions} />

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            الرسم البياني
          </h2>
          <QuranChart sessions={timer.sessions} />
        </section>

        <section>
          <SessionLog sessions={timer.sessions} onDelete={timer.deleteSession} />
        </section>
      </div>

      <RecordButton
        isRecording={timer.isRecording}
        elapsed={timer.elapsed}
        startPage={timer.activeSession?.startPage ?? timer.getNextStartPage()}
        onRecord={handleRecord}
        onStop={handleStopPress}
      />

      <StopModal
        open={stopModalOpen}
        elapsed={timer.elapsed}
        startPage={timer.activeSession?.startPage ?? 1}
        onConfirm={handleConfirmStop}
        onCancel={handleCancelSession}
        onDismiss={() => setStopModalOpen(false)}
      />
    </div>
  )
}
