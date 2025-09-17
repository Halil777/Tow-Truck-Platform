import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { fetchOrders, type Order } from '../api/client';

const STATUS_COLORS: Record<string, 'gray' | 'green' | 'red' | 'blue' | 'yellow'> = {
  PENDING: 'yellow',
  ASSIGNED: 'blue',
  IN_PROGRESS: 'blue',
  AWAITING_PAYMENT: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const PAYMENT_COLORS: Record<string, 'gray' | 'green' | 'red' | 'yellow'> = {
  SUCCESS: 'green',
  PENDING: 'yellow',
  FAILED: 'red',
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELLED'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | string;

type OrderRow = Order & { payment?: { status?: PaymentStatus } };

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [driverId, setDriverId] = useState('');

  const queryParams = useMemo(() => {
    const params: { status?: string; driverId?: number } = {};
    if (status && status !== 'ALL') params.status = status;
    if (driverId && Number(driverId) > 0) params.driverId = Number(driverId);
    return Object.keys(params).length ? params : undefined;
  }, [status, driverId]);

  const orders = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => fetchOrders(queryParams),
  });

  const amountFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }, [i18n.language]);

  const formatAmount = useCallback((value: number | undefined | null) => {
    if (value == null) return '—';
    return amountFormatter.format(value);
  }, [amountFormatter]);

  const formatDate = useCallback((value: string) => {
    try {
      return new Date(value).toLocaleString(i18n.language);
    } catch {
      return value;
    }
  }, [i18n.language]);

  const formatStatusLabel = useCallback(
    (value: string) => t(`ordersPage.statusLabels.${value}`, { defaultValue: value }),
    [t]
  );

  const formatPaymentLabel = useCallback(
    (value: PaymentStatus) => t(`ordersPage.paymentStatus.${value}`, { defaultValue: value }),
    [t]
  );

  const locationFallback = t('ordersPage.locationFallback');

  const formatLocation = useCallback((loc: any) => {
    if (!loc) return locationFallback;
    if (typeof loc === 'string') {
      const trimmed = loc.trim();
      return trimmed.length ? trimmed : locationFallback;
    }
    const candidates = [
      loc.label,
      loc.name,
      loc.title,
      loc.description,
      loc.address,
      loc.placeName,
      loc.displayName,
      loc.locationName,
      loc.formattedAddress,
      [loc.street, loc.houseNumber].filter(Boolean).join(' '),
      [loc.street, loc.city].filter(Boolean).join(', '),
      [loc.city, loc.region].filter(Boolean).join(', '),
    ]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (candidates.length > 0) {
      return candidates[0];
    }

    const lat = loc.lat ?? loc.latitude;
    const lng = loc.lng ?? loc.longitude;
    if (lat != null && lng != null) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        return `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
      }
    }

    return locationFallback;
  }, [locationFallback]);

  const columns = useMemo(() => [
    { header: t('ordersPage.table.id'), key: 'id' },
    {
      header: t('ordersPage.table.user'),
      key: 'user',
      render: (o: OrderRow) => {
        const user = o.user || {};
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        return name || user.username || user.phone || '—';
      },
    },
    {
      header: t('ordersPage.table.driver'),
      key: 'driver',
      render: (o: OrderRow) => o.driver?.name || '—',
    },
    {
      header: t('ordersPage.table.status'),
      key: 'status',
      render: (o: OrderRow) => (
        <Badge color={STATUS_COLORS[o.status] || 'gray'}>{formatStatusLabel(o.status)}</Badge>
      ),
    },
    {
      header: t('ordersPage.table.created'),
      key: 'createdAt',
      render: (o: OrderRow) => formatDate(o.createdAt),
    },
    {
      header: t('ordersPage.table.price'),
      key: 'price',
      render: (o: OrderRow) => formatAmount(o.price),
    },
    {
      header: t('ordersPage.table.payment'),
      key: 'payment',
      render: (o: OrderRow) => {
        const statusValue = o.payment?.status;
        if (!statusValue) return '—';
        return (
          <Badge color={PAYMENT_COLORS[statusValue] || 'gray'}>
            {formatPaymentLabel(statusValue)}
          </Badge>
        );
      },
    },
    {
      header: t('ordersPage.table.pickup'),
      key: 'pickupLocation',
      render: (o: OrderRow) => formatLocation(o.pickupLocation),
    },
    {
      header: t('ordersPage.table.dropoff'),
      key: 'dropoffLocation',
      render: (o: OrderRow) => formatLocation(o.dropoffLocation),
    },
  ], [t, formatAmount, formatDate, formatLocation, formatPaymentLabel, formatStatusLabel]);

  return (
    <div className="stack">
      <h2>{t('ordersPage.title')}</h2>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="stack">
          <span className="text-sm">{t('ordersPage.filters.status')}</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {t(`ordersPage.filters.statusOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="stack">
          <span className="text-sm">{t('ordersPage.filters.driverId')}</span>
          <input
            className="input"
            type="number"
            min={0}
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            placeholder={t('ordersPage.filters.driverPlaceholder')}
          />
        </label>
        <button className="button" onClick={() => orders.refetch()} disabled={orders.isFetching}>
          {orders.isFetching ? t('ordersPage.actions.refreshing') : t('ordersPage.actions.refresh')}
        </button>
      </div>

      {orders.isLoading && <div className="muted">{t('ordersPage.messages.loading')}</div>}
      {orders.isError && <div className="text-red-600">{t('ordersPage.messages.error')}</div>}

      {orders.data && (
        <Table<OrderRow> data={orders.data} columns={columns as any} pageSize={10} />
      )}
    </div>
  );
}

