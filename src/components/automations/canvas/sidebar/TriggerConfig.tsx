import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TriggerConfigProps {
  configType: string;
  keywords: string;
  onConfigTypeChange: (v: string) => void;
  onKeywordsChange: (v: string) => void;
}

export function TriggerConfig({ configType, keywords, onConfigTypeChange, onKeywordsChange }: TriggerConfigProps) {
  const isMessageTrigger = configType.startsWith('message_received');

  return (
    <>
      <Label>Tipo de Gatilho (Trigger)</Label>
      <Select value={configType} onValueChange={onConfigTypeChange}>
        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="new_lead">Novo Lead Cadastrado</SelectItem>
          <SelectItem value="status_change">Mudança de Etapa de Funil</SelectItem>
          <SelectItem value="tag_added">Tag Adicionada ao Cliente</SelectItem>
          <SelectItem value="field_changed">Campo Personalizado Alterado</SelectItem>
          <SelectItem value="message_received">📩 Mensagem Recebida (Qualquer Canal)</SelectItem>
          <SelectItem value="message_received_whatsapp">💬 Mensagem via WhatsApp</SelectItem>
          <SelectItem value="message_received_instagram">📸 Mensagem via Instagram</SelectItem>
          <SelectItem value="message_received_email">📧 Mensagem via Email</SelectItem>
          <SelectItem value="message_received_webchat">🌐 Mensagem via Webchat</SelectItem>
        </SelectContent>
      </Select>

      {isMessageTrigger && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <Label className="text-xs">Palavras-chave (opcional)</Label>
          <Input
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            placeholder="Ex: oi, orçamento, preço"
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Separe por vírgula. Deixe vazio para disparar com qualquer mensagem.
          </p>
        </div>
      )}
    </>
  );
}
