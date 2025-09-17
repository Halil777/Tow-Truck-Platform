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

export const createDriver = async (payload: Partial<Driver>) => {
  const { data } = await api.post<Driver>('/drivers', payload);
  return data;
};

export const updateDriver = async (id: number, payload: Partial<Driver>) => {
  const { data } = await api.patch<Driver>(`/drivers/${id}`, payload);
  return data;
};

export const deleteDriver = async (id: number) => {
  await api.delete(`/drivers/${id}`);
};

export const approveDriver = async (id: number) => {
  const { data } = await api.post<{ message: string }>(`/drivers/${id}/approve`, {});
  return data;
};

export const rejectDriver = async (id: number) => {
  const { data } = await api.post<{ message: string }>(`/drivers/${id}/reject`, {});
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

export const fetchOrders = async (
  params?: { status?: string; driverId?: number }
): Promise<Order[]> => {
  const { data } = await api.get<Order[]>(
    '/orders',
    params ? { params } : undefined
  );
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

export type RevenueTrendsPoint = { date: string; total: number };
export type RevenueTrendsResponse = {
  start: string;
  end: string;
  days: number;
  total: number;
  average: number;
  currency?: string;
  points: RevenueTrendsPoint[];
};

export const fetchRevenueTrends = async (params?: { start?: string; end?: string; days?: number }) => {
  const { data } = await api.get<RevenueTrendsResponse>('/analytics/revenue', params ? { params } : undefined);
  return data;
};

export type DriverActivityItem = {
  driverId: number;
  name: string;
  phone?: string;
  status?: string;
  online: boolean;
  rating?: number | null;
  completed: number;
  inProgress: number;
  assigned: number;
  cancelled: number;
  revenue: number;
};

export type DriverActivityResponse = {
  start: string;
  end: string;
  days: number;
  totalDrivers: number;
  onlineDrivers: number;
  totalCompleted: number;
  totalRevenue: number;
  currency?: string;
  items: DriverActivityItem[];
};

export const fetchDriverActivity = async (params?: { start?: string; end?: string; days?: number; limit?: number }) => {
  const { data } = await api.get<DriverActivityResponse>('/analytics/driver-activity', params ? { params } : undefined);
  return data;
};
