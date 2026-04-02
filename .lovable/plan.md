

## Adicionar WhatsApp Oficial no seletor do Inbox (sem alterar integração)

### O que será feito

1. **Adicionar `whatsapp_official` no modal "Nova Conversa"**
   - Novo `SelectItem` com label "WhatsApp Oficial" no seletor de canal
   - Mostrar campo telefone quando `whatsapp_official` for selecionado (mesmo comportamento do `whatsapp`)

2. **Adicionar `whatsapp_official` no filtro de canais da lista de conversas**
   - Adicionar botão de filtro "WA Oficial" na barra de filtros (linha 237) junto com os canais existentes

3. **Registrar `whatsapp_official` nos mapas de configuração**
   - `channelColors`: adicionar cor para `whatsapp_official` (verde diferenciado)
   - `channelLabels`: adicionar label "WA Oficial"
   - `channelIcons`: adicionar ícone (Shield, já importado no ReplyBox)

4. **Mostrar indicador de canal no ReplyBox mesmo com 1 conversa**
   - Remover condição `sourceConversations.length > 1` para sempre exibir o badge do canal ativo (informativo quando há apenas 1)

### Arquivos modificados
- `src/pages/InboxPage.tsx` — mapas de canal, filtro, modal nova conversa
- `src/components/inbox/ReplyBox.tsx` — sempre mostrar indicador de canal

### Nenhuma alteração em
- `whatsapp-proxy` / `whatsapp-webhook` (mantém Evolution API)
- `useWhatsAppIntegration` (sem mudanças)
- `WhatsAppPage.tsx` (configuração permanece igual)

