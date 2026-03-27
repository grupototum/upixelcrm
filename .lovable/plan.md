

## Plano: Corrigir problemas na aba de Automações

### Problema raiz
A tabela `automations` **nao existe** no banco de dados. Todas as operacoes (SELECT, INSERT, DELETE) retornam 404 com `PGRST205: Could not find the table 'public.automations'`. Isso causa o erro "Erro ao criar fluxo" e impede qualquer funcionalidade na aba de Automacoes Complexas.

Alem disso, o console mostra um warning de ref em `ComplexTab` (componente funcional recebendo ref do Radix Tabs).

### Alteracoes

**1. Criar tabela `automations` no banco de dados (migracao SQL)**

```sql
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL DEFAULT 'c1',
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  trigger_type text,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to automations"
  ON public.automations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**2. Remover type assertions `(supabase.from as any)` no AppContext**

Apos a migracao, os tipos serao regenerados automaticamente e incluirao a tabela `automations`. As chamadas `(supabase.from as any)("automations")` serao substituidas por `supabase.from("automations")` com tipagem correta.

**3. Corrigir warning de ref no ComplexTab**

Envolver o componente `ComplexTab` com `React.forwardRef` para resolver o warning do Radix Tabs.

### Resultado esperado
- Criar, listar, editar e excluir automacoes complexas funcionara sem erros
- O builder de fluxos abrira corretamente apos criar um novo fluxo
- Warning de ref eliminado do console

