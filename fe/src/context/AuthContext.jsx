import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";

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

// ---- Normalize Google user ----
function normalizeGoogleUser(info) {
  return {
    id: info.sub,
    name: info.name || info.given_name || info.email || "Google User",
    email: info.email || null,
    avatar: info.picture || null,
    provider: "google",
  };
}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [provider, setProvider] = useState(null);   // 'local' | 'google'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);         // BE JWT (local)
  const [googleAccessToken, setGoogleAccessToken] = useState(null);

  const abortRef = useRef(false);

  // Attach/detach BE token to axios
  useEffect(() => {
    if (provider === "local" && token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [provider, token]);

  // Global 401 → clear session
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          // token invalid/expired
          handleHardLogout();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const handleHardLogout = useCallback(() => {
    clearSession();
    setProvider(null);
    setUser(null);
    setToken(null);
    setGoogleAccessToken(null);
  }, []);

  // Bootstrap session from localStorage
  useEffect(() => {
    (async () => {
      const saved = loadSession();
      if (!saved) {
        setInitializing(false);
        return;
      }

      setProvider(saved.provider || null);
      setUser(saved.user || null);
      setToken(saved.token || null);
      setGoogleAccessToken(saved.googleAccessToken || null);

      try {
        if (saved.provider === "local" && saved.token) {
          api.defaults.headers.common.Authorization = `Bearer ${saved.token}`;
          const { data } = await api.get("/auth/me"); // { user }
          const u = { ...data.user, provider: "local" };
          setUser(u);
          saveSession({ ...saved, user: u });
        } 
        else if (saved.provider === "google" && saved.googleAccessToken) {
          const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${saved.googleAccessToken}` },
          });

          if (r.ok) {
            const info = await r.json();
            const u = normalizeGoogleUser(info);
            setUser(u);
            saveSession({ ...saved, user: u });
          } else {
            handleHardLogout();
          }
        }
      } catch {
        handleHardLogout();
      } finally {
        if (!abortRef.current) setInitializing(false);
      }
    })();

    return () => { abortRef.current = true; };
  }, [handleHardLogout]);

  // ---------- CUSTOM (BE) AUTH ----------
  const loginWithPassword = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password }); // { token, user }
    const u = { ...data.user, provider: "local" };
    setProvider("local");
    setToken(data.token);
    setUser(u);
    setGoogleAccessToken(null);
    saveSession({
      provider: "local",
      token: data.token,
      user: u,
      googleAccessToken: null,
    });
    return u;
  }, []);

  const register = useCallback(async ({ email, password, displayName }) => {
    await api.post("/auth/register", { email, password, displayName });
    return loginWithPassword(email, password);
  }, [loginWithPassword]);

  const getProfile = useCallback(async () => {
    if (provider !== "local" || !token) return null;
    const { data } = await api.get("/auth/me"); // { user }
    const u = { ...data.user, provider: "local" };
    setUser(u);
    saveSession((prev => {
      const current = prev || loadSession() || {};
      return { ...current, user: u };
    })(null));
    return u;
  }, [provider, token]);

  // ---------- GOOGLE (FE-ONLY) AUTH ----------
  const googleImplicitLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse?.access_token;
      if (!accessToken) return;

      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;

      const info = await res.json();
      const u = normalizeGoogleUser(info);

      setProvider("google");
      setUser(u);
      setToken(null);
      setGoogleAccessToken(accessToken);

      saveSession({
        provider: "google",
        token: null,
        user: u,
        googleAccessToken: accessToken,
      });

      toast.success('Signed in!')
    },
    onError: () => { },
    scope: "openid email profile",
  });

  const loginWithGoogle = useCallback(() => {
    // FE-only Google auth
    googleImplicitLogin();
  }, [googleImplicitLogin]);

  // ---------- LOGOUT ----------
  const logout = useCallback(async () => {
    try {
      if (provider === "local") {
        await api.post("/auth/logout").catch(() => { });
        toast.info('Signed out!')
      } else if (provider === "google" && googleAccessToken) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `token=${encodeURIComponent(googleAccessToken)}`,
        }).catch(() => { });
        googleLogout?.();
        toast.info('Signed out!')
      }
    } finally {
      handleHardLogout();
    }
  }, [provider, googleAccessToken, handleHardLogout]);

  const value = useMemo(() => {
    const isLocal = provider === "local";
    const isGoogle = provider === "google";
    const isAuthenticated = !!user;

    return {
      // state
      initializing,
      provider,
      isAuthenticated,
      isLocal,
      isGoogle,
      user,
      token,
      googleAccessToken,

      // deps
      api,

      // actions
      loginWithPassword,
      register,
      getProfile,
      loginWithGoogle,
      logout,
    };
  }, [
    initializing, provider, user, token, googleAccessToken,
    loginWithPassword, register, getProfile, loginWithGoogle, logout,
  ]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
