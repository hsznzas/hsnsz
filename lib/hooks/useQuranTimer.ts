'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

export interface QuranSession {
  id: string
  start_page: number
  end_page: number | null
  start_at: string
  end_at: string | null
  duration_seconds: number | null
  pages_count: number | null
  created_at: string
}

interface ActiveSession {
  id: string
  startAt: number
  startPage: number
}

const LS_KEY = 'quran-active-session'

function getLocalSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLocalSession(session: ActiveSession | null) {
  if (typeof window === 'undefined') return
  if (session) {
    localStorage.setItem(LS_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(LS_KEY)
  }
}

export function useQuranTimer() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [sessions, setSessions] = useState<QuranSession[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startElapsedTicker = useCallback((startAt: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setElapsed(Math.floor((Date.now() - startAt) / 1000))
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAt) / 1000))
    }, 1000)
  }, [])

  const stopElapsedTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setElapsed(0)
  }, [])

  const fetchSessions = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('quran_sessions')
      .select('*')
      .not('end_at', 'is', null)
      .order('start_at', { ascending: false })
    if (data) setSessions(data as QuranSession[])
  }, [])

  // On mount: restore active session from localStorage or Supabase
  useEffect(() => {
    async function init() {
      const sb = getSupabase()
      const local = getLocalSession()

      if (local && sb) {
        const { data } = await sb
          .from('quran_sessions')
          .select('*')
          .eq('id', local.id)
          .is('end_at', null)
          .single()
        if (data) {
          const session: ActiveSession = {
            id: data.id,
            startAt: new Date(data.start_at).getTime(),
            startPage: data.start_page,
          }
          setActiveSession(session)
          startElapsedTicker(session.startAt)
        } else {
          setLocalSession(null)
        }
      } else if (sb) {
        const { data } = await sb
          .from('quran_sessions')
          .select('*')
          .is('end_at', null)
          .order('start_at', { ascending: false })
          .limit(1)
          .single()
        if (data) {
          const session: ActiveSession = {
            id: data.id,
            startAt: new Date(data.start_at).getTime(),
            startPage: data.start_page,
          }
          setActiveSession(session)
          setLocalSession(session)
          startElapsedTicker(session.startAt)
        }
      }

      await fetchSessions()
      setLoading(false)
    }

    init()
    return () => stopElapsedTicker()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getNextStartPage = useCallback((): number => {
    if (sessions.length === 0) return 1
    const lastEnd = sessions[0].end_page
    if (lastEnd === null) return 1
    return lastEnd >= 604 ? 1 : lastEnd + 1
  }, [sessions])

  const startRecording = useCallback(async (): Promise<{ success: boolean; startPage: number }> => {
    const sb = getSupabase()
    if (!sb) return { success: false, startPage: 0 }

    const startPage = getNextStartPage()
    const now = new Date().toISOString()

    const { data, error } = await sb
      .from('quran_sessions')
      .insert({ start_page: startPage, start_at: now })
      .select()
      .single()

    if (error || !data) return { success: false, startPage: 0 }

    const session: ActiveSession = {
      id: data.id,
      startAt: new Date(data.start_at).getTime(),
      startPage: data.start_page,
    }
    setActiveSession(session)
    setLocalSession(session)
    startElapsedTicker(session.startAt)

    return { success: true, startPage }
  }, [getNextStartPage, startElapsedTicker])

  const stopRecording = useCallback(
    async (endPage: number): Promise<{ success: boolean; duration: number; pages: number }> => {
      const sb = getSupabase()
      if (!sb || !activeSession) return { success: false, duration: 0, pages: 0 }

      const now = new Date()
      const durationSeconds = Math.floor((now.getTime() - activeSession.startAt) / 1000)
      const pagesCount = endPage - activeSession.startPage + 1

      const { error } = await sb
        .from('quran_sessions')
        .update({
          end_page: endPage,
          end_at: now.toISOString(),
          duration_seconds: durationSeconds,
          pages_count: pagesCount,
        })
        .eq('id', activeSession.id)

      if (error) return { success: false, duration: 0, pages: 0 }

      stopElapsedTicker()
      setActiveSession(null)
      setLocalSession(null)
      await fetchSessions()

      return { success: true, duration: durationSeconds, pages: pagesCount }
    },
    [activeSession, fetchSessions, stopElapsedTicker]
  )

  const cancelRecording = useCallback(async () => {
    const sb = getSupabase()
    if (!sb || !activeSession) return

    await sb.from('quran_sessions').delete().eq('id', activeSession.id)

    stopElapsedTicker()
    setActiveSession(null)
    setLocalSession(null)
  }, [activeSession, stopElapsedTicker])

  const deleteSession = useCallback(
    async (id: string) => {
      const sb = getSupabase()
      if (!sb) return
      await sb.from('quran_sessions').delete().eq('id', id)
      await fetchSessions()
    },
    [fetchSessions]
  )

  const addManualSession = useCallback(
    async (params: {
      start_page: number
      end_page: number
      start_at: string
      duration_minutes: number
    }): Promise<boolean> => {
      const sb = getSupabase()
      if (!sb) return false

      const startAt = new Date(params.start_at)
      const durationSeconds = Math.round(params.duration_minutes * 60)
      const endAt = new Date(startAt.getTime() + durationSeconds * 1000)
      const pagesCount = params.end_page - params.start_page + 1

      const { error } = await sb.from('quran_sessions').insert({
        start_page: params.start_page,
        end_page: params.end_page,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        duration_seconds: durationSeconds,
        pages_count: pagesCount,
      })

      if (error) return false
      await fetchSessions()
      return true
    },
    [fetchSessions]
  )

  const updateSession = useCallback(
    async (
      id: string,
      params: {
        start_page: number
        end_page: number
        start_at: string
        duration_minutes: number
      }
    ): Promise<boolean> => {
      const sb = getSupabase()
      if (!sb) return false

      const startAt = new Date(params.start_at)
      const durationSeconds = Math.round(params.duration_minutes * 60)
      const endAt = new Date(startAt.getTime() + durationSeconds * 1000)
      const pagesCount = params.end_page - params.start_page + 1

      const { error } = await sb
        .from('quran_sessions')
        .update({
          start_page: params.start_page,
          end_page: params.end_page,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          duration_seconds: durationSeconds,
          pages_count: pagesCount,
        })
        .eq('id', id)

      if (error) return false
      await fetchSessions()
      return true
    },
    [fetchSessions]
  )

  return {
    activeSession,
    elapsed,
    sessions,
    loading,
    isRecording: !!activeSession,
    startRecording,
    stopRecording,
    cancelRecording,
    deleteSession,
    addManualSession,
    updateSession,
    getNextStartPage,
    fetchSessions,
  }
}
