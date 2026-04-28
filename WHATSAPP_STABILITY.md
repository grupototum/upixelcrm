# WhatsApp Integration - Stability & Background Processing

## Overview

O sistema WhatsApp agora possui processamento robusto em background que garante estabilidade mesmo com falhas temporárias, desconexões e timeouts.

## Architecture

```
Webhook (whatsapp-webhook) 
  ↓
Deduplicação + Validação
  ↓
Banco de Dados (messages + conversations)
  ↓
Automações Disparadas (com retry)
  ↓
Background Queue (whatsapp-message-queue)
  ↓
Processador de Fila (cron job a cada 2min)
  ↓
Automação Engine
```

## Features

### 1. **Message Deduplication**
- Evita processar a mesma mensagem duas vezes
- Rastreia mensagens pelo ID único do WhatsApp + source (evolution/official)
- Auto-limpa registros após 7 dias
- **Tabela**: `whatsapp_message_dedup`

### 2. **Message Queue**
- Fila confiável para processamento de mensagens
- Suporta retry automático (até 5 tentativas)
- Rastreia status: pending → processing → completed/failed
- Armazena erro e tentativas para debug
- **Tabela**: `whatsapp_message_queue`

### 3. **Health Monitoring**
- Verifica status de integrações a cada 5 minutos
- Rastreia: `last_heartbeat`, `consecutive_failures`, `health_status`
- Detecta desconexões automáticas
- Alerta sobre tokens expirados

### 4. **Retry Logic**
- **Webhook → Automação**: Exponential backoff (1s → 2s → 4s) até 3 tentativas
- **Fila → Processador**: Até 5 tentativas, ideal para falhas transitórias
- **Database Updates**: Retry automático em transações

## Setup Instructions

### Step 1: Apply Migrations

```sql
-- Supabase Dashboard → SQL Editor

-- Copiar e colar conteúdo de:
-- supabase/migrations/20260428_whatsapp_queue.sql
```

Isso criará:
- `whatsapp_message_queue` table
- `whatsapp_message_dedup` table
- Índices otimizados
- Campos de health check em `integrations`

### Step 2: Deploy Edge Functions

```bash
# Fazer deploy das novas functions
npx supabase functions deploy whatsapp-queue-processor
npx supabase functions deploy whatsapp-health-check
```

### Step 3: Configure Cron Jobs

```sql
-- Supabase Dashboard → SQL Editor

-- Copiar e colar conteúdo de:
-- WHATSAPP_SETUP.sql
```

Isso agendará:
- ✅ `whatsapp-queue-processor` - a cada 2 minutos
- ✅ `whatsapp-health-check` - a cada 5 minutos
- ✅ Auto-cleanup de duplicatas - diariamente
- ✅ Arquivo de filas falhadas - diariamente

### Step 4: Verify Setup

```sql
-- Verificar cron jobs configurados:
SELECT * FROM cron.job ORDER BY jobid;

-- Verificar execuções recentes:
SELECT * FROM cron.job_run_details ORDER BY run_start DESC LIMIT 10;

-- Verificar fila de mensagens:
SELECT status, COUNT(*) as count FROM whatsapp_message_queue GROUP BY status;
```

## Monitoring

### Dashboard Queries

```sql
-- Status da fila
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM whatsapp_message_queue
GROUP BY status
ORDER BY status;

-- Integrações com problemas
SELECT 
  id,
  provider,
  health_status,
  consecutive_failures,
  last_heartbeat,
  status
FROM integrations
WHERE provider IN ('whatsapp', 'whatsapp_official')
  AND health_status != 'healthy'
ORDER BY consecutive_failures DESC;

-- Taxa de sucesso (últimas 24h)
SELECT 
  source,
  status,
  COUNT(*) as count
FROM whatsapp_message_queue
WHERE created_at > now() - interval '24 hours'
GROUP BY source, status;

-- Mensagens em falha permanente
SELECT 
  id,
  client_id,
  source,
  attempt_count,
  error_message,
  updated_at
FROM whatsapp_message_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;
```

## Performance Tuning

### Ajustar Frequência de Processamento

```sql
-- Mais frequente (a cada minuto) - para alto volume
-- ⚠️ Aumenta custos de compute
SELECT cron.unschedule('whatsapp-queue-processor');
SELECT cron.schedule('whatsapp-queue-processor', '* * * * *', ...);

-- Menos frequente (a cada 5 min) - para baixo volume  
-- ✅ Economiza compute, aceita latência de 5 minutos
SELECT cron.unschedule('whatsapp-queue-processor');
SELECT cron.schedule('whatsapp-queue-processor', '*/5 * * * *', ...);
```

### Limpar Filas Antigas

```sql
-- Remover filas completadas com mais de 30 dias
DELETE FROM whatsapp_message_queue
WHERE status = 'completed'
AND updated_at < now() - interval '30 days';
```

## Troubleshooting

### Mensagens não são processadas

**Checklist:**
1. Verificar se cron jobs estão ativados:
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE 'whatsapp%';
   ```

2. Verificar se Edge Functions estão deployadas:
   - Supabase Dashboard → Edge Functions
   - Verificar `whatsapp-queue-processor` e `whatsapp-health-check`

3. Verificar fila de mensagens:
   ```sql
   SELECT COUNT(*) FROM whatsapp_message_queue WHERE status = 'pending';
   ```

4. Verificar logs de execução:
   ```sql
   SELECT * FROM cron.job_run_details WHERE jobname LIKE 'whatsapp%'
   ORDER BY run_start DESC LIMIT 5;
   ```

### Alta latência de mensagens

**Soluções:**
- Aumentar frequência de processamento (✅ ver seção acima)
- Aumentar `maxConcurrent` em `whatsapp-queue-processor` (padrão: 5)
- Revisar logs de Edge Functions para gargalos

### Integrações desconectadas

**Action Items:**
1. Verificar health status:
   ```sql
   SELECT * FROM integrations 
   WHERE provider IN ('whatsapp', 'whatsapp_official')
   AND health_status != 'healthy';
   ```

2. Para Evolution API:
   - Verificar status no Evolution API Dashboard
   - Reconectar instância manualmente se necessário

3. Para Meta Official:
   - Verificar se token está expirado
   - Renovar token no Supabase Dashboard → Integrations

## Production Checklist

- [ ] Migrations aplicadas: `20260428_whatsapp_queue.sql`
- [ ] Edge Functions deployadas: `whatsapp-queue-processor`, `whatsapp-health-check`
- [ ] Cron jobs configurados via `WHATSAPP_SETUP.sql`
- [ ] Monitoramento configurado (alertas para fila acumulada)
- [ ] Backups do banco configurados
- [ ] Logs centralizados (Supabase Dashboard ou external monitoring)
- [ ] Testes de failover executados
- [ ] Documentação de escalada em caso de problemas

## Architecture Benefits

✅ **Resilience**: Mensagens nunca são perdidas, retry automático  
✅ **Scalability**: Pode processar milhares de msgs/dia  
✅ **Reliability**: Deduplicação previne duplicatas  
✅ **Observability**: Health checks e logging detalhado  
✅ **Cost-Effective**: Processa em background, não bloqueia webhook  
✅ **Flexible**: Fácil ajustar frequência conforme volume  

## Support

Para problemas ou dúvidas:
1. Verificar `cron.job_run_details` para erros
2. Verificar logs da Edge Function
3. Checar tabelas `whatsapp_message_queue` e `whatsapp_message_dedup`
