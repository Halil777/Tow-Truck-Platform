import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDriverByPhone, fetchDriverOrders, acceptOrder, rejectOrder, completeOrder, payOrder } from './src/api';

export default function App() {
  const [driver, setDriver] = useState(null);
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');
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
    setError('');
    try {
      const d = await fetchDriverByPhone(p.trim());
      setDriver(d);
      await AsyncStorage.setItem('driverPhone', p.trim());
      // Fetch initial orders
      const list = await fetchDriverOrders(d.id);
      setOrders(list);
      // Connect socket
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
      setError('Driver not found for this phone');
    }
  };

  const logout = async () => {
    setDriver(null);
    setOrders([]);
    if (socket) socket.disconnect();
    setSocket(null);
    await AsyncStorage.removeItem('driverPhone');
  };

  if (!driver) {
    return (
      <SafeAreaView style={styles.container}> 
        <Text style={styles.title}>Driver Login</Text>
        <TextInput
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          keyboardType="phone-pad"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.button} onPress={() => tryLogin(phone)}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <Text style={styles.title}>Hello, {driver.name}</Text>
        <TouchableOpacity onPress={logout}><Text style={{ color: '#d00', marginTop: 6 }}>Logout</Text></TouchableOpacity>
      </View>
      <Text style={{ marginBottom: 8, color: '#555' }}>Assigned & recent orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={{ fontWeight: '600' }}>Order #{item.id} — {item.status}</Text>
            <Text style={styles.muted}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.muted}>Pickup: {formatLocation(item.pickupLocation)}</Text>
            <Text style={styles.muted}>Dropoff: {formatLocation(item.dropoffLocation)}</Text>
            <OrderActions order={item} actions={actions} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No orders yet</Text>}
      />
    </SafeAreaView>
  );
}

const getSocketUrl = () => {
  try {
    const cfg = require('./app.json');
    return cfg.expo?.extra?.SOCKET_URL || 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', marginVertical: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginBottom: 8 },
  button: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  card: { width: '100%', borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 10, marginBottom: 12 },
  muted: { color: '#666', marginTop: 2 },
  error: { color: '#d00', marginBottom: 6 }
});

function formatLocation(loc) {
  if (!loc) return '-';
  if (typeof loc === 'string') return loc;
  const name = loc.name || loc.address || '';
  const lat = loc.lat ?? loc.latitude;
  const lng = loc.lng ?? loc.longitude;
  const coord = (lat != null && lng != null) ? `(${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})` : '';
  return [name, coord].filter(Boolean).join(' ');
}

function OrderActions({ order, actions }) {
  if (order.status === 'ASSIGNED') {
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#16a34a', flex: 1 }]} onPress={() => actions.onAccept(order.id)}>
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#dc2626', flex: 1 }]} onPress={() => actions.onReject(order.id)}>
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (order.status === 'IN_PROGRESS') {
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#2563eb', flex: 1 }]} onPress={() => actions.onComplete(order.id)}>
          <Text style={styles.buttonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (order.status === 'AWAITING_PAYMENT') {
    return (
      <View>
        <Text style={{ marginTop: 8, marginBottom: 6 }}>Amount: {order.price?.toFixed(2)} ₽</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#16a34a', flex: 1 }]} onPress={() => actions.onPay(order.id, 'CASH')}>
            <Text style={styles.buttonText}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#2563eb', flex: 1 }]} onPress={() => actions.onPay(order.id, 'CARD')}>
            <Text style={styles.buttonText}>Card</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return null;
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
