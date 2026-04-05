import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import hi from './locales/hi.json'
import pt from './locales/pt.json'
import sw from './locales/sw.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      fr: { translation: fr },
      sw: { translation: sw },
      ar: { translation: ar },
      pt: { translation: pt },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
