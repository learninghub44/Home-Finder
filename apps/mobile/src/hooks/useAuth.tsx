import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toFriendlyAuthError } from "@/lib/errors";
import type { Profile, UserRole } from "@/types/database";

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True only while the initial session is being restored on app launch. */
  isInitializing: boolean;
  /** True while a specific auth action (login/signup/etc.) is in flight. */
  isSubmitting: boolean;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<AuthResult>;
  signIn: (params: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // Non-fatal: the user is still authenticated even if the profile fetch
      // fails transiently. Screens should handle a null profile gracefully.
      console.warn("Failed to load profile:", error.message);
      return;
    }
    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setIsInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ fullName, email, password, role }) => {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
          },
        });
        if (error) return { success: false, error: toFriendlyAuthError(error) };
        return { success: true };
      } catch (err) {
        return { success: false, error: toFriendlyAuthError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async ({ email, password }) => {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { success: false, error: toFriendlyAuthError(error) };
        return { success: true };
      } catch (err) {
        return { success: false, error: toFriendlyAuthError(err) };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "homefinder://reset-password",
      });
      if (error) return { success: false, error: toFriendlyAuthError(error) };
      return { success: true };
    } catch (err) {
      return { success: false, error: toFriendlyAuthError(err) };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const value = useMemo(
    () => ({
      session,
      profile,
      isInitializing,
      isSubmitting,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [
      session,
      profile,
      isInitializing,
      isSubmitting,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
