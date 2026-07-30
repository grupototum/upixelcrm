import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { ensureOwnProfile, getProfileById } from "@/services/users";
import { evaluateProfileAccess } from "@/lib/auth-access";

const SESSION_WAIT_MS = 10000;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { tenant, organization, isLoading } = useTenant();
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    let active = true;
    let settled = false;

    const fail = async (reason: string, signOut: boolean) => {
      if (signOut) await supabase.auth.signOut();
      if (active) navigate(`/login?error=${reason}`, { replace: true });
    };

    const finish = async (userId: string) => {
      try {
        await ensureOwnProfile();
      } catch {
        void 0;
      }
      const profile = await getProfileById(userId);
      if (!profile) {
        await fail("expired", true);
        return;
      }
      const denial = evaluateProfileAccess(profile, tenant, organization);
      if (denial) {
        await fail(denial, true);
        return;
      }
      if (active) navigate("/dashboard", { replace: true });
    };

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    if (url.searchParams.get("error") || hashParams.get("error")) {
      void fail("expired", false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      void fail("expired", false);
    }, SESSION_WAIT_MS);

    const settle = (userId: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      void finish(userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) settle(session.user.id);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) settle(session.user.id);
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [isLoading, tenant, organization, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.06em" }}
        >
          Validando seu acesso...
        </p>
      </div>
    </div>
  );
}
