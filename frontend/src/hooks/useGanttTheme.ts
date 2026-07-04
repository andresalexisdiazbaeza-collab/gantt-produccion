import { useCallback, useEffect, useState } from 'react'
import { loadGanttTheme, saveGanttTheme, type GanttTheme } from '../utils/ganttTheme'

export function useGanttTheme() {
  const [theme, setThemeState] = useState<GanttTheme>(loadGanttTheme)

  useEffect(() => {
    saveGanttTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: GanttTheme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'day' ? 'night' : 'day')),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
