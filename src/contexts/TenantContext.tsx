/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTenantSubdomain } from "@/utils/tenant";

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  subdomain: string | null;
  isLoading: boolean;
  notFound: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const subdomain = getTenantSubdomain();

  useEffect(() => {
    if (!subdomain) {
      // Domínio raiz — não há tenant a resolver
      setIsLoading(false);
      return;
    }

    async function resolveTenant() {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("subdomain", subdomain)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setTenant(data as Tenant);
      }
      setIsLoading(false);
    }

    resolveTenant();
  }, [subdomain]);

  return (
    <TenantContext.Provider value={{ tenant, subdomain, isLoading, notFound }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
