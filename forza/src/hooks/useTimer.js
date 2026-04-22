// src/hooks/useTimer.js
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook de timer de descanso para FORZA
 * @param {number} initialSeconds - duración inicial en segundos
 */
export function useTimer(initialSeconds = 90) {
  const [duration,   setDuration]   = useState(initialSeconds)
  const [remaining,  setRemaining]  = useState(0)
  const [isRunning,  setIsRunning]  = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef(null)

  // Limpiar al desmontar
  useEffect(() => () => clearInterval(intervalRef.current), [])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setIsRunning(false)
          setIsFinished(true)
          // Vibración háptica si disponible
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  const start = useCallback((seconds) => {
    const secs = seconds ?? duration
    setDuration(secs)
    setRemaining(secs)
    setIsFinished(false)
    setIsRunning(true)
  }, [duration])

  const pause = useCallback(() => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
  }, [])

  const resume = useCallback(() => {
    if (remaining > 0) setIsRunning(true)
  }, [remaining])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setRemaining(0)
    setIsFinished(false)
  }, [])

  const progress = duration > 0 ? (duration - remaining) / duration : 0 // 0→1

  return { remaining, isRunning, isFinished, progress, start, pause, resume, stop, duration }
}