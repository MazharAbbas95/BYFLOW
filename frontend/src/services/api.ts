import axios from 'axios';

const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

const backendUrl = import.meta.env.VITE_API_URL || (isProduction ? 'https://byflow.onrender.com' : '');
export const api = axios.create({
  baseURL: backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bayflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const currentShopId = localStorage.getItem('bayflow_shop_id');
  if (currentShopId) {
    config.headers['x-shop-id'] = currentShopId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);
