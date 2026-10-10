import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Shop, UserRole, NotificationItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentShop: Shop | null;
  shops: Shop[];
  currentRole: UserRole | 'CUSTOMER' | null;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  incomingCall: any | null;
  login: (email: string, password?: string) => Promise<User | void>;
  registerOwner: (data: any) => Promise<void>;
  logout: () => void;
  switchDemoUser: (email: string) => Promise<void>;
  setCurrentShop: (shop: Shop) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearIncomingCall: () => void;
  refreshUserData: () => Promise<void>;
  loadShops: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bayflow_token'));
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShopState] = useState<Shop | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  // Load shops list
  const loadShops = async () => {
    try {
      const res = await api.get('/shops');
      setShops(res.data.shops || []);
      const savedShopId = localStorage.getItem('bayflow_shop_id');
      if (savedShopId) {
        const found = res.data.shops.find((s: Shop) => s.id === savedShopId);
        if (found) setCurrentShopState(found);
      } else if (res.data.shops.length > 0) {
        setCurrentShopState(res.data.shops[0]);
        localStorage.setItem('bayflow_shop_id', res.data.shops[0].id);
      }
    } catch (err) {
      console.error('Failed to load shops', err);
    }
  };

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // ignore
    }
  };

  const refreshUserData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      await loadNotifications();
    } catch (err) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [token]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!user) return;

    let wsUrl: string;
    const isProduction = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (import.meta.env.VITE_WS_URL) {
      wsUrl = import.meta.env.VITE_WS_URL;
    } else if (import.meta.env.VITE_API_URL) {
      try {
        const parsed = new URL(import.meta.env.VITE_API_URL);
        const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProtocol}//${parsed.host}/ws`;
      } catch {
        wsUrl = isProduction ? 'wss://byflow.onrender.com/ws' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
      }
    } else if (isProduction) {
      wsUrl = 'wss://byflow.onrender.com/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'REGISTER',
          userId: user.id,
          shopId: currentShop?.id,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NOTIFICATION_NEW') {
          setNotifications((prev) => [data.notification, ...prev]);
          setUnreadCount((c) => c + 1);
        } else if (data.type === 'INCOMING_CALL') {
          setIncomingCall(data.call);
        } else if (data.type === 'CALL_ENDED') {
          setIncomingCall(null);
        }
      } catch (err) {
        console.error('WS message error', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [user, currentShop]);

  const setCurrentShop = (shop: Shop) => {
    setCurrentShopState(shop);
    localStorage.setItem('bayflow_shop_id', shop.id);
  };

  const login = async (email: string, password = 'password123') => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('bayflow_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoUser = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/demo-switch', { email });
      localStorage.setItem('bayflow_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      // Auto select user's shop if they have membership
      if (res.data.user.memberships && res.data.user.memberships.length > 0) {
        const userShop = shops.find((s) => s.id === res.data.user.memberships[0].shopId);
        if (userShop) setCurrentShop(userShop);
      }
      await loadNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const registerOwner = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register-owner', data);
      localStorage.setItem('bayflow_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bayflow_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  // Determine role in currently selected shop
  let currentRole: UserRole | 'CUSTOMER' | null = null;
  if (user) {
    if (user.role === 'CUSTOMER') {
      currentRole = 'CUSTOMER';
    } else if (user.role === 'OWNER') {
      currentRole = 'OWNER';
    } else if (currentShop) {
      const mem = user.memberships.find((m) => m.shopId === currentShop.id);
      currentRole = mem ? mem.role : null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentShop,
        shops,
        currentRole,
        notifications,
        unreadCount,
        isLoading,
        incomingCall,
        login,
        registerOwner,
        logout,
        switchDemoUser,
        setCurrentShop,
        markNotificationRead,
        markAllNotificationsRead,
        clearIncomingCall,
        refreshUserData,
        loadShops,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
