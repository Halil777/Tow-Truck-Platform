import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { fetchOrders, type Order } from '../api/client';

const STATUS_COLORS: Record<string, 'gray' | 'green' | 'red' | 'blue' | 'yellow'> = {
  PENDING: 'yellow',
  ASSIGNED: 'blue',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function OrdersPage() {
  const [status, setStatus] = useState<string>('ALL');
  const [driverId, setDriverId] = useState<string>('');

  const queryParams = useMemo(() => {
    const p: any = {};
    if (status && status !== 'ALL') p.status = status;
    if (driverId && Number(driverId) > 0) p.driverId = Number(driverId);
    return p as { status?: string; driverId?: number } | undefined;
  }, [status, driverId]);

  const orders = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => fetchOrders(queryParams),
  });

  const columns = useMemo(() => [
    { header: 'ID', key: 'id' },
    {
      header: 'User',
      key: 'user',
      render: (o: Order) => {
        const u: any = o.user || {};
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
        return name || u.username || u.phone || '-';
      },
    },
    {
      header: 'Driver',
      key: 'driver',
      render: (o: Order) => (o.driver ? o.driver.name : '-'),
    },
    {
      header: 'Status',
      key: 'status',
      render: (o: Order) => <Badge color={STATUS_COLORS[o.status] || 'gray'}>{o.status}</Badge>,
    },
    {
      header: 'Created',
      key: 'createdAt',
      render: (o: Order) => new Date(o.createdAt).toLocaleString(),
    },
    {
      header: 'Price, ₽',
      key: 'price',
      render: (o: any) => (o.price ? o.price.toFixed(2) : '-')
    },
    {
      header: 'Payment',
      key: 'payment',
      render: (o: any) => o.payment?.status ? (
        <Badge color={o.payment.status === 'SUCCESS' ? 'green' : o.payment.status === 'PENDING' ? 'yellow' : 'red'}>
          {o.payment.status}
        </Badge>
      ) : '-'
    },
    {
      header: 'Pickup',
      key: 'pickupLocation',
      render: (o: Order) => formatLocation(o.pickupLocation),
    },
    {
      header: 'Dropoff',
      key: 'dropoffLocation',
      render: (o: Order) => formatLocation(o.dropoffLocation),
    },
  ], []);

  return (
    <div className="stack">
      <h2>Orders</h2>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="stack">
          <span className="text-sm">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">PENDING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
        <label className="stack">
          <span className="text-sm">Driver ID</span>
          <input
            className="input"
            type="number"
            min={0}
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            placeholder="e.g. 12"
          />
        </label>
        <button className="button" onClick={() => orders.refetch()} disabled={orders.isFetching}>
          {orders.isFetching ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {orders.isLoading && <div className="muted">Loading orders...</div>}
      {orders.isError && <div className="text-red-600">Failed to load orders</div>}

      {orders.data && (
        <Table<Order> data={orders.data} columns={columns as any} pageSize={10} />
      )}
    </div>
  );
}

function formatLocation(loc: any): string {
  if (!loc) return '-';
  if (typeof loc === 'string') return loc;
  const name = loc.name || loc.address || '';
  const lat = loc.lat ?? loc.latitude;
  const lng = loc.lng ?? loc.longitude;
  const coord = lat != null && lng != null ? `(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})` : '';
  return [name, coord].filter(Boolean).join(' ');
}

