import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_blocked: boolean;
}

/**
 * Lista usuários do mesmo tenant/organização para uso em seletores de atribuição.
 * Retorna apenas usuários ativos (não bloqueados).
 * Se organizationId é fornecido, filtra por organização em vez de tenant.
 */
export function useTenantUsers(organizationId?: string | null) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = tenant?.id || user?.tenant_id || null;
  const isMaster = user?.role === "master";
  const userOrgId = organizationId || user?.organization_id;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, name, email, role, is_blocked")
      .eq("is_blocked", false)
      .order("name", { ascending: true });

    if (userOrgId) {
      query = query.eq("organization_id", userOrgId);
    } else if (!isMaster && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setUsers(data as TenantUser[]);
    }
    setLoading(false);
  }, [tenantId, isMaster, userOrgId]);

  useEffect(() => {
    if (tenantId || isMaster || userOrgId) fetchUsers();
  }, [tenantId, isMaster, userOrgId, fetchUsers]);

  const findById = useCallback(
    (id?: string | null) => users.find((u) => u.id === id),
    [users]
  );

  const displayName = useCallback(
    (id?: string | null) => {
      if (!id) return null;
      const u = users.find((x) => x.id === id);
      return u?.name || null;
    },
    [users]
  );

  return { users, loading, refetch: fetchUsers, findById, displayName };
}
