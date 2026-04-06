import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored)
    } catch {
      // invalid JSON or localStorage error
    }
    return defaultValue
  })

  // Re-read when key changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
      else setValue(defaultValue)
    } catch {
      setValue(defaultValue)
    }
  }, [key])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage full or unavailable
    }
  }, [key, value])

  return [value, setValue]
}
