import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Building, Phone, Mail, User, Tag } from "lucide-react";
import type { Lead } from "@/types";

export function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        onClick={onClick}
        className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all group"
      >
        <div className="flex items-start justify-between mb-1.5">
          <h4 className="text-sm font-medium text-foreground truncate flex-1">{lead.name}</h4>
          <div className="shrink-0 ml-1">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        {lead.company && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Building className="h-3 w-3" /> {lead.company}
          </p>
        )}
        {(lead.phone || lead.email) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            {lead.phone ? <><Phone className="h-3 w-3" /> {lead.phone}</> : <><Mail className="h-3 w-3" /> {lead.email}</>}
          </p>
        )}
        {lead.value && (
          <p className="text-xs font-semibold text-primary mb-1.5">
            R$ {lead.value.toLocaleString("pt-BR")}
          </p>
        )}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {lead.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" /> {tag}
              </span>
            ))}
          </div>
        )}
        {lead.responsible_id && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" /> {lead.responsible_id}
          </div>
        )}
      </div>
    </div>
  );
}

export function DragOverlayCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-lg w-72 rotate-2">
      <h4 className="text-sm font-medium text-foreground truncate">{lead.name}</h4>
      {lead.company && <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>}
    </div>
  );
}
