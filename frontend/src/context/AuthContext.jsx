import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("workhub_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/users/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("workhub_token");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (email, password) => {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    const { data } = await api.post("/api/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("workhub_token", data.access_token);
    setToken(data.access_token);
    setLoading(true);
  };

  const loginWithOtp = async (email, otp) => {
    const { data } = await api.post("/api/auth/login-otp/verify", { email, otp });
    localStorage.setItem("workhub_token", data.access_token);
    setToken(data.access_token);
    setLoading(true);
  };

  const logout = () => {
    localStorage.removeItem("workhub_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      loginWithOtp,
      logout,
      refreshUser: async () => {
        const { data } = await api.get("/api/users/me");
        setUser(data);
      },
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
