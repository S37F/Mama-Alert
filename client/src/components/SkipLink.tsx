import { useTranslation } from 'react-i18next'

/** Keyboard / screen-reader shortcut: jumps to `#main-content` (must exist on the page). */
export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      {t('a11y.skipToMain')}
    </a>
  )
}
