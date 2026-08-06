import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase, setSupabaseAuthTokenGetter } from "@/integrations/supabase/client";
import { setAiStreamTokenGetter } from "@/lib/ai-stream";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

// Minimal shape shared with the rest of the app. Kept compatible with the
// previous Supabase-based context so existing consumers keep working.
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    logout,
  } = useAuth0();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);

  const user = toAuthUser(auth0User);

  // Prefer the Auth0 access token (JWT when an API audience is configured);
  // fall back to the id_token, which is always a JWT and works without an
  // Auth0 API — Supabase third-party auth verifies either as long as the
  // issuer matches the registered Auth0 domain.
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

  // Wire Supabase requests to Auth0 tokens.
  useEffect(() => {
    if (!isAuthenticated) {
      setSupabaseAuthTokenGetter(null);
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

  const signOut = async () => {
    setSupabaseAuthTokenGetter(null);
    setSession(null);
    setProfile(null);
    await logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading: isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
