import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar
} from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDriverByPhone, fetchDriverOrders, acceptOrder, rejectOrder, completeOrder, payOrder } from './src/api';

const CANCELLED_STATUSES = new Set(['REJECTED', 'CANCELLED', 'CANCELED']);
const PAID_STATUSES = new Set(['PAID', 'COMPLETED', 'SETTLED']);
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CURRENCY_SYMBOL = '₽';

export default function App() {
  const [driver, setDriver] = useState(null);
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const actions = useDriverActions(driver || {}, setOrders);

  useEffect(() => {
    (async () => {
      const storedPhone = await AsyncStorage.getItem('driverPhone');
      if (storedPhone) {
        setPhone(storedPhone);
        tryLogin(storedPhone);
      }
    })();
  }, []);

  const tryLogin = async (p) => {
    setError('Водитель с этим номером не найден');
    try {
      const trimmedPhone = p.trim();
      const d = await fetchDriverByPhone(trimmedPhone);
      setDriver(d);
      setActiveTab('orders');
      await AsyncStorage.setItem('driverPhone', trimmedPhone);
      const list = await fetchDriverOrders(d.id);
      setOrders(list);
      const s = io(getSocketUrl(), { query: { driverId: d.id }, transports: ['websocket'] });
      s.on('connect', () => console.log('socket connected'));
      s.on('order.assigned', (order) => {
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      });
      s.on('order.updated', (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.id ? { ...o, status: payload.status } : o)));
      });
      setSocket(s);
    } catch (e) {
      setError('Водитель с этим номером не найден');
    }
  };

  const logout = async () => {
    setDriver(null);
    setOrders([]);
    setActiveTab('orders');
    if (socket) socket.disconnect();
    setSocket(null);
    await AsyncStorage.removeItem('driverPhone');
  };

  const stats = useMemo(() => {
    let cancelled = 0;
    let paid = 0;
    orders.forEach((order) => {
      if (CANCELLED_STATUSES.has(order.status)) cancelled += 1;
      if (PAID_STATUSES.has(order.status)) paid += 1;
    });
    return { total: orders.length, cancelled, paid };
  }, [orders]);

  if (!driver) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.authContent}>
          <Text style={styles.authTitle}>Вход для водителя</Text>
          <TextInput
            placeholder="Номер телефона"
            placeholderTextColor="#64748b"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={() => tryLogin(phone)}>
            <Text style={styles.primaryButtonText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Водитель</Text>
            <Text style={styles.driverName}>{driver.name}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <View style={styles.iconBellContainer}>
              <View style={styles.iconBellBody} />
              <View style={styles.iconBellBase} />
              <View style={styles.iconBellClapper} />
            </View>
            <View style={styles.iconBadge} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Заказы</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>История</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'orders' && <Text style={styles.subtitle}>Назначенные и недавние заказы</Text>}

        {activeTab === 'orders' ? (
          <FlatList
            style={styles.list}
            data={orders}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Заказ №{item.id}</Text>
                  <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    {formatStatus(item.status)}
                  </Text>
                </View>
                <Text style={styles.meta}>Создан: {formatDate(item.createdAt)}</Text>
                <Text style={styles.meta}>Подача: {formatLocation(item.pickupLocation)}</Text>
                <Text style={styles.meta}>Высадка: {formatLocation(item.dropoffLocation)}</Text>
                <OrderActions order={item} actions={actions} />
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyState}>Заказов пока нет</Text>}
          />
        ) : (
          <HistoryCalendar orders={orders} />
        )}
      </View>
      <View style={styles.bottomBar}>
        <View style={[styles.bottomItem, styles.bottomItemSpacing]}>
          <Text style={styles.bottomLabel}>Заказы</Text>
          <Text style={styles.bottomValue}>{stats.total}</Text>
        </View>
        <View style={[styles.bottomItem, styles.bottomItemSpacing]}>
          <Text style={styles.bottomLabel}>Отменено</Text>
          <Text style={styles.bottomValue}>{stats.cancelled}</Text>
        </View>
        <View style={[styles.bottomItem, styles.bottomItemSpacing]}>
          <Text style={styles.bottomLabel}>Оплачено</Text>
          <Text style={styles.bottomValue}>{stats.paid}</Text>
        </View>
        <TouchableOpacity style={[styles.bottomItem, styles.logoutButton]} onPress={logout}>
          <Text style={styles.bottomLabel}>Аккаунт</Text>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getSocketUrl = () => {
  try {
    const cfg = require('./app.json');
    return cfg.expo?.extra?.SOCKET_URL || 'http://172.27.80.1:3000';
  } catch {
    return 'http://172.27.80.1:3000';
  }
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1120' },
  authContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  authTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '700', marginBottom: 24 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    color: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  primaryButtonText: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  error: { color: '#f87171', marginBottom: 16 },
  wrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { color: '#94a3b8', fontSize: 14 },
  driverName: { color: '#f8fafc', fontSize: 24, fontWeight: '700' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    position: 'relative'
  },
  iconBellContainer: { alignItems: 'center', justifyContent: 'center' },
  iconBellBody: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderColor: '#f8fafc',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6
  },
  iconBellBase: { width: 12, height: 2, backgroundColor: '#f8fafc', borderRadius: 1, marginTop: 2 },
  iconBellClapper: { width: 4, height: 4, backgroundColor: '#f8fafc', borderRadius: 2, marginTop: 2 },
  iconBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#111827' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#f8fafc' },
  subtitle: { color: '#94a3b8', marginBottom: 12, fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingBottom: 140 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 12
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  statusBadge: {
    color: '#0b1120',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999
  },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  emptyState: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
  amount: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginTop: 12 },
  actionRow: { flexDirection: 'row', marginTop: 16 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionText: { color: '#f8fafc', fontWeight: '600' },
  acceptButton: { backgroundColor: '#22c55e', marginRight: 12 },
  rejectButton: { backgroundColor: '#ef4444' },
  progressButton: { backgroundColor: '#38bdf8' },
  cashButton: { backgroundColor: '#16a34a', marginRight: 12 },
  cardButton: { backgroundColor: '#6366f1' },
  historyContainer: { flex: 1 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  calendarNavText: { color: '#f8fafc', fontSize: 18, fontWeight: '600' },
  calendarTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  calendarSummary: { color: '#94a3b8', marginBottom: 12, fontSize: 14 },
  weekDaysRow: { flexDirection: 'row', marginBottom: 8 },
  weekDayCell: { flex: 1, alignItems: 'center' },
  weekDayText: { color: '#64748b', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  calendarCell: {
    width: '14.2857%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    minHeight: 76,
    backgroundColor: '#0f172a'
  },
  calendarCellCurrent: { backgroundColor: '#111827' },
  calendarCellOutside: { opacity: 0.35 },
  calendarCellToday: { borderColor: '#6366f1' },
  calendarCellDate: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  calendarCellAmount: { color: '#22c55e', fontSize: 12, marginTop: 6, fontWeight: '600' },
  calendarEmpty: { color: '#64748b', textAlign: 'center', marginTop: 16, fontSize: 13 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: '#1f2937'
  },
  bottomItem: { flex: 1, alignItems: 'center' },
  bottomItemSpacing: { marginRight: 12 },
  bottomLabel: { color: '#64748b', fontSize: 12, marginBottom: 4, letterSpacing: 1 },
  bottomValue: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14
  },
  logoutText: { color: '#f87171', fontSize: 16, fontWeight: '700' }
});

function formatLocation(loc) {
  if (!loc) return '—';
  if (typeof loc === 'string') {
    const trimmed = loc.trim();
    return trimmed.length ? trimmed : '—';
  }

  const stringParts = [
    loc.label,
    loc.name,
    loc.title,
    loc.description,
    loc.address,
    loc.placeName,
    loc.displayName,
    loc.locationName,
    loc.formattedAddress,
    loc.city,
    loc.region,
    loc.district,
    loc.state,
    loc.province,
    loc.country,
    loc.street,
    loc.streetName,
    [loc.street, loc.houseNumber].filter(Boolean).join(' '),
    [loc.street, loc.city].filter(Boolean).join(', '),
    [loc.city, loc.region].filter(Boolean).join(', '),
    [loc.district, loc.city].filter(Boolean).join(', '),
    [loc.region, loc.country].filter(Boolean).join(', ')
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  const uniqueParts = [...new Set(stringParts)];
  if (uniqueParts.length > 0) {
    return uniqueParts[0];
  }

  const containers = [
    loc,
    loc.location,
    loc.coordinates,
    loc.coordinate,
    loc.position,
    loc.point,
    loc.geo,
    loc.geometry,
    loc.latLng,
    loc.latlng,
    loc.center,
    loc.location?.coordinates,
    loc.geometry?.coordinates,
    Array.isArray(loc.coordinates) ? loc.coordinates : null,
    Array.isArray(loc.geometry?.coordinates) ? loc.geometry.coordinates : null,
    Array.isArray(loc) ? loc : null
  ].filter(Boolean);

  const latKeys = ['lat', 'latitude', 'Lat', 'Latitude', 'y'];
  const lngKeys = ['lng', 'lon', 'long', 'longitude', 'Lng', 'Longitude', 'x'];
  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  let lat = null;
  let lng = null;

  for (const container of containers) {
    if (Array.isArray(container) && container.length >= 2) {
      const first = toNumber(container[0]);
      const second = toNumber(container[1]);
      if (first != null && second != null) {
        const firstLooksLat = Math.abs(first) <= 90;
        const secondLooksLat = Math.abs(second) <= 90;
        if (!firstLooksLat && secondLooksLat) {
          lng = lng ?? first;
          lat = lat ?? second;
        } else if (firstLooksLat && !secondLooksLat) {
          lat = lat ?? first;
          lng = lng ?? second;
        } else {
          lat = lat ?? first;
          lng = lng ?? second;
        }
      }
    }

    if (typeof container === 'object' && container !== null && !Array.isArray(container)) {
      for (const key of latKeys) {
        if (lat != null) break;
        if (container[key] != null) {
          const value = toNumber(container[key]);
          if (value != null) lat = value;
        }
      }

      for (const key of lngKeys) {
        if (lng != null) break;
        if (container[key] != null) {
          const value = toNumber(container[key]);
          if (value != null) lng = value;
        }
      }
    }

    if (lat != null && lng != null) break;
  }

  if (lat != null && lng != null) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  if (lat != null) {
    return lat.toFixed(5);
  }
  if (lng != null) {
    return lng.toFixed(5);
  }

  return 'Место не указано';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return String(value);
  }
}

const STATUS_LABELS = {
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'Выполняется',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  PAID: 'Оплачен',
  COMPLETED: 'Завершен',
  REJECTED: 'Отклонен',
  CANCELLED: 'Отменен',
  CANCELED: 'Отменен'
};

function formatStatus(status) {
  if (!status) return 'Неизвестно';
  return STATUS_LABELS[status] || status;
}

function getStatusColor(status) {
  const palette = {
    ASSIGNED: '#6366f1',
    IN_PROGRESS: '#38bdf8',
    AWAITING_PAYMENT: '#facc15',
    PAID: '#22c55e',
    COMPLETED: '#22c55e',
    REJECTED: '#ef4444',
    CANCELLED: '#ef4444',
    CANCELED: '#ef4444'
  };
  return palette[status] || '#334155';
}

function OrderActions({ order, actions }) {
  if (order.status === 'ASSIGNED') {
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => actions.onAccept(order.id)}>
          <Text style={styles.actionText}>Принять</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => actions.onReject(order.id)}>
          <Text style={styles.actionText}>Отклонить</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (order.status === 'IN_PROGRESS') {
    return (
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.progressButton]}
          onPress={() => actions.onComplete(order.id)}
        >
          <Text style={styles.actionText}>Завершить</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (order.status === 'AWAITING_PAYMENT') {
    return (
      <View>
        <Text style={styles.amount}>Сумма: {formatAmount(order.price)}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, styles.cashButton]} onPress={() => actions.onPay(order.id, 'CASH')}>
            <Text style={styles.actionText}>Наличные</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cardButton]} onPress={() => actions.onPay(order.id, 'CARD')}>
            <Text style={styles.actionText}>Карта</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return null;
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toFixed(2)} ${CURRENCY_SYMBOL}`;
}

function useDriverActions(driver, setOrders) {
  const onAccept = async (orderId) => {
    const updated = await acceptOrder(orderId, driver.id);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  };
  const onReject = async (orderId) => {
    const updated = await rejectOrder(orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  };
  const onComplete = async (orderId) => {
    const { order } = await completeOrder(orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
  };
  const onPay = async (orderId, method) => {
    const { order } = await payOrder(orderId, method);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
  };
  return { onAccept, onReject, onComplete, onPay };
}

function HistoryCalendar({ orders }) {
  const [referenceDate, setReferenceDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const totalsByDay = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      if (!PAID_STATUSES.has(order.status)) return;
      const price = Number(order.price);
      if (!Number.isFinite(price) || price <= 0) return;
      const rawDate = order.completedAt || order.paidAt || order.updatedAt || order.createdAt;
      if (!rawDate) return;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return;
      if (parsed.getFullYear() !== referenceDate.getFullYear() || parsed.getMonth() !== referenceDate.getMonth()) return;
      const key = createDayKey(parsed);
      map[key] = (map[key] || 0) + price;
    });
    return map;
  }, [orders, referenceDate]);

  const monthTotal = useMemo(() => Object.values(totalsByDay).reduce((sum, value) => sum + value, 0), [totalsByDay]);
  const calendarDays = useMemo(() => createCalendarDays(referenceDate), [referenceDate]);

  const goPrevMonth = () => {
    setReferenceDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setReferenceDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <View style={styles.historyContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity style={styles.calendarNavButton} onPress={goPrevMonth}>
          <Text style={styles.calendarNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>{formatMonthTitle(referenceDate)}</Text>
        <TouchableOpacity style={styles.calendarNavButton} onPress={goNextMonth}>
          <Text style={styles.calendarNavText}>›</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.calendarSummary}>Заработок за месяц: {formatAmount(monthTotal)}</Text>
      <View style={styles.weekDaysRow}>
        {WEEK_DAYS.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => {
          const total = totalsByDay[day.key] || 0;
          return (
            <View
              key={day.key}
              style={[
                styles.calendarCell,
                day.inCurrentMonth ? styles.calendarCellCurrent : styles.calendarCellOutside,
                day.isToday && styles.calendarCellToday
              ]}
            >
              <Text style={styles.calendarCellDate}>{day.date.getDate()}</Text>
              {total > 0 && <Text style={styles.calendarCellAmount}>{formatAmount(total)}</Text>}
            </View>
          );
        })}
      </View>
      {monthTotal === 0 && <Text style={styles.calendarEmpty}>Нет оплаченных заказов в этом месяце</Text>}
    </View>
  );
}

function createDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createCalendarDays(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - startOffset);
  const today = new Date();
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    days.push({
      key: createDayKey(current),
      date: current,
      inCurrentMonth: current.getMonth() === month,
      isToday: isSameDay(current, today)
    });
  }
  return days;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_NAMES_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь'
];

function formatMonthTitle(date) {
  try {
    const formatted = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    return capitalizeFirst(formatted);
  } catch {
    const monthName = MONTH_NAMES_RU[date.getMonth()] || '';
    return `${capitalizeFirst(monthName)} ${date.getFullYear()}`;
  }
}

function capitalizeFirst(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}






