import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import { decodeJwt } from '../utils/jwt';
import { useUI } from '../contexts/UIContext';

export default function Header() {
  const { t } = useTranslation();
  const { toggleSidebar } = useUI();
  const [query, setQuery] = useState('');
  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const info = decodeJwt(token);

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.assign('/login');
  };

  return (
    <header className="topbar" style={{ width: '100%' }}>
      <div className="row" style={{ gap: 12 }}>
        <button onClick={toggleSidebar} aria-label="menu">☰</button>
        <strong>Tow Truck Admin</strong>
        <input
          placeholder={t('search') || 'Search'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 260 }}
        />
      </div>
      <div className="row" style={{ gap: 8, position: 'relative' }}>
        <button onClick={() => setOpenNotif((v) => !v)} aria-label="notifications">🔔</button>
        {openNotif && (
          <div className="card" style={{ position: 'absolute', right: 120, top: 44, width: 320 }}>
            <div className="muted">No new notifications</div>
          </div>
        )}
        <LanguageSwitcher />
        <ThemeSwitcher />
        <button onClick={() => setOpenProfile((v) => !v)} aria-label="profile">👤</button>
        {openProfile && (
          <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 220 }}>
            <div className="stack">
              <div className="muted">{info?.email || 'admin'}</div>
              <div className="muted">{info?.role || ''}</div>
              <button onClick={logout}>{t('signOut')}</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
