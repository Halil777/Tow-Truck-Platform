import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="sidebar">
      <nav className="stack">
        <Section title={t('dashboard')} icon="📊" links={[{ to: '/', label: t('dashboard'), icon: '📊', end: true }]} />
        <Section
          title="Orders"
          icon="🧾"
          links={[
            { to: '/orders?status=IN_PROGRESS', label: 'Active Orders', icon: '▶️' },
            { to: '/orders?status=COMPLETED', label: 'Completed Orders', icon: '✅' },
            { to: '/orders?status=CANCELLED', label: 'Canceled Orders', icon: '❌' },
          ]}
        />
        <Section
          title="Drivers"
          icon="🚚"
          links={[
            { to: '/drivers', label: 'Driver List', icon: '📋' },
            { to: '/drivers?online=1', label: 'Drivers Online', icon: '🟢' },
            { to: '/drivers/performance', label: 'Driver Performance', icon: '📈' },
          ]}
        />
        <Section title={t('users')} icon="👥" links={[{ to: '/users', label: 'Registered Users', icon: '👤' }, { to: '/users?suspended=1', label: 'Suspended Users', icon: '⛔' }]} />
        <Section
          title="Finance"
          icon="💳"
          links={[
            { to: '/finance/payments', label: 'Payments', icon: '💵' },
            { to: '/finance/payouts', label: 'Payouts', icon: '💰' },
            { to: '/finance/transactions', label: 'Transactions', icon: '💲' },
          ]}
        />
        <Section
          title="Analytics"
          icon="📈"
          links={[
            { to: '/analytics/revenue', label: 'Revenue Trends', icon: '📈' },
            { to: '/analytics/drivers', label: 'Driver Activity', icon: '👣' },
            { to: '/analytics/heatmap', label: 'Order Heatmap', icon: '🗺️' },
          ]}
        />
        <Section title="Settings" icon="⚙️" links={[{ to: '/settings/system', label: 'System Settings', icon: '⚙️' }, { to: '/settings/admins', label: 'Admin Management', icon: '👑' }]} />
      </nav>
    </aside>
  );
}

function Section({ title, icon, links }: { title: string; icon?: string; links: { to: string; label: string; icon?: string; end?: boolean }[] }) {
  return (
    <div className="stack">
      <div className="muted section-title">{icon ? `${icon} ` : ''}{title}</div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end as any} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon" aria-hidden>{l.icon || '•'}</span>
          <span className="label">{l.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
