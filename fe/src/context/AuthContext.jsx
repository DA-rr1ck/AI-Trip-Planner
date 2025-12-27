import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useGoogleLogin } from "@react-oauth/google";
import { Capacitor } from "@capacitor/core";

// ---- Config ----
const LS_KEY = "auth.session";

// ---- Safe localStorage helpers ----
const safeJSON = {
  parse: (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  },
  stringify: (obj) => {
    try { return JSON.stringify(obj); } catch { return null; }
  },
};
const hasWindow = () => typeof window !== "undefined";
function loadSession() {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(LS_KEY);
  return raw ? safeJSON.parse(raw) : null;
}
function saveSession(s) {
  if (!hasWindow()) return;
  const raw = safeJSON.stringify(s);
  if (raw) window.localStorage.setItem(LS_KEY, raw);
}
function clearSession() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(LS_KEY);
}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [initializing, setInitializing] = useState(true);
  const [provider, setProvider] = useState(null);     // 'email' | 'google'
  const [user, setUser] = useState(null);

  // full session payload (for mobile bearer tokens)
  const [session, setSession] = useState(null);

  const [localExpiresAt, setLocalExpiresAt] = useState(null);
  const [googleExpiresAt, setGoogleExpiresAt] = useState(null);
  const [timerArmed, setTimerArmed] = useState(false);
  const expiryTimerRef = useRef(null);

  const abortRef = useRef(false);
  const sessionRef = useRef(null);

  // Keep sessionRef in sync for interceptors
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleHardLogout = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    clearSession();
    setProvider(null);
    setUser(null);
    setSession(null);

    setLocalExpiresAt(null);
    setGoogleExpiresAt(null);
    setTimerArmed(false);
  }, []);

  // Global 401 → clear session
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          handleHardLogout();
          navigate("/");
          toast.error("Session expired. Please sign in again!");
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  // mobile-only request interceptor to send Bearer token
  useEffect(() => {
    if (!Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) {
      return;
    }

    // For native, no need to rely on cookies
    api.defaults.withCredentials = false;

    const id = api.interceptors.request.use((config) => {
      const s = sessionRef.current;
      const accessToken = s?.accessToken;
      if (accessToken) {
        const tokenType = s?.tokenType || "Bearer";
        const headers = config.headers || {};
        // Don't overwrite if caller explicitly set Authorization
        if (!headers.Authorization && !headers.authorization) {
          headers.Authorization = `${tokenType} ${accessToken}`;
        }
        config.headers = headers;
      }
      return config;
    });

    return () => api.interceptors.request.eject(id);
  }, []);

  // Bootstrap session from localStorage
  useEffect(() => {
    (async () => {
      const saved = loadSession();

      if (saved?.provider === "google" && saved?.user) {
        setProvider("google");
        setUser(saved.user);
        setGoogleExpiresAt(saved.googleExpiresAt ?? null);
      }
      else if (saved?.provider === "email" && saved?.user) {
        setProvider("email");
        setUser(saved.user);
        setLocalExpiresAt(saved.localExpiresAt ?? null);
      }
      else {
        handleHardLogout();
      }

      // restore session payload if present (for native)
      if (saved?.session) {
        setSession(saved.session);
      }

      // arm timer again after bootstrapping
      if (
        (saved?.localExpiresAt && typeof saved.localExpiresAt === "number") ||
        (saved?.googleExpiresAt && typeof saved.googleExpiresAt === "number")
      ) {
        setTimerArmed(true);
      }

      if (!abortRef.current) setInitializing(false);
    })();

    return () => { abortRef.current = true; };
  }, [handleHardLogout]);

  // Expiry-timer effect
  useEffect(() => {
    // clear old timer
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (!timerArmed) return;

    let expiresAt = null;
    if (provider === "google" && googleExpiresAt) {
      expiresAt = googleExpiresAt;
    } else if (provider === "email" && localExpiresAt) {
      expiresAt = localExpiresAt;
    }
    if (!expiresAt) return;

    const EARLY_MS = 60_000; // sign out 60s early to absorb clock skew
    const ms = Math.max(0, expiresAt - Date.now() - EARLY_MS);
    expiryTimerRef.current = setTimeout(() => {
      handleHardLogout();
      navigate("/");
      toast.error("Session expired. Please sign in again!");
    }, ms);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [timerArmed, provider, googleExpiresAt, localExpiresAt, handleHardLogout]);

  // ---------- CUSTOM (BE) AUTH ----------
  const loginWithPassword = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const u = data.user;

    setUser(u);
    setProvider("email");

    // capture session payload (for native)
    const sessionPayload = data.session ?? null;
    setSession(sessionPayload);

    const expiration = typeof data.session.expiresAt === "number" ? data.session.expiresAt : null;
    setLocalExpiresAt(expiration);
    setTimerArmed(true)

    saveSession({
      provider: "email",
      user: u,
      localExpiresAt: expiration,
      session: sessionPayload,
    });

    return u;
  }, []);

  const register = useCallback(async ({ username, email, phone, password }) => {
    try {
      const res = await api.post("/auth/register", { username, email, phone, password });

      if (res.status === 201) return loginWithPassword(email, password);
    } catch (err) {
      const code = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (code === 409) {
        toast.error(msg || "Something went wrong, please check again!");
        throw err;
      }
      throw err;
    }
  }, [loginWithPassword]);

  // ---------- GOOGLE (FE-ONLY) AUTH ----------
  const googleImplicitLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse?.access_token;
      if (!accessToken) return;

      // Send token to BE. BE will: verify/fetch Google profile, upsert user, set session cookie
      // and return a session.accessToken (for mobile)
      const { data } = await api.post("/auth/google", { accessToken });
      const u = data.user;

      setUser(u);
      setProvider("google");

      const sessionPayload = data.session ?? null;
      setSession(sessionPayload);

      const expiration = typeof data.session.expiresAt === "number" ? data.session.expiresAt : null;
      setGoogleExpiresAt(expiration);
      setTimerArmed(true);

      saveSession({
        provider: "google",
        user: u,
        googleExpiresAt: expiration,
        session: sessionPayload,
      });

      toast.success("Signed in!");
    },
    onError: () => { },
    scope: "openid email profile",
  });

  const loginWithGoogle = useCallback(() => {
    googleImplicitLogin();
  }, [googleImplicitLogin]);

  // ---------- LOGOUT ----------
  const logout = useCallback(async () => {
    try {
      // clear server session cookie
      await api.post("/auth/logout").catch(() => { });
      navigate('/');
      toast.info('Signed out!');
    } finally {
      // clear local state + token
      handleHardLogout();
    }
  }, [handleHardLogout]);

  const value = useMemo(() => {
    const isEmail = provider === "email";
    const isGoogle = provider === "google";
    const isAuthenticated = !!user;

    return {
      // state
      initializing,
      provider,
      isAuthenticated,
      isEmail,
      isGoogle,
      user,
      session,

      // deps
      api,

      // actions
      loginWithPassword,
      register,
      loginWithGoogle,
      logout,
    };
  }, [
    initializing, provider, user, session,
    loginWithPassword, register, loginWithGoogle, logout,
  ]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
