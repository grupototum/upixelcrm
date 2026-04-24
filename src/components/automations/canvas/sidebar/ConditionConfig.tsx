import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export interface ConditionRule {
  type: string;
  operator?: string;
  value?: string;
}

interface ConditionConfigProps {
  conditions: ConditionRule[];
  conditionOperator: 'and' | 'or';
  onConditionsChange: (conditions: ConditionRule[]) => void;
  onOperatorChange: (op: 'and' | 'or') => void;
}

import { useCustomFields } from '@/hooks/useCustomFields';

const baseConditionTypes = [
  { value: 'has_phone', label: 'Lead possui Celular?', needsValue: false },
  { value: 'has_email', label: 'Lead possui Email?', needsValue: false },
  { value: 'has_tag', label: 'Lead possui Tag X?', needsValue: true },
  { value: 'message_contains', label: 'Mensagem contém texto', needsValue: true },
  { value: 'message_equals', label: 'Mensagem é exatamente', needsValue: true },
  { value: 'message_starts_with', label: 'Mensagem começa com', needsValue: true },
  { value: 'message_channel', label: 'Canal da mensagem é', needsValue: true },
];

export function ConditionConfig({ conditions, conditionOperator, onConditionsChange, onOperatorChange }: ConditionConfigProps) {
  const { definitions } = useCustomFields();
  
  const conditionTypes = [
    ...baseConditionTypes,
    ...definitions.map(def => ({
      value: `custom.${def.slug}`,
      label: `Campo: ${def.name}`,
      needsValue: true,
      operator: true
    }))
  ];
  const addCondition = () => {
    onConditionsChange([...conditions, { type: '', value: '' }]);
  };

  const removeCondition = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<ConditionRule>) => {
    const updated = conditions.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onConditionsChange(updated);
  };

  const getTypeMeta = (type: string) => conditionTypes.find((t) => t.value === type);

  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Condições</Label>
        <Select value={conditionOperator} onValueChange={(v) => onOperatorChange(v as 'and' | 'or')}>
          <SelectTrigger className="w-24 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">Todas (E)</SelectItem>
            <SelectItem value="or">Qualquer (OU)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 mt-2">
        {conditions.map((condition, index) => {
          const meta = getTypeMeta(condition.type);
          return (
            <div key={index} className="border border-border rounded-md p-2.5 bg-secondary/30 space-y-2 relative group">
              <button
                onClick={() => removeCondition(index)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              <Select value={condition.type} onValueChange={(v) => updateCondition(index, { type: v, value: '' })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipo de condição..." />
                </SelectTrigger>
                <SelectContent>
                  {conditionTypes.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {meta?.operator && (
                <Select value={condition.operator || 'equals'} onValueChange={(v) => updateCondition(index, { operator: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Operador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="not_equals">Diferente de</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="is_empty">Está vazio</SelectItem>
                    <SelectItem value="is_not_empty">Não está vazio</SelectItem>
                    <SelectItem value="greater_than">Maior que</SelectItem>
                    <SelectItem value="less_than">Menor que</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {meta?.needsValue && condition.type === 'message_channel' ? (
                <Select value={condition.value || ''} onValueChange={(v) => updateCondition(index, { value: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o canal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="webchat">Webchat</SelectItem>
                  </SelectContent>
                </Select>
              ) : meta?.needsValue && condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' ? (
                <Input
                  value={condition.value || ''}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                  placeholder="Digite o valor..."
                  className="h-8 text-xs"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} className="w-full mt-2 gap-1 text-xs">
        <Plus className="w-3.5 h-3.5" /> Adicionar Condição
      </Button>
    </>
  );
}
