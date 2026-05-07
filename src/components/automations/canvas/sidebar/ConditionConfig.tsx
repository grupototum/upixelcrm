import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, GitMerge } from 'lucide-react';
import { useCustomFields } from '@/hooks/useCustomFields';

export interface ConditionRule {
  type: string;
  operator?: string;
  value?: string;
}

export interface ConditionGroup {
  operator: 'and' | 'or';
  rules: ConditionRule[];
}

interface ConditionConfigProps {
  /** Flat rules (legacy) or full condition groups */
  conditions: ConditionRule[];
  conditionOperator: 'and' | 'or';
  onConditionsChange: (conditions: ConditionRule[]) => void;
  onOperatorChange: (op: 'and' | 'or') => void;
  /** Nested groups — new format */
  groups?: ConditionGroup[];
  onGroupsChange?: (groups: ConditionGroup[]) => void;
}

const baseConditionTypes = [
  { value: 'has_phone', label: 'Lead possui Celular?', needsValue: false },
  { value: 'has_email', label: 'Lead possui Email?', needsValue: false },
  { value: 'has_tag', label: 'Lead possui Tag X?', needsValue: true },
  { value: 'message_contains', label: 'Mensagem contém texto', needsValue: true },
  { value: 'message_equals', label: 'Mensagem é exatamente', needsValue: true },
  { value: 'message_starts_with', label: 'Mensagem começa com', needsValue: true },
  { value: 'message_channel', label: 'Canal da mensagem é', needsValue: true },
];

const OPERATORS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'not_equals', label: 'Diferente de' },
  { value: 'contains', label: 'Contém' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'is_not_empty', label: 'Não está vazio' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
];

function RuleEditor({
  rule,
  conditionTypes,
  onUpdate,
  onRemove,
}: {
  rule: ConditionRule;
  conditionTypes: typeof baseConditionTypes;
  onUpdate: (updates: Partial<ConditionRule>) => void;
  onRemove: () => void;
}) {
  const meta = conditionTypes.find((t) => t.value === rule.type);

  return (
    <div className="border border-border rounded-md p-2.5 bg-secondary/30 space-y-2 relative group">
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>

      <Select value={rule.type} onValueChange={(v) => onUpdate({ type: v, value: '' })}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Tipo de condição..." />
        </SelectTrigger>
        <SelectContent>
          {conditionTypes.map((ct) => (
            <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(meta as any)?.operator && (
        <Select value={rule.operator || 'equals'} onValueChange={(v) => onUpdate({ operator: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Operador..." />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {meta?.needsValue && rule.type === 'message_channel' ? (
        <Select value={rule.value || ''} onValueChange={(v) => onUpdate({ value: v })}>
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
      ) : meta?.needsValue && rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' ? (
        <Input
          value={rule.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Digite o valor..."
          className="h-8 text-xs"
        />
      ) : null}
    </div>
  );
}

function GroupEditor({
  group,
  groupIndex,
  conditionTypes,
  onUpdate,
  onRemove,
}: {
  group: ConditionGroup;
  groupIndex: number;
  conditionTypes: typeof baseConditionTypes;
  onUpdate: (g: ConditionGroup) => void;
  onRemove: () => void;
}) {
  const addRule = () => onUpdate({ ...group, rules: [...group.rules, { type: '', value: '' }] });

  const updateRule = (i: number, updates: Partial<ConditionRule>) => {
    const rules = group.rules.map((r, idx) => idx === i ? { ...r, ...updates } : r);
    onUpdate({ ...group, rules });
  };

  const removeRule = (i: number) => onUpdate({ ...group, rules: group.rules.filter((_, idx) => idx !== i) });

  return (
    <div className="border border-[hsl(var(--border-strong))] rounded-lg p-3 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="w-3.5 h-3.5 text-primary/60" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Grupo {groupIndex + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Select value={group.operator} onValueChange={(v) => onUpdate({ ...group, operator: v as 'and' | 'or' })}>
            <SelectTrigger className="w-24 h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">Todas (E)</SelectItem>
              <SelectItem value="or">Qualquer (OU)</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={onRemove}
            className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-2 pl-2">
        {group.rules.map((rule, i) => (
          <RuleEditor
            key={i}
            rule={rule}
            conditionTypes={conditionTypes}
            onUpdate={(updates) => updateRule(i, updates)}
            onRemove={() => removeRule(i)}
          />
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={addRule} className="w-full h-7 text-[10px] gap-1 border border-dashed border-[hsl(var(--border-strong))]">
        <Plus className="w-3 h-3" /> Adicionar Condição
      </Button>
    </div>
  );
}

export function ConditionConfig({
  conditions,
  conditionOperator,
  onConditionsChange,
  onOperatorChange,
  groups,
  onGroupsChange,
}: ConditionConfigProps) {
  const { definitions } = useCustomFields();

  const conditionTypes = [
    ...baseConditionTypes,
    ...definitions.map((def) => ({
      value: `custom.${def.slug}`,
      label: `Campo: ${def.name}`,
      needsValue: true,
      operator: true,
    })),
  ];

  // ── Nested-groups mode ─────────────────────────────────────
  if (groups !== undefined && onGroupsChange) {
    const topOperator: 'and' | 'or' = conditionOperator;

    const addGroup = () =>
      onGroupsChange([...groups, { operator: 'and', rules: [{ type: '', value: '' }] }]);

    const updateGroup = (i: number, g: ConditionGroup) =>
      onGroupsChange(groups.map((grp, idx) => idx === i ? g : grp));

    const removeGroup = (i: number) =>
      onGroupsChange(groups.filter((_, idx) => idx !== i));

    return (
      <>
        <div className="flex items-center justify-between">
          <Label>Grupos de Condições</Label>
          <Select value={topOperator} onValueChange={(v) => onOperatorChange(v as 'and' | 'or')}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">Entre Grupos: E</SelectItem>
              <SelectItem value="or">Entre Grupos: OU</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 mt-2">
          {groups.map((group, i) => (
            <GroupEditor
              key={i}
              group={group}
              groupIndex={i}
              conditionTypes={conditionTypes as typeof baseConditionTypes}
              onUpdate={(g) => updateGroup(i, g)}
              onRemove={() => removeGroup(i)}
            />
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addGroup} className="w-full mt-2 gap-1 text-xs">
          <GitMerge className="w-3.5 h-3.5" /> Adicionar Grupo
        </Button>
      </>
    );
  }

  // ── Flat legacy mode ───────────────────────────────────────
  const addCondition = () => onConditionsChange([...conditions, { type: '', value: '' }]);
  const removeCondition = (index: number) => onConditionsChange(conditions.filter((_, i) => i !== index));
  const updateCondition = (index: number, updates: Partial<ConditionRule>) =>
    onConditionsChange(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));

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
        {conditions.map((condition, index) => (
          <RuleEditor
            key={index}
            rule={condition}
            conditionTypes={conditionTypes as typeof baseConditionTypes}
            onUpdate={(updates) => updateCondition(index, updates)}
            onRemove={() => removeCondition(index)}
          />
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} className="w-full mt-2 gap-1 text-xs">
        <Plus className="w-3.5 h-3.5" /> Adicionar Condição
      </Button>
    </>
  );
}
