import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import ruCommon from './locales/ru/common.json';

const resources = {
  en: { translation: enCommon },
  ru: { translation: ruCommon },
} as const;

const storedLang = localStorage.getItem('lang');
const fallbackLng = storedLang || (navigator.language.startsWith('ru') ? 'ru' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: fallbackLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
