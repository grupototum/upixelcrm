/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getTenantSubdomain } from "@/utils/tenant";

export type Tenant = Tables<"tenants">;
export type Organization = Tables<"organizations">;

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

    // Capturado após os guards acima — aqui é garantidamente string
    const sub: string = subdomain;

    // Erros são engolidos de propósito — mesmo comportamento de sempre:
    // qualquer falha de leitura é tratada como "não encontrado".
    async function resolve() {
      // 1. Tentar resolver como organization (subdomain na tabela organizations)
      const { data: orgData } = await supabase
        .from("organizations").select("*").eq("subdomain", sub).maybeSingle();

      if (orgData?.tenant_id) {
        setOrganization(orgData);

        // Resolver o tenant pai
        const { data: tenantData } = await supabase
          .from("tenants").select("*").eq("id", orgData.tenant_id).eq("is_active", true).maybeSingle();

        if (tenantData) {
          setTenant(tenantData);
        } else {
          // Org existe mas tenant inativo
          setNotFound(true);
        }
        setIsLoading(false);
        return;
      }

      // 2. Fallback: resolver como tenant direto (retrocompatibilidade)
      const { data: tenantData } = await supabase
        .from("tenants").select("*").eq("subdomain", sub).eq("is_active", true).maybeSingle();

      if (!tenantData) {
        setNotFound(true);
      } else {
        setTenant(tenantData);
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
