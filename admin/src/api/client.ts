import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return api(original);
      }
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw error;
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        if (data?.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
        }
        pendingQueue.forEach((fn) => fn());
        pendingQueue = [];
        return api(original);
      } catch (e) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.assign("/login");
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export const login = async (email: string, password: string) => {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return data;
};

// other API helpers
export const fetchBotInfo = async () => {
  const { data } = await api.get("/bot-info");
  return data;
};

export type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  telegramId?: string;
  role?: string;
  suspended?: boolean;
  createdAt?: string;
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>("/users");
  return data;
};

export const suspendUser = async (id: number) => {
  const { data } = await api.post(`/users/${id}/suspend`);
  return data;
};

export const unsuspendUser = async (id: number) => {
  const { data } = await api.post(`/users/${id}/unsuspend`);
  return data;
};

// --- Drivers ---
export type Driver = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  online: boolean;
  rating: number;
  completedOrders: number;
};

export const fetchDrivers = async (): Promise<Driver[]> => {
  const { data } = await api.get<Driver[]>('/drivers');
  return data;
};

// --- Orders ---
export type Order = {
  id: number;
  user: any;
  driver?: any;
  status: string;
  createdAt: string;
  pickupLocation?: any;
  dropoffLocation?: any;
};

export const fetchOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>('/orders');
  return data;
};

// --- Payments ---
export type Payment = { id: number; amount: number; status: string; createdAt: string };
export const fetchPayments = async (): Promise<Payment[]> => {
  const { data } = await api.get<Payment[]>('/payments');
  return data;
};

// --- Analytics ---
export type Summary = {
  activeOrders: number;
  completedOrders: number;
  totalDrivers: number;
  onlineDrivers: number;
  registeredUsers: number;
  dailyRevenue: number;
};
export const fetchSummary = async (): Promise<Summary> => {
  const { data } = await api.get<Summary>('/analytics/summary');
  return data;
};
