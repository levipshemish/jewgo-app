"use client"

import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type TickMode = "minute" | "second"

type TimeContextValue = {
  now: number
  requestSecondPrecision: () => () => void
}

const TimeContext = createContext<TimeContextValue | null>(null)

export function TimeUpdateProvider({ children }: PropsWithChildren) {
  const [now, setNow] = useState(() => Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null>(null)
  const modeRef = useRef<TickMode>("minute")
  const secondSubscribersRef = useRef(0)

  const clearExistingInterval = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }

  const schedule = useCallback(() => {
    clearExistingInterval()

    const delay = modeRef.current === "second" ? 1000 : 60_000

    // Align minute ticks to the start of the next minute
    if (modeRef.current === "minute") {
      const nowDate = Date.now()
      const msUntilNextMinute = 60_000 - (nowDate % 60_000)
      intervalRef.current = setTimeout(() => {
        setNow(Date.now())
        intervalRef.current = setInterval(() => setNow(Date.now()), delay)
      }, msUntilNextMinute)
    } else {
      intervalRef.current = setInterval(() => setNow(Date.now()), delay)
    }
  }, [])

  const ensureMode = useCallback((desired: TickMode) => {
    if (modeRef.current === desired) {
      return
    }
    modeRef.current = desired
    schedule()
  }, [schedule])

  useEffect(() => {
    schedule()
    return () => {
      clearExistingInterval()
    }
  }, [schedule])

  const requestSecondPrecision = useCallback(() => {
    secondSubscribersRef.current += 1
    ensureMode("second")

    return () => {
      secondSubscribersRef.current = Math.max(0, secondSubscribersRef.current - 1)
      if (secondSubscribersRef.current === 0) {
        ensureMode("minute")
      }
    }
  }, [ensureMode])

  const value = useMemo<TimeContextValue>(() => ({
    now,
    requestSecondPrecision,
  }), [now, requestSecondPrecision])

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}

type UseTimeOptions = {
  requireSecondPrecision?: boolean
}

export function useTimeNow(options: UseTimeOptions = {}) {
  const context = useContext(TimeContext)
  const [fallbackNow, setFallbackNow] = useState(() => Date.now())

  useEffect(() => {
    if (context) {
      return
    }
    const interval = setInterval(() => setFallbackNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [context])

  useEffect(() => {
    if (!context || !options.requireSecondPrecision) {
      return
    }

    const release = context.requestSecondPrecision()
    return () => {
      release()
    }
  }, [context, options.requireSecondPrecision])

  return context ? context.now : fallbackNow
}
