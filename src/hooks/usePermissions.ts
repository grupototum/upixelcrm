import { useMemo } from "react";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import type { Lead } from "@/types";

// Permission matrix: which roles can do what
const PERMISSION_MATRIX: Record<string, AuthUser["role"][]> = {
  // CRM
  "crm.view": ["supervisor", "atendente", "vendedor"],
  "crm.edit": ["supervisor", "vendedor"],
  "crm.delete": ["supervisor"],
  "crm.export": ["supervisor", "vendedor"],
  "crm.transfer": ["supervisor"],

  // Lead sensitive data (financial fields, value)
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

// Module access mapping
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

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role;

    const hasPermission = (permission: string): boolean => {
      if (!role) return false;
      if (role === "master") return true;
      const allowed = PERMISSION_MATRIX[permission];
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

    /**
     * Returns true if the current user may edit fields on a lead
     * with the given category.
     * - collaborator leads: only supervisor/master can edit
     * - partner leads: supervisor/master/vendedor can edit
     * - regular leads: anyone with crm.edit
     */
    const canEditLeadCategory = (category: Lead["category"]): boolean => {
      if (!role) return false;
      if (role === "master" || role === "supervisor") return true;
      if (category === "collaborator") return false;
      if (category === "partner") return role === "vendedor";
      return hasPermission("crm.edit");
    };

    return { hasPermission, canAccessModule, canEditLeadCategory, role };
  }, [user]);
}

export { PERMISSION_MATRIX };
