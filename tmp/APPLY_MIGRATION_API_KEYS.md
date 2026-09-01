# Aplicar migration: api_keys + webhook_endpoints

Migration: `supabase/migrations/20260901010000_create_api_keys_webhook_endpoints.sql`

**Área sensível (schema/RLS em produção) — aplicar só com aprovação explícita, conforme CLAUDE.md.**

## Opção 1 — Supabase CLI

```bash
supabase db push
```

## Opção 2 — SQL Editor do Supabase Dashboard

Copiar o conteúdo do arquivo de migration acima e rodar direto no SQL Editor do projeto.

## Depois de aplicar

1. Regerar os tipos (o arquivo `src/integrations/supabase/types.ts` é gerado, não editar à mão):
   ```bash
   supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts
   ```
2. Depois de regerado, migrar `src/services/integrations.ts` de `untypedFrom("api_keys"/"webhook_endpoints")` de volta para `supabase.from(...)` tipado (comentário no próprio arquivo já indica isso).
3. Testar no app: Configurações → Integrações → API Settings → criar uma chave "Teste Fix 01", conferir que aparece, copia e revoga/deleta. Repetir para Webhooks.
