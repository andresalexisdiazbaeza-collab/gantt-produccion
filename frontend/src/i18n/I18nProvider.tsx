import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { translations, type TranslationKey } from './translations'
import type { Language } from './types'

const STORAGE_KEY = 'gantt-lang'

function detectLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY) as Language | null
  if (saved && saved in translations) return saved
  const nav = navigator.language.slice(0, 2)
  if (nav === 'en' || nav === 'sk' || nav === 'it') return nav
  return 'es'
}

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage)

  const setLang = useCallback((next: Language) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let text: string = String(translations[lang][key] ?? translations.es[key] ?? key)
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return text
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
