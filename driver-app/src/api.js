import axios from 'axios';

const getBaseURL = () => {
  try {
    const cfg = require('../app.json');
    return cfg.expo?.extra?.API_BASE_URL || 'http://localhost:3000/api';
  } catch {
    return 'http://localhost:3000/api';
  }
};

const api = axios.create({ baseURL: getBaseURL() });

export const fetchDriverByPhone = async (phone) => {
  const { data } = await api.get(`/drivers/by-phone/${encodeURIComponent(phone)}`);
  return data;
};

export const fetchDriverOrders = async (driverId) => {
  const { data } = await api.get('/orders', { params: { driverId } });
  return data;
};

export const acceptOrder = async (orderId, driverId) => {
  const { data } = await api.post(`/orders/${orderId}/accept`, { driverId });
  return data;
};

export const rejectOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/reject`, {});
  return data;
};

export const completeOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/complete`, {});
  return data;
};

export const payOrder = async (orderId, method) => {
  const { data } = await api.post(`/orders/${orderId}/pay`, { method });
  return data;
};

export default api;
