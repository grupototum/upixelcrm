# Ambiente de dry-run — decisão registrada

**Data:** 2026-08-21

## Decisão (Ajuste 2 revisado pelo Rael)

Rael decidiu rodar a Correção 0 (PC-040) **direto contra o Cloud `xusdhzwfkzufupjwbebt`**,
não contra `supa.grupototum.com` (self-hosted, Coolify/Hostinger).

## Por quê

`supa.grupototum.com` não tem o schema do upixel replicado, e as 36 (agora 20 — ver
`PC-040-RECONCILIACAO.md`) migrations órfãs só existem na tabela de histórico do Cloud.
Um dry-run contra o self-hosted não revelaria nada sobre esse conflito específico —
setup de MCP self-hosted foi descartado por não valer o tempo agora.

## Acesso usado nesta sessão

Via `.mcp.json` do repo:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=xusdhzwfkzufupjwbebt&features=docs,account,database,debugging,development,functions,storage,branching"
    }
  }
}
```

É o conector MCP **oficial hospedado pela Supabase** (`mcp.supabase.com`), escopado ao
projeto `xusdhzwfkzufupjwbebt` via OAuth — não uma credencial estática visível nesta sessão
ou embutida no repo. Detalhe completo e classificação de risco em `RELATORIO-BATCH-20260821.md`
(seção Correção 2).

## Ferramentas usadas nesta rodada

Só leitura: `execute_sql` com `SELECT` (schema, policies, contagens, samples). Nenhuma
`INSERT`/`UPDATE`/`DELETE`/`DDL`, nenhum `apply_migration`, nenhum `create_branch`/`reset_branch`
foi chamado.
