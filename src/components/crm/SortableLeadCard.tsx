import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Building, Phone, Mail, Tag, Clock, CheckSquare, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSelection } from "@/contexts/SelectionContext";
import type { Lead, Task } from "@/types";
import { formatPhone } from "@/lib/format-phone";
import { bestWhatsAppNumber, waLink } from "@/utils/phone";

/** 2.3: no máximo 3 pills; o resto vira "+N" com tooltip. */
const MAX_VISIBLE_TAGS = 3;

interface ResponsibleUser {
  id: string;
  name: string;
  avatar_url?: string | null;
}

function UserAvatar({ user }: { user?: ResponsibleUser }) {
  if (!user) {
    return (
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
        ?
      </div>
    );
  }
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
          ) : initials}
        </div>
      </TooltipTrigger>
      <TooltipContent>{user.name}</TooltipContent>
    </Tooltip>
  );
}

function NextTask({ task }: { task?: Task }) {
  if (!task) return null;
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;
  return (
    <div className={`flex items-center gap-1 text-xs mb-1.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
      <CheckSquare className="h-3 w-3 shrink-0" />
      <span className="truncate">{task.title}</span>
      {task.due_date && (
        <span className="shrink-0 ml-auto">{isOverdue ? "Vencida" : new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
      )}
    </div>
  );
}

export function SortableLeadCard({ lead, onClick, tagColors, segmentoFieldSlug, responsible, nextTask, lastActivityAt, extraPhones }: {
  lead: Lead;
  onClick: () => void;
  /** name → cor. Buscado uma vez no board; useTags por card faria 1 fetch por lead. */
  tagColors?: Record<string, string>;
  /** Slug do campo customizado "Segmento", quando existir (fallback abaixo). */
  segmentoFieldSlug?: string;
  /** Usuário responsável, resolvido uma vez no board (evita 1 fetch por card). */
  responsible?: ResponsibleUser;
  /** Próxima tarefa pendente do lead, resolvida uma vez no board a partir das tasks já carregadas. */
  nextTask?: Task;
  /** Data da última atividade (timeline), resolvida uma vez no board. */
  lastActivityAt?: string;
  /** Telefones extras (lead_phones) do lead, resolvidos uma vez no board. */
  extraPhones?: Array<{ number: string; category: string }>;
}) {
  // Alguns tenants guardam "Segmento" como campo customizado em vez da coluna
  // nativa leads.segmento (import legado, por ex.) — cai pro customizado
  // quando a coluna nativa vem vazia. Só aceita string: campo customizado
  // pode ser multi_select (array) ou checkbox (boolean), que não cabem
  // numa linha de resumo do card.
  const customSegmento = segmentoFieldSlug ? lead.custom_fields?.[segmentoFieldSlug] : undefined;
  const segmento = lead.segmento || (typeof customSegmento === "string" ? customSegmento : undefined);
  // Telefone extra categoria "whatsapp" vence lead.phone (spec-numeros-secundarios).
  const waNumber = bestWhatsAppNumber(lead.phone, extraPhones);
  const navigate = useNavigate();
  const { selectionMode, isSelected, toggleLead } = useSelection();
  const selected = isSelected(lead.id);

  // Em modo de seleção, desativa DnD: o card vira clique-pra-selecionar.
  // Passamos disabled:true pro useSortable — isso já neutraliza listeners + attributes.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
    disabled: selectionMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.stopPropagation();
      toggleLead(lead.id);
      return;
    }
    onClick();
  };

  return (
    // data-dnd-card: marca a área que o useDragScroll deve ignorar, para
    // arrastar um card não panorâmicar o board junto (2.4).
    <div ref={setNodeRef} data-dnd-card style={style} {...(selectionMode ? {} : attributes)} {...(selectionMode ? {} : listeners)}>
      <div
        onClick={handleCardClick}
        className={`bg-card ghost-border rounded-xl p-3 hover:shadow-sm transition-all group ${
          selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${selected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "hover:border-[hsl(var(--border-strong))]"}`}
      >
        {selectionMode && (
          <div className="flex items-center mb-2">
            <Checkbox
              checked={selected}
              onCheckedChange={() => toggleLead(lead.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
            <span className="text-[10px] text-muted-foreground ml-2">
              {selected ? "Selecionado" : "Clique pra selecionar"}
            </span>
          </div>
        )}
        <div className="flex items-start justify-between mb-1.5">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-foreground truncate">{lead.name}</h4>
            {lead.company && (
              <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {waNumber && (
              <a
                href={waLink(waNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-green-600 p-0.5"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate("/automations", { state: { tab: "time_actions" } });
              }}
              className="text-muted-foreground hover:text-accent p-0.5"
              title="Ações de Tempo"
            >
              <Clock className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {/* 2.3: a linha de empresa saiu do card. Cada linha abaixo só renderiza
            se o campo existir — nada de espaço reservado para campo vazio. */}
        {(lead.phone || lead.email) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            {lead.phone
              ? <><Phone className="h-3 w-3" /> {formatPhone(lead.phone)}</>
              : <><Mail className="h-3 w-3" /> {lead.email}</>}
          </p>
        )}
        {segmento && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Building className="h-3 w-3" /> {segmento}
          </p>
        )}
        {lead.value && (
          <p className="text-xs font-semibold text-primary mb-1.5">
            R$ {lead.value.toLocaleString("pt-BR")}
          </p>
        )}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {lead.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => {
              const color = tagColors?.[tag];
              return (
                <span
                  key={tag}
                  // UIDL da etiqueta no card:
                  //   backgroundColor: rgba(255,81,0,0.1)  -> cor a 10%
                  //   color:           rgba(255,81,0,1)    -> cor cheia
                  //   borderRadius 4px, padding 2px 6px, 10px/500, gap 2px
                  // Sem borda — o pill é só fundo translúcido + texto. O card
                  // usava fundo sólido com texto branco, que destoava tanto do
                  // design quanto do TagsManager.
                  //
                  // Sem cor cadastrada, mantém o fallback em vez de inventar uma.
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${
                    color ? "" : "bg-primary/10 text-primary"
                  }`}
                  style={color ? { backgroundColor: `${color}1a`, color } : undefined}
                >
                  <Tag className="h-2.5 w-2.5" /> {tag}
                </span>
              );
            })}
            {lead.tags.length > MAX_VISIBLE_TAGS && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                title={lead.tags.slice(MAX_VISIBLE_TAGS).join(", ")}
              >
                +{lead.tags.length - MAX_VISIBLE_TAGS}
              </span>
            )}
          </div>
        )}
        <NextTask task={nextTask} />
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/60">
          <UserAvatar user={responsible} />
          {lastActivityAt && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(lastActivityAt), { locale: ptBR, addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DragOverlayCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card border-2 border-primary rounded-xl p-3 shadow-lg w-72 rotate-2">
      <h4 className="text-sm font-medium text-foreground truncate">{lead.name}</h4>
      {lead.company && <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>}
    </div>
  );
}
