import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { fetchBotInfo, fetchUsers, fetchDrivers, fetchOrders, fetchPayments } from '../api/client';

export default function Dashboard() {
  const { t } = useTranslation();

  const bot = useQuery({ queryKey: ['bot-info'], queryFn: fetchBotInfo });
  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });
  const orders = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const payments = useQuery({ queryKey: ['payments'], queryFn: fetchPayments });

  const onlineDrivers = (drivers.data || []).filter((d) => d.online).length;
  const activeOrders = (orders.data || []).filter((o) => o.status === 'IN_PROGRESS').length;

  const latestOrders = useMemo(() => (orders.data || []).slice(0, 10), [orders.data]);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    const ps = payments.data || [];
    for (const p of ps) {
      if (p.status !== 'SUCCESS') continue;
      const d = new Date(p.createdAt);
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    // Last 7 days
    const out: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, value: map.get(key) || 0 });
    }
    return out;
  }, [payments.data]);

  return (
    <div className="stack">
      <h2>{t('dashboard')}</h2>

      {/* Metrics */}
      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <Card title="Active Orders"><h1>{activeOrders}</h1></Card>
        <Card title="Drivers Online"><h1>{onlineDrivers}</h1></Card>
        <Card title="Registered Users"><h1>{users.data?.length ?? '—'}</h1></Card>
        <Card title="Revenue Today"><h1>{sumToday(payments.data || []).toFixed(2)}</h1></Card>
      </div>

      {/* Orders Overview */}
      <Card title="Latest Orders">
        {orders.isLoading ? (
          <div className="muted">Loading...</div>
        ) : (
          <Table
            data={latestOrders}
            columns={[
              { header: 'ID', key: 'id' },
              {
                header: 'User',
                key: 'user',
                render: (o: any) => [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || o.user?.username || '-'
              },
              {
                header: 'Driver',
                key: 'driver',
                render: (o: any) => o.driver?.name || '-'
              },
              { header: 'Status', key: 'status' },
              {
                header: 'Created',
                key: 'createdAt',
                render: (o: any) => new Date(o.createdAt).toLocaleString(),
              },
            ]}
            pageSize={10}
          />
        )}
      </Card>

      {/* Drivers Activity */}
      <Card title="Drivers Activity">
        {drivers.isLoading ? (
          <div className="muted">Loading...</div>
        ) : (
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            {(drivers.data || [])
              .filter((d) => d.online)
              .map((d) => (
                <div key={d.id} className="card" style={{ minWidth: 220 }}>
                  <div><strong>{d.name}</strong></div>
                  <div className="muted">{d.phone}</div>
                  <div className="muted">{d.status}</div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Revenue Chart */}
      <Card title="Revenue (7d)">
        {payments.isLoading ? (
          <div className="muted">Loading...</div>
        ) : (
          <MiniBarChart data={revenueByDay} />
        )}
      </Card>

      {/* System Alerts */}
      <Card title="System Alerts">
        <ul>
          {drivers.data?.some((d) => d.status !== 'APPROVED') && <li>Drivers pending approval</li>}
          {payments.data?.some((p) => p.status === 'FAILED') && <li>Some payments failed</li>}
          {!drivers.data?.some((d) => d.online) && <li>No drivers online</li>}
        </ul>
      </Card>

      {/* Bot status */}
      <Card title={t('botStatus')} extra={<button onClick={() => bot.refetch()} disabled={bot.isFetching}>{t('fetchBotInfo')}</button>}>
        {bot.isLoading && <div className="muted">Loading...</div>}
        {bot.isError && <div className="muted">Failed to load bot info</div>}
        {bot.data && (
          <pre className="card" style={{ overflowX: 'auto' }}>{JSON.stringify(bot.data, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}

function sumToday(payments: any[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return payments.reduce((acc, p) => {
    if (p.status !== 'SUCCESS') return acc;
    const d = new Date(p.createdAt);
    return d >= start ? acc + (p.amount || 0) : acc;
  }, 0);
}

function MiniBarChart({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 360;
  const h = 120;
  const barW = Math.floor(w / data.length) - 4;
  return (
    <svg width={w} height={h} role="img" aria-label="bar-chart">
      {data.map((d, i) => {
        const x = i * (barW + 4) + 2;
        const barH = Math.round((d.value / max) * (h - 24));
        const y = h - barH - 20;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barW} height={barH} fill="var(--primary)" rx={4} />
            <text x={x + barW / 2} y={h - 6} textAnchor="middle" fontSize={10} className="muted">
              {d.date.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
