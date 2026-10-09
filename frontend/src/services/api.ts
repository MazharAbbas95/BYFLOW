import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
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
