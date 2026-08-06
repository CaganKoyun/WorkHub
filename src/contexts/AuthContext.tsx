import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0, type Auth0ContextInterface } from "@auth0/auth0-react";
import { supabase, setSupabaseAuthTokenGetter } from "@/integrations/supabase/client";
import { setAiStreamTokenGetter } from "@/lib/ai-stream";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH0_CONFIGURED = Boolean(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

function useAuth0Safe(): Auth0ContextInterface {
  try {
    if (AUTH0_CONFIGURED) return useAuth0();
  } catch {
    // Auth0Provider not in tree
  }
  return {
    user: undefined,
    isAuthenticated: false,
    isLoading: false,
    getAccessTokenSilently: async () => "",
    getIdTokenClaims: async () => undefined,
    loginWithRedirect: async () => {},
    logout: async () => {},
    getAccessTokenWithPopup: async () => "",
    loginWithPopup: async () => {},
    handleRedirectCallback: async () => ({ appState: {} }),
    error: undefined,
  } as unknown as Auth0ContextInterface;
}

function toAuthUser(auth0User: ReturnType<typeof useAuth0>["user"]): AuthUser | null {
  if (!auth0User?.sub) return null;
  return {
    id: auth0User.sub,
    email: auth0User.email,
    user_metadata: {
      full_name: auth0User.name,
      avatar_url: auth0User.picture,
    },
  };
}

function toSupabaseAuthUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: sbUser.id,
    email: sbUser.email,
    user_metadata: {
      full_name: sbUser.user_metadata?.full_name as string | undefined,
      avatar_url: sbUser.user_metadata?.avatar_url as string | undefined,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (AUTH0_CONFIGURED) {
    return <Auth0AuthProvider>{children}</Auth0AuthProvider>;
  }
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
};

// ─── Auth0-based provider (production) ──────────────────────────────────────

function Auth0AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    logout,
  } = useAuth0Safe();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  const user = toAuthUser(auth0User);

  const getSupabaseBearer = useCallback(async (): Promise<string | null> => {
    const hasAudience = Boolean(import.meta.env.VITE_AUTH0_AUDIENCE);
    if (hasAudience) {
      try {
        return await getAccessTokenSilently();
      } catch {
        // fall through to id_token
      }
    }
    try {
      const claims = await getIdTokenClaims();
      return claims?.__raw ?? null;
    } catch {
      return null;
    }
  }, [getAccessTokenSilently, getIdTokenClaims]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSupabaseAuthTokenGetter(null);
      setAiStreamTokenGetter(null);
      setSession(null);
      return;
    }

    setSupabaseAuthTokenGetter(getSupabaseBearer);
    setAiStreamTokenGetter(getSupabaseBearer);

    (async () => {
      const token = await getSupabaseBearer();
      const mapped = toAuthUser(auth0User);
      if (mapped && token) setSession({ access_token: token, user: mapped });
      else setSession(null);
    })();

    return () => {
      setSupabaseAuthTokenGetter(null);
      setAiStreamTokenGetter(null);
    };
  }, [isAuthenticated, getSupabaseBearer, auth0User]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, user?.id, fetchProfile]);

  const signUp = async (_email: string, _password: string, fullName: string) => {
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
        ...(fullName ? { "ext-full_name": fullName } : {}),
      },
    });
  };

  const signIn = async (email: string, _password: string) => {
    await loginWithRedirect({
      authorizationParams: {
        ...(email ? { login_hint: email } : {}),
      },
    });
  };

  const handleSignOut = async () => {
    setSupabaseAuthTokenGetter(null);
    setAiStreamTokenGetter(null);
    setSession(null);
    setProfile(null);
    await logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading: isLoading, signUp, signIn, signOut: handleSignOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Supabase-native provider (e2e / fallback when Auth0 is not configured) ─

function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        const u = toSupabaseAuthUser(s.user);
        setUser(u);
        setSession({ access_token: s.access_token, user: u });
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        const u = toSupabaseAuthUser(s.user);
        setUser(u);
        setSession({ access_token: s.access_token, user: u });
        fetchProfile(s.user.id);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
