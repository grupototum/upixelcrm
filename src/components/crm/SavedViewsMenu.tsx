import { useState } from "react";
import { Bookmark, BookmarkPlus, Check, Trash2, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { resolveClientId } from "@/lib/tenant-utils";
import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import type { CRMFilters } from "./FilterPopover";

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
  user_id: string | null;
}

interface SavedViewsMenuProps {
  filters: CRMFilters;
  onApply: (f: CRMFilters) => void;
}

/** Views do CRM do tenant atual. RLS já filtra próprias + compartilhadas. */
async function listSavedViews(clientId: string): Promise<SavedView[]> {
  const { data, error } = await untypedFrom("saved_views")
    .select("id, name, filters, is_shared, user_id")
    .eq("client_id", clientId)
    .eq("scope", "crm")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as SavedView[]) ?? [];
}

async function createSavedView(row: {
  client_id: string;
  tenant_id: string | null;
  name: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await untypedFrom("saved_views")
    .insert({ ...row, scope: "crm", user_id: auth.user?.id });
  if (error) throw error;
}

async function deleteSavedView(id: string): Promise<void> {
  const { error } = await untypedFrom("saved_views").delete().eq("id", id);
  if (error) throw error;
}

export function SavedViewsMenu({ filters, onApply }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);
  const queryClient = useQueryClient();

  const { data: views = [] } = useQuery<SavedView[]>({
    queryKey: ["saved-views", clientId],
    queryFn: async () => (clientId ? listSavedViews(clientId).catch(() => []) : []),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-views", clientId] });

  const handleSave = async () => {
    if (!clientId || !name.trim()) return;
    setSaving(true);
    try {
      await createSavedView({
        client_id: clientId,
        tenant_id: tenant?.id && tenant.id !== "master" ? tenant.id : null,
        name: name.trim(),
        filters: filters as unknown as Record<string, unknown>,
        is_shared: shared,
      });
      setName("");
      setShared(false);
      await refresh();
      toast.success("Visão salva");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar visão");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (view: SavedView) => {
    onApply(view.filters as unknown as CRMFilters);
    setAppliedId(view.id);
    setOpen(false);
  };

  const handleDelete = async (view: SavedView) => {
    try {
      await deleteSavedView(view.id);
      if (appliedId === view.id) setAppliedId(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir visão");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Bookmark className="h-3.5 w-3.5" />
          Visões
          {views.length > 0 && (
            <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[10px]">{views.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="max-h-64 overflow-y-auto">
          {views.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhuma visão salva ainda.
            </p>
          ) : (
            views.map((view) => (
              <div key={view.id} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary group">
                <button className="flex-1 min-w-0 text-left" onClick={() => handleApply(view)}>
                  <span className="flex items-center gap-1.5 text-xs font-medium truncate">
                    {appliedId === view.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                    {view.name}
                    {view.is_shared && <Users className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </span>
                </button>
                {view.user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(view)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[hsl(var(--border-strong))] p-3 space-y-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">
            Salvar filtros atuais
          </Label>
          <Input
            className="h-8 text-xs"
            placeholder="Ex: Leads quentes do Meta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Compartilhar com a equipe</Label>
            <Switch checked={shared} onCheckedChange={setShared} />
          </div>
          <Button
            size="sm"
            className="w-full h-8 gap-1.5 text-xs"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Salvar visão
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
