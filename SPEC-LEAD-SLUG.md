# Spec — Link amigável `/leads/<slug>`

> Bloco C do prompt `revisao-crm-e-tags.md`. Escopo 🟠 (schema change + backfill). **Só spec.
> Nenhuma migration gerada, nenhum código alterado.** Aguarda Rael decidir se prioriza ou vai
> pro backlog.

## Motivação

Rael quer compartilhar link de um lead (WhatsApp, e-mail) de forma legível — hoje é
`/leads/3f9a1b2c-...` (UUID puro), sem contexto nenhum pra quem recebe o link.

## Schema proposto

```sql
alter table public.leads add column if not exists slug text;
create unique index if not exists leads_slug_unique_idx on public.leads (slug) where slug is not null;
```

`slug` fica **nullable** de propósito — permite backfill gradual (job separado, não na mesma
transação da migration) em vez de travar a tabela toda calculando slug de cada linha na hora do
`ALTER TABLE`. Depois do backfill completo, uma segunda migration torna `not null`.

## Regra de geração do slug

`slugify(lead.name) + '-' + shortHash(lead.id)`. Exemplo: lead "João Silva",
id `3f9a1b2c-...` → `joao-silva-a7f3d2`.

- `slugify`: lowercase, remove acento, troca não-alfanumérico por `-`, colapsa `--` repetido,
  trunca em ~40 chars pra não gerar URL gigante com nomes longos.
- `shortHash`: primeiros 6-8 chars do próprio UUID (ou um hash curto derivado dele) — garante
  unicidade **sem** precisar checar colisão contra a tabela toda a cada insert, já que o UUID de
  origem já é único por definição. Dois leads chamados "João Silva" nunca colidem porque o hash
  vem de UUIDs diferentes.
- Recalcular o slug quando o nome mudar é uma decisão de produto em aberto — recomendação:
  **não recalcular automaticamente** (evita quebrar link já compartilhado); só gerar na criação.

## Backfill de leads existentes

Job separado (não faz parte da migration de schema), rodando em lotes, calculando `slug` para
toda linha com `slug is null`. **Não implementado nesta spec** — só descrito como próximo passo,
porque depende de decidir a função `slugify`/`shortHash` exata em SQL ou via job aplicado por
edge function, e de rodar contra o volume real de `leads` em produção (não medido nesta rodada).

## Rota aceita ambos slug e UUID

```
/leads/:idOrSlug
```

Resolução no componente/hook que hoje busca o lead por `id`: primeiro testa se `idOrSlug` casa
o formato UUID (regex já usada no repo em `whatsapp-templates`:
`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`); se sim, busca por `id`; se
não, busca por `slug`. Fallback: se a busca por slug não encontrar nada, 404 — não tenta
interpretar como id malformado.

## Call sites a migrar (levantados em `AUDITORIA-CRM-UI.md`, seção A3)

Todo `navigate(\`/leads/${id}\`)` no código deveria preferir `slug` quando disponível, mantendo
`id` como fallback (leads antigos sem backfill ainda). Pontos confirmados nesta auditoria:

- `src/pages/CRMPage.tsx`
- `src/pages/LeadProfilePage.tsx` (breadcrumb, self-link)
- `src/components/tasks/TaskRow.tsx`
- `src/hooks/useGoalsProgress.ts`
- `src/hooks/useBreadcrumbs.ts`
- `src/pages/InboxPage.tsx`
- `src/pages/ContactsPage.tsx`
- `src/pages/AutomationRunsPage.tsx`
- `src/pages/DuplicatesPage.tsx`
- `src/pages/TasksPage.tsx`

10 pontos — nenhum é mudança de lógica de negócio, só troca de qual campo vira parâmetro de URL.
Maior parte do esforço real está no backfill + na função de resolução da rota, não nesses 10 call
sites.

## Retrocompatibilidade

URLs antigas com UUID puro **continuam funcionando para sempre** — a rota aceita os dois formatos
simultaneamente, então nenhum link já compartilhado (WhatsApp, e-mail, favoritos) quebra. Não há
plano de desativar o UUID como formato válido.

## Riscos

- **Colisão de índice único durante backfill em lote**: se dois processos calcularem slug pro
  mesmo lead simultaneamente (retry de job, por exemplo), a constraint unique já protege contra
  duplicata — mas o job precisa tratar esse erro como "já tem slug, pula" em vez de falhar.
- **Nome com caracteres muito incomuns** (emoji, só números, string vazia) pode gerar slug vazio
  ou puramente numérico, colidindo em leitura com o padrão de detecção de UUID — o regex de
  detecção de UUID é estrito o suficiente (36 chars, hífens nas posições certas) para não
  confundir um slug curto, mas vale um teste unitário específico quando implementar.
- **O que fica quebrado se aplicar mal**: se a migration tornar `slug` `not null` antes do
  backfill completar, todo insert de lead novo sem lógica de geração de slug ainda implementada
  falha imediatamente — por isso a spec propõe nullable primeiro, not null só depois, em migration
  separada.

## Ordem de execução (quando Rael priorizar)

1. Migration da coluna (nullable + índice único parcial) — 🟠, aguarda aprovação.
2. Função/job de geração de slug (`slugify` + `shortHash`) + backfill em lote.
3. Migration tornando `not null` (só depois do backfill confirmado 100%).
4. Resolução de rota `/leads/:idOrSlug` no frontend.
5. Atualizar os 10 call sites para preferir `slug`.

Nada disso é implementado nesta rodada — spec fica pronta para quando Rael decidir priorizar.
