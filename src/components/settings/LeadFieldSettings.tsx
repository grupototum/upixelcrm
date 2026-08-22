import { useState, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useFieldSettings } from "@/hooks/useFieldSettings";
import type { StandardFieldConfig } from "@/types";

function SortableFieldRow({ field, onToggle }: { field: StandardFieldConfig; onToggle: (key: string, enabled: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border bg-card">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{field.label}</span>
      <Switch checked={field.enabled} onCheckedChange={(checked) => onToggle(field.key, checked)} />
    </div>
  );
}

export function LeadFieldSettings() {
  const { fieldConfig, isLoading, saveConfig } = useFieldSettings();
  const [localConfig, setLocalConfig] = useState<StandardFieldConfig[]>(fieldConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalConfig(fieldConfig); }, [fieldConfig]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalConfig((prev) => {
      const oldIndex = prev.findIndex((f) => f.key === active.id);
      const newIndex = prev.findIndex((f) => f.key === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, order: i + 1 }));
    });
  }

  function handleToggle(key: string, enabled: boolean) {
    setLocalConfig((prev) => prev.map((f) => f.key === key ? { ...f, enabled } : f));
  }

  async function handleSave() {
    setSaving(true);
    await saveConfig(localConfig);
    setSaving(false);
  }

  return (
    <div className="px-4">
      <Card className="rounded-card ghost-border bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Campos do Lead</CardTitle>
          <CardDescription className="text-xs">
            Os campos fixos (Nome, Email, Telefone, Status, Responsável) sempre aparecem no formulário.
            Configure quais campos adicionais deseja exibir e em que ordem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localConfig.map((f) => f.key)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {localConfig.map((field) => (
                      <SortableFieldRow key={field.key} field={field} onToggle={handleToggle} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary hover:bg-[#e04400] text-white">
                Salvar configuração
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
