import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/client";

type JwtPayload = { user_id: number; email?: string; username?: string; exp: number };
type User = { id: number; email: string; username?: string } | null;

type AuthContextType = {
  user: User;
  isLoading: boolean;
  login: (creds: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>(null as any);

// localStorage keys
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// helpers
function saveTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ----- Axios interceptors (Authorization + refresh) -----
let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

function notifyAll(token: string | null) {
  waiters.forEach((cb) => cb(token));
  waiters = [];
}

// attach Authorization on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// on 401, try refresh once then fail-through
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config || {};
    if (err.response?.status !== 401 || (original as any)._retry) {
      return Promise.reject(err);
    }
    (original as any)._retry = true;

    // if another refresh in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push((newToken) => {
          if (!newToken) return reject(err);
          (original.headers ||= {}).Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) throw new Error("No refresh token");
      const { data } = await api.post("/users/token/refresh/", { refresh });
      const newAccess: string = data.access;
      saveTokens(newAccess); // keep existing refresh
      notifyAll(newAccess);
      (original.headers ||= {}).Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (e) {
      notifyAll(null);
      clearTokens();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

// ----- Provider -----
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  // restore session on load
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) {
      try {
        const dec = jwtDecode<JwtPayload>(token);
        setUser({ id: dec.user_id, email: dec.email ?? "" });
      } catch {
        clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async ({ email, password }: { email: string; password: string }) => {
    const { data } = await api.post("/users/token/", { email, password });
    saveTokens(data.access, data.refresh);
    const dec = jwtDecode<JwtPayload>(data.access);
    setUser({ id: dec.user_id, email: dec.email ?? email });
  };

  const register = async (payload: { email: string; password: string }) => {
    await api.post("/users/register/", payload);
    await login({ email: payload.email, password: payload.password });
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, register, logout }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
