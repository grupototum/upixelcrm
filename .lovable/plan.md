

# Plano: Separação de Documentos Internos vs. Documentos de Cliente no RAG

## Problema

A tabela `rag_documents` não diferencia documentos internos da Totum (POPs, SLAs, templates) de documentos de clientes. Não há mecanismo para documentos "globais" acessíveis por todos os agentes mas protegidos contra edição por clientes.

## Solução

Adicionar um flag `is_global` à tabela e ajustar RLS + edge functions para que:
- Documentos globais (`is_global = true`) sejam legíveis por todos os usuários autenticados
- Apenas o master possa criar/editar/deletar documentos globais
- A busca semântica inclua automaticamente documentos globais + documentos do tenant

## Alterações

### 1. Migração SQL

- Adicionar coluna `is_global BOOLEAN DEFAULT false` em `rag_documents`
- Adicionar coluna `is_global BOOLEAN DEFAULT false` em `rag_embeddings`
- Atualizar políticas RLS de SELECT para incluir `OR is_global = true`
- Criar políticas de INSERT/UPDATE/DELETE que bloqueiem clientes de tocar documentos globais
- Atualizar `match_rag_documents` para incluir embeddings globais na busca

### 2. Políticas RLS (lógica)

```text
SELECT: (client_id = get_user_client_id() OR is_master_user() OR is_global = true)
INSERT: (is_global = false AND client_id = get_user_client_id()) OR (is_global = true AND is_master_user())
UPDATE: (is_global = false AND client_id = get_user_client_id()) OR is_master_user()
DELETE: (is_global = false AND client_id = get_user_client_id()) OR is_master_user()
```

### 3. Atualizar `match_rag_documents` RPC

Incluir embeddings onde `is_global = true` além dos filtrados por `p_client_id`.

### 4. Atualizar UI em `RagDocuments.tsx`

- Adicionar toggle "Documento Global" visível apenas para o master
- Exibir badge visual diferenciando docs globais dos do cliente
- Master vê todos; clientes veem os seus + globais (somente leitura nos globais)

### 5. Atualizar Edge Functions

- `rag-search`: incluir docs globais na busca vetorial
- `rag-embed`: permitir master gerar embeddings para docs globais
- `ai-chat`: sem alteração (já usa `match_rag_documents`)

## Detalhes Técnicos

Migração principal:
```sql
ALTER TABLE rag_documents ADD COLUMN is_global boolean NOT NULL DEFAULT false;
ALTER TABLE rag_embeddings ADD COLUMN is_global boolean NOT NULL DEFAULT false;

-- Drop e recriar políticas com a nova lógica
-- Atualizar função match_rag_documents para:
-- WHERE (p_client_id IS NULL OR re.client_id = p_client_id OR re.is_global = true)
```

Arquivos modificados:
- 1 migração SQL
- `src/pages/alexandria/RagDocuments.tsx` (toggle global + badge)
- `supabase/functions/rag-search/index.ts` (incluir globais)
- `supabase/functions/rag-embed/index.ts` (permitir master criar globais)

