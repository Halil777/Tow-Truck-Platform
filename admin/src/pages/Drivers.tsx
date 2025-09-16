import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import {
  fetchDrivers,
  type Driver,
  createDriver,
  updateDriver,
  deleteDriver,
  approveDriver,
  rejectDriver,
  fetchOrders,
  type Order,
} from '../api/client';
import { queryClient } from '../lib/queryClient';

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | Driver['status']>('ALL');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [details, setDetails] = useState<Driver | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Driver | null>(null);

  const drivers = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (drivers.data || []).filter((d) => {
      if (status !== 'ALL' && d.status !== status) return false;
      if (onlyOnline && !d.online) return false;
      if (!term) return true;
      const hay = [d.name, d.phone, d.email].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [drivers.data, search, status, onlyOnline]);

  const columns = useMemo(() => [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Phone', key: 'phone' },
    { header: 'Email', key: 'email' },
    {
      header: 'Status',
      key: 'status',
      render: (d: Driver) => (
        <Badge color={d.status === 'APPROVED' ? 'green' : d.status === 'PENDING' ? 'yellow' : 'red'}>
          {d.status}
        </Badge>
      ),
    },
    {
      header: 'Online',
      key: 'online',
      render: (d: Driver) => (
        <Badge color={d.online ? 'green' : 'gray'}>{d.online ? 'Online' : 'Offline'}</Badge>
      ),
    },
    { header: 'Rating', key: 'rating' },
    { header: 'Completed', key: 'completedOrders' },
    {
      header: 'Actions',
      key: 'actions',
      render: (d: Driver) => (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setDetails(d)}>View</button>
          <button onClick={() => { setEditing(d); setFormOpen(true); }}>Edit</button>
          {d.status !== 'APPROVED' ? (
            <button onClick={() => approve.mutate(d.id)}>Approve</button>
          ) : (
            <button onClick={() => reject.mutate(d.id)}>Reject</button>
          )}
          <button onClick={() => setConfirmDelete(d)} style={{ color: '#dc2626' }}>Delete</button>
        </div>
      )
    }
  ], []);

  const approve = useMutation({
    mutationFn: (id: number) => approveDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
  const reject = useMutation({
    mutationFn: (id: number) => rejectDriver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });
  const createMut = useMutation({
    mutationFn: (payload: Partial<Driver>) => createDriver(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setFormOpen(false);
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Driver> }) => updateDriver(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setFormOpen(false);
      setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setConfirmDelete(null);
    },
  });

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Drivers</h2>
        <div className="row" style={{ gap: 8 }}>
          <button onClick={() => { setEditing(null); setFormOpen(true); }}>+ New Driver</button>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['drivers'] })}>Refresh</button>
        </div>
      </div>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <Input label="Search" placeholder="name, phone, email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="stack">
          <span className="text-sm">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="ALL">All</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
          <span className="text-sm">Only online</span>
        </label>
      </div>

      {drivers.isLoading && <div className="muted">Loading drivers...</div>}
      {drivers.isError && <div className="text-red-600">Failed to load drivers</div>}

      {drivers.data && (
        <Table<Driver> data={filtered} columns={columns as any} pageSize={10} />
      )}

      <DriverFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing || undefined}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={(payload) => {
          if (editing) updateMut.mutate({ id: editing.id, payload });
          else createMut.mutate(payload);
        }}
      />

      <ConfirmDeleteModal
        driver={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        loading={deleteMut.isPending}
      />

      <DriverDetailsModal driver={details} onClose={() => setDetails(null)} />
    </div>
  );
}

function DriverFormModal({
  open,
  onClose,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Driver>;
  submitting?: boolean;
  onSubmit: (payload: Partial<Driver>) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [status, setStatus] = useState<Driver['status']>(initial?.status || 'PENDING');
  const [online, setOnline] = useState<boolean>(initial?.online ?? false);
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);

  // Keep fields in sync if initial changes (edit -> different row)
  useEffect(() => {
    setName(initial?.name || '');
    setPhone(initial?.phone || '');
    setEmail(initial?.email || '');
    setStatus((initial?.status as any) || 'PENDING');
    setOnline(initial?.online ?? false);
    setRating(initial?.rating ?? 0);
  }, [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Driver> = { name, phone, email, status, online, rating };
    onSubmit(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit Driver' : 'New Driver'}
      actions={
        <>
          <button onClick={onClose} disabled={submitting}>Cancel</button>
          <button onClick={submit} disabled={submitting} style={{ marginLeft: 8 }}>{submitting ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="stack" style={{ gap: 10 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="stack">
          <span className="text-sm">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          <span>Online</span>
        </label>
        <Input label="Rating" type="number" step="0.1" min={0} max={5} value={String(rating)} onChange={(e) => setRating(Number(e.target.value))} />
      </form>
    </Modal>
  );
}

function ConfirmDeleteModal({ driver, onCancel, onConfirm, loading }: {
  driver: Driver | null;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal open={!!driver} onClose={onCancel} title="Delete Driver"
      actions={
        <>
          <button onClick={onCancel} disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ color: '#fff', background: '#dc2626', marginLeft: 8 }}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </>
      }
    >
      <p>Are you sure you want to delete driver {driver?.name}?</p>
    </Modal>
  );
}

function DriverDetailsModal({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const driverId = driver?.id;
  const orders = useQuery({
    queryKey: ['orders', { driverId }],
    queryFn: () => fetchOrders(driverId ? { driverId } : undefined),
    enabled: !!driverId,
  });

  const stats = useMemo(() => {
    const list: Order[] = (orders.data as any) || [];
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayCount = list.filter(o => new Date(o.createdAt) >= todayStart).length;
    const completed = list.filter(o => o.status === 'COMPLETED').length;
    // Simple last 7 days histogram
    const days: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const cnt = list.filter(o => {
        const t = new Date(o.createdAt);
        return t >= d && t < next;
      }).length;
      days.push({ date: d.toISOString().slice(0,10), value: cnt });
    }
    return { todayCount, completed, days };
  }, [orders.data]);

  return (
    <Modal open={!!driver} onClose={onClose} title={driver ? `Driver: ${driver.name}` : 'Driver'}>
      {driver && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <Badge color="blue">Phone: {driver.phone}</Badge>
            <Badge color="gray">Email: {driver.email || '-'}</Badge>
            <Badge color={driver.status === 'APPROVED' ? 'green' : driver.status === 'PENDING' ? 'yellow' : 'red'}>
              Status: {driver.status}
            </Badge>
            <Badge color={driver.online ? 'green' : 'gray'}>{driver.online ? 'Online' : 'Offline'}</Badge>
          </div>
          <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="card"><div className="muted">Today Orders</div><h2>{stats.todayCount}</h2></div>
            <div className="card"><div className="muted">Completed Total</div><h2>{stats.completed}</h2></div>
            <div className="card"><div className="muted">Rating</div><h2>{driver.rating.toFixed(1)}</h2></div>
          </div>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Last 7 days</strong>
            </div>
            <MiniBarChart data={stats.days} />
          </div>
          <div className="card">
            <strong>Recent Orders</strong>
            {orders.isLoading ? (
              <div className="muted">Loading...</div>
            ) : (
              <ul className="stack" style={{ marginTop: 8 }}>
                {((orders.data as any) as Order[]).slice(0, 8).map(o => (
                  <li key={o.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>#{o.id} • {o.status}</span>
                    <span className="muted">{new Date(o.createdAt).toLocaleString()}</span>
                  </li>
                ))}
                {(!orders.data || (orders.data as any).length === 0) && <div className="muted">No orders yet</div>}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function MiniBarChart({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 360; const h = 120; const barW = Math.floor(w / Math.max(1, data.length)) - 4;
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

