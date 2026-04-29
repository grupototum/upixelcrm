import { useEffect, useMemo, useState } from "react";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/types";

type Role = AuthUser["role"];

// Default fallback used while the DB matrix loads
const DEFAULT_MATRIX: Record<string, Role[]> = {
  // CRM
  "crm.view": ["supervisor", "atendente", "vendedor"],
  "crm.edit": ["supervisor", "vendedor"],
  "crm.delete": ["supervisor"],
  "crm.export": ["supervisor", "vendedor"],
  "crm.transfer": ["supervisor"],

  // Lead sensitive data
  "lead.view_sensitive": ["supervisor"],
  "lead.change_category": ["supervisor"],

  // Inbox
  "inbox.view": ["supervisor", "atendente", "vendedor"],
  "inbox.reply": ["supervisor", "atendente"],

  // Tasks
  "tasks.view": ["supervisor", "atendente", "vendedor"],
  "tasks.create": ["supervisor", "atendente", "vendedor"],
  "tasks.delete": ["supervisor"],

  // Automations
  "automations.view": ["supervisor"],
  "automations.edit": ["supervisor"],

  // Reports
  "reports.view": ["supervisor"],

  // Users
  "users.view": ["supervisor"],
  "users.manage": ["supervisor"],

  // Intelligence
  "intelligence.view": ["supervisor", "vendedor"],

  // Settings
  "settings.view": ["supervisor"],
};

const MODULE_PERMISSIONS: Record<string, string> = {
  "/": "crm.view",
  "/crm": "crm.view",
  "/inbox": "inbox.view",
  "/tasks": "tasks.view",
  "/automations": "automations.view",
  "/reports": "reports.view",
  "/users": "users.view",
  "/intelligence": "intelligence.view",
  "/campaigns": "crm.view",
  "/integrations": "settings.view",
  "/import": "crm.edit",
};

// Module-level cache so the matrix is fetched once per session
let cachedMatrix: Record<string, Role[]> | null = null;
let cacheLoading: Promise<Record<string, Role[]>> | null = null;
const subscribers = new Set<(m: Record<string, Role[]>) => void>();

async function loadMatrix(): Promise<Record<string, Role[]>> {
  if (cachedMatrix) return cachedMatrix;
  if (cacheLoading) return cacheLoading;
  cacheLoading = (async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission");
    if (error || !data) {
      cachedMatrix = { ...DEFAULT_MATRIX };
      return cachedMatrix;
    }
    const map: Record<string, Role[]> = {};
    for (const row of data as Array<{ role: Role; permission: string }>) {
      if (!map[row.permission]) map[row.permission] = [];
      if (!map[row.permission].includes(row.role)) map[row.permission].push(row.role);
    }
    // Merge with defaults so unknown permissions still resolve sanely
    cachedMatrix = { ...DEFAULT_MATRIX, ...map };
    return cachedMatrix;
  })();
  const result = await cacheLoading;
  cacheLoading = null;
  return result;
}

export function refreshPermissionMatrix() {
  cachedMatrix = null;
  return loadMatrix().then((m) => {
    subscribers.forEach((cb) => cb(m));
    return m;
  });
}

export function usePermissions() {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<Record<string, Role[]>>(
    cachedMatrix || DEFAULT_MATRIX
  );

  useEffect(() => {
    let mounted = true;
    if (!cachedMatrix) {
      loadMatrix().then((m) => {
        if (mounted) setMatrix(m);
      });
    }
    const cb = (m: Record<string, Role[]>) => {
      if (mounted) setMatrix(m);
    };
    subscribers.add(cb);
    return () => {
      mounted = false;
      subscribers.delete(cb);
    };
  }, []);

  return useMemo(() => {
    const role = user?.role;

    const hasPermission = (permission: string): boolean => {
      if (!role) return false;
      if (role === "master") return true;
      const allowed = matrix[permission];
      return allowed ? allowed.includes(role) : false;
    };

    const canAccessModule = (path: string): boolean => {
      if (!role) return false;
      if (role === "master") return true;
      const basePath = "/" + (path.split("/").filter(Boolean)[0] || "");
      const permission = MODULE_PERMISSIONS[basePath] || MODULE_PERMISSIONS[path];
      if (!permission) return true;
      return hasPermission(permission);
    };

    const canEditLeadCategory = (category: Lead["category"]): boolean => {
      if (!role) return false;
      if (role === "master" || role === "supervisor") return true;
      if (category === "collaborator") return false;
      if (category === "partner") return role === "vendedor";
      return hasPermission("crm.edit");
    };

    return { hasPermission, canAccessModule, canEditLeadCategory, role, matrix };
  }, [user, matrix]);
}

export { DEFAULT_MATRIX as PERMISSION_MATRIX };
