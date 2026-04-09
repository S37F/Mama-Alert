import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Keeps `<html lang>` aligned with the active i18n language for assistive tech and typography. */
export function DocumentLangSync() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const lang = i18n.resolvedLanguage ?? i18n.language ?? 'en'
    document.documentElement.lang = lang.split('-')[0] || 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  return null
}
