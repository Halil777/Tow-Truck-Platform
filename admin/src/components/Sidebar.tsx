import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type LinkConfig = {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
};

type SectionConfig = {
  title: string;
  icon?: string;
  links: LinkConfig[];
};

export default function Sidebar() {
  const { t } = useTranslation();

  const sections: SectionConfig[] = [
    {
      title: t('dashboard'),
      icon: '📊',
      links: [{ to: '/', label: t('dashboard'), icon: '📊', end: true }]
    },
    {
      title: t('sidebar.orders.title'),
      icon: '🧾',
      links: [
        { to: '/orders?status=IN_PROGRESS', label: t('sidebar.orders.active'), icon: '🟢' },
        { to: '/orders?status=COMPLETED', label: t('sidebar.orders.completed'), icon: '✅' },
        { to: '/orders?status=CANCELLED', label: t('sidebar.orders.cancelled'), icon: '⛔' }
      ]
    },
    {
      title: t('sidebar.drivers.title'),
      icon: '🚗',
      links: [
        { to: '/drivers', label: t('sidebar.drivers.list'), icon: '📋' },
        { to: '/drivers?online=1', label: t('sidebar.drivers.online'), icon: '🟢' },
        { to: '/drivers/performance', label: t('sidebar.drivers.performance'), icon: '📈' }
      ]
    },
    {
      title: t('sidebar.users.title'),
      icon: '👥',
      links: [
        { to: '/users', label: t('sidebar.users.registered'), icon: '👥' },
        { to: '/users?suspended=1', label: t('sidebar.users.suspended'), icon: '🚫' }
      ]
    },
    {
      title: t('sidebar.finance.title'),
      icon: '💰',
      links: [
        { to: '/finance/payments', label: t('sidebar.finance.payments'), icon: '💳' },
        { to: '/finance/payouts', label: t('sidebar.finance.payouts'), icon: '💸' },
        { to: '/finance/transactions', label: t('sidebar.finance.transactions'), icon: '📑' }
      ]
    },
    {
      title: t('sidebar.analytics.title'),
      icon: '📊',
      links: [
        { to: '/analytics/revenue', label: t('sidebar.analytics.revenue'), icon: '📈' },
        { to: '/analytics/drivers', label: t('sidebar.analytics.drivers'), icon: '🚗' },
        { to: '/analytics/heatmap', label: t('sidebar.analytics.heatmap'), icon: '🗺️' }
      ]
    },
    {
      title: t('sidebar.settings.title'),
      icon: '⚙️',
      links: [
        { to: '/settings/system', label: t('sidebar.settings.system'), icon: '🛠️' },
        { to: '/settings/admins', label: t('sidebar.settings.admins'), icon: '🧑‍💼' }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <nav className="stack">
        {sections.map((section) => (
          <Section key={section.title} {...section} />
        ))}
      </nav>
    </aside>
  );
}

function Section({ title, icon, links }: SectionConfig) {
  return (
    <div className="stack">
      <div className="muted section-title">{icon ? `${icon} ` : ''}{title}</div>
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon" aria-hidden>{link.icon || '•'}</span>
          <span className="label">{link.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
