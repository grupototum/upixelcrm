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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  tenant_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  organization: Organization | null;
  subdomain: string | null;
  isLoading: boolean;
  notFound: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const subdomain = getTenantSubdomain();

  useEffect(() => {
    if (!subdomain) {
      // Domínio raiz — não há tenant a resolver
      setIsLoading(false);
      return;
    }

    // Subdomínio "master" tem acesso irrestrito — não precisa de registro no banco
    if (subdomain === "master") {
      setTenant({ id: "master", name: "Master", subdomain: "master", plan: "master", owner_id: null, is_active: true, created_at: "", updated_at: "" });
      setIsLoading(false);
      return;
    }

    async function resolve() {
      // 1. Tentar resolver como organization (subdomain na tabela organizations)
      const { data: orgData } = await supabase.from("organizations")
        .select("*")
        .eq("subdomain", subdomain)
        .maybeSingle();

      if (orgData?.tenant_id) {
        setOrganization(orgData as Organization);

        // Resolver o tenant pai
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", orgData.tenant_id)
          .eq("is_active", true)
          .single();

        if (tenantData) {
          setTenant(tenantData as Tenant);
        } else {
          // Org existe mas tenant inativo
          setNotFound(true);
        }
        setIsLoading(false);
        return;
      }

      // 2. Fallback: resolver como tenant direto (retrocompatibilidade)
      const { data: tenantData, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("subdomain", subdomain)
        .eq("is_active", true)
        .single();

      if (error || !tenantData) {
        setNotFound(true);
      } else {
        setTenant(tenantData as Tenant);
      }
      setIsLoading(false);
    }

    resolve();
  }, [subdomain]);

  return (
    <TenantContext.Provider value={{ tenant, organization, subdomain, isLoading, notFound }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
