import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function useThemeEffect() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: light)')
      const apply = () => root.setAttribute('data-theme', media.matches ? 'light' : 'dark')
      apply()
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    root.setAttribute('data-theme', theme)
  }, [theme])
}

/** Resolves 'system' to the OS preference so Monaco/xterm (which need a concrete theme name) stay in sync. */
export function useResolvedTheme(): 'dark' | 'light' {
  const theme = useSettingsStore((s) => s.theme)
  const [system, setSystem] = useState<'dark' | 'light'>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  )

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => setSystem(media.matches ? 'light' : 'dark')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return theme === 'system' ? system : theme
}
