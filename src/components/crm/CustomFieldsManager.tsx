import { useState } from "react";
import { Plus, X, Settings2, Trash2, Edit3, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useCustomFields } from "@/hooks/useCustomFields";
import type { CustomFieldDefinition, CustomFieldType } from "@/types";
import { toast } from "sonner";

export function CustomFieldsManager() {
  const { definitions, loading, createField, updateField, deleteField } = useCustomFields();
  const [open, setOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [newOption, setNewOption] = useState("");

  const resetForm = () => {
    setName("");
    setFieldType("text");
    setIsRequired(false);
    setOptions([]);
    setNewOption("");
    setEditingField(null);
  };

  const handleOpenEdit = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setName(field.name);
    setFieldType(field.field_type);
    setIsRequired(field.is_required);
    setOptions(field.options || []);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    if (["select", "multi_select", "radio"].includes(fieldType) && options.length === 0) {
      toast.error("Adicione pelo menos uma opção para este tipo de campo.");
      return;
    }

    if (editingField) {
      await updateField(editingField.id, {
        name: name.trim(),
        is_required: isRequired,
        options: ["select", "multi_select", "radio"].includes(fieldType) ? options : [],
      });
    } else {
      await createField({
        name: name.trim(),
        field_type: fieldType,
        is_required: isRequired,
        options: ["select", "multi_select", "radio"].includes(fieldType) ? options : [],
      });
    }
    setOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Campos Personalizados</h3>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3 w-3" /> Novo Campo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingField ? "Editar Campo" : "Novo Campo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome do Campo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Renda Mensal" className="h-9" />
              </div>
              
              {!editingField && (
                <div className="space-y-2">
                  <Label className="text-xs">Tipo do Campo *</Label>
                  <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto Curto</SelectItem>
                      <SelectItem value="textarea">Texto Longo</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Seleção Única (Dropdown)</SelectItem>
                      <SelectItem value="multi_select">Seleção Múltipla</SelectItem>
                      <SelectItem value="radio">Seleção Única (Radio)</SelectItem>
                      <SelectItem value="checkbox">Caixa de Seleção (Sim/Não)</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="datetime">Data e Hora</SelectItem>
                      <SelectItem value="link">Link / URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {["select", "multi_select", "radio"].includes(fieldType) && (
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/40">
                  <Label className="text-xs">Opções</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={newOption} 
                      onChange={(e) => setNewOption(e.target.value)} 
                      placeholder="Nova opção..." 
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newOption.trim()) {
                          setOptions([...options, { label: newOption.trim(), value: newOption.trim() }]);
                          setNewOption("");
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      className="h-8"
                      onClick={() => {
                        if (newOption.trim()) {
                          setOptions([...options, { label: newOption.trim(), value: newOption.trim() }]);
                          setNewOption("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                        {opt.label}
                        <button onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="hover:bg-destructive/10 rounded-full p-0.5">
                          <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox id="required" checked={isRequired} onCheckedChange={(c) => setIsRequired(!!c)} />
                <Label htmlFor="required" className="text-xs font-normal">Tornar este campo obrigatório</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Carregando campos...</div>
        ) : definitions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Nenhum campo personalizado criado.</div>
        ) : (
          <div className="divide-y divide-border">
            {definitions.map((field) => (
              <div key={field.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{field.name}</p>
                      {field.is_required && <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive h-4 px-1.5">Obrigatório</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {field.field_type} • slug: {field.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(field)}>
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    if (confirm("Tem certeza que deseja remover este campo? Os dados existentes nos leads não serão apagados, mas o campo não aparecerá mais.")) {
                      deleteField(field.id);
                    }
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
