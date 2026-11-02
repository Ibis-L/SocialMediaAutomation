"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

// Create a configured axios instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Important for sending/receiving HttpOnly cookies
});

if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Setup Axios interceptors
  useEffect(() => {
    const requestIntercept = api.interceptors.request.use((config) => {
      config.baseURL = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseIntercept = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error?.config;

        if (error?.response?.status === 401 && !originalRequest?._retry) {
          // Do not attempt refresh on login or refresh calls
          if (
            originalRequest.url?.includes('/api/auth/login/') ||
            originalRequest.url?.includes('/api/auth/refresh/')
          ) {
            return Promise.reject(error);
          }

          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const res = await api.post('/api/auth/refresh/');
            const newAccessToken = res.data.access;
            localStorage.setItem('access_token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem('access_token');
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
            if (pathname !== '/login' && pathname !== '/register' && pathname !== '/download') {
              router.push('/login');
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestIntercept);
      api.interceptors.response.eject(responseIntercept);
    };
  }, [router, pathname]);

  // Initial check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (!token && pathname !== '/login' && pathname !== '/register' && pathname !== '/download') {
        try {
          const res = await api.post('/api/auth/refresh/');
          localStorage.setItem('access_token', res.data.access);
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
          const meRes = await api.get('/api/auth/me/');
          setUser({ active: true, ...meRes.data });
        } catch {
          router.push('/login');
        }
      } else if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const meRes = await api.get('/api/auth/me/');
          setUser({ active: true, ...meRes.data });
        } catch {
          router.push('/login');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login/', { username, password });
    const accessToken = res.data.access;
    localStorage.setItem('access_token', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    const meRes = await api.get('/api/auth/me/');
    const userData = { active: true, ...meRes.data };
    setUser(userData);

    const groups = userData.groups || [];
    if (groups.includes("Super Admin")) {
      router.push('/');
    } else if (groups.includes("Editor")) {
      router.push('/editorial-approval');
    } else if (groups.includes("Publisher")) {
      router.push('/dashboard/compose');
    } else {
      router.push('/news-management');
    }
  };

  const register = async (username, email, password, role) => {
    const res = await api.post('/api/auth/register/', { username, email, password, role });
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  };

  const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/download';

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {!loading && (user || isPublicRoute) ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
