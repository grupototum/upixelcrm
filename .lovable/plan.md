
## Isolamento de dados por empresa (multi-tenant)

### Contexto
Atualmente todos os usuários compartilham o `client_id = 'c1'`. Precisamos que:
- Usuários pertençam a uma **empresa/organização**
- Dados (leads, conversas, integrações configuráveis, etc.) sejam isolados por empresa
- Usuários da mesma empresa compartilhem dados entre si
- Um usuário **master** tenha acesso a todos os dados
- APIs hardcoded no código permaneçam universais

### Alterações

#### 1. Migração de banco de dados
- Criar tabela `organizations` (id, name, slug, created_at, owner_id)
- Atualizar trigger `handle_new_user` para gerar um `client_id` único por usuário (UUID) ao invés de 'c1'
- Criar função `is_master_user()` para verificar se o usuário é master
- Atualizar `get_user_client_id()` para retornar o client_id do perfil
- Atualizar RLS de **todas as tabelas** para incluir exceção: master pode ver tudo
- Adicionar campo `organization_id` na tabela `profiles` referenciando `organizations`

#### 2. Lógica de empresa compartilhada
- Quando um usuário pertence a uma organização, seu `client_id` = o ID da organização
- Assim todos os membros da mesma org compartilham dados automaticamente via RLS existente
- Usuários sem organização terão `client_id` único (dados isolados)

#### 3. UI - Cadastro de empresa no perfil
- Adicionar seção no ProfilePage para criar/gerenciar empresa
- Permitir convidar membros (por email) para a mesma empresa
- Mostrar membros da empresa

#### 4. Papel Master
- Definir via campo `role = 'master'` no profiles
- RLS permite SELECT em todas as tabelas quando `is_master_user()` retorna true
- Apenas atribuível diretamente no banco (sem UI para se auto-promover)

### Ordem de execução
1. Migration (organizations + RLS + funções)
2. Atualizar código frontend (ProfilePage, contextos)
3. Atualizar trigger de novo usuário
