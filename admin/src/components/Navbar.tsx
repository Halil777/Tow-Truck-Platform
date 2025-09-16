import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar() {
  const { t } = useTranslation();
  const signOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.assign('/login');
  };

  return (
    <header className="topbar">
      <strong>{t('appTitle')}</strong>
      <div className="grow" />
      <LanguageSwitcher />
      <ThemeSwitcher />
      <button onClick={signOut}>{t('signOut')}</button>
    </header>
  );
}

