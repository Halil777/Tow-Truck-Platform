import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n: i18 } = useTranslation();
  const lang = i18.language.startsWith('ru') ? 'ru' : 'en';

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <select value={lang} onChange={onChange} aria-label="language">
      <option value="en">EN</option>
      <option value="ru">RU</option>
    </select>
  );
}

