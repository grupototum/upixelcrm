import { useState, useEffect } from "react";
import { Zap, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  status: string;
}

interface ApprovedTemplatesProps {
  channel?: string;
  onSelect: (templateName: string, content: string) => void;
  disabled?: boolean;
}

export function ApprovedTemplatesPopover({
  channel,
  onSelect,
  disabled,
}: ApprovedTemplatesProps) {
  const { tenant } = useTenant();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Only show for WhatsApp official
  if (channel !== "whatsapp_official") {
    return null;
  }

  const fetchTemplates = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, name, content, category, status")
        .eq("client_id", tenant.id)
        .eq("status", "APPROVED")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTemplates(data as Template[]);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (template: Template) => {
    // Pass template name (not content) — WhatsApp API expects template name
    onSelect(template.name, template.content);
    setSearch("");
  };

  return (
    <Popover onOpenChange={(open) => open && !templates.length && fetchTemplates()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary shrink-0 hover:text-success transition-colors"
          title="Templates aprovados do WhatsApp"
          disabled={disabled}
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-0">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-success" />
            <h3 className="text-sm font-bold text-foreground">Templates Aprovados</h3>
          </div>
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <ScrollArea className="h-[250px]">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {templates.length === 0
                ? "Nenhum template aprovado. Crie um em Integrações → WhatsApp → Templates."
                : "Nenhum resultado para sua busca."}
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="w-full p-3 text-left hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {template.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {template.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-bold">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    <Send className="h-3.5 w-3.5 text-muted-foreground group-hover:text-success shrink-0 mt-0.5 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t bg-card/30 text-[10px] text-muted-foreground text-center">
          Templates aprovados reabrem a conversa sem créditos.
        </div>
      </PopoverContent>
    </Popover>
  );
}
