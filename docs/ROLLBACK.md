# Runbook — Rollback & Disaster Recovery

**Atualizado:** 2026-06-10 (criado pelo Clean Up pré-produção)

## 1. Rollback do frontend (VPS)

O deploy (`deploy/deploy.sh`) faz swap atômico de `dist/`, mas **apaga o `.old`
logo em seguida** — não há cópia anterior no servidor. Rollback = rebuild do
commit anterior e redeploy:

```bash
# 1. Identifique o último commit bom
git log --oneline -10

# 2. Crie um checkout temporário nesse commit (não use reset na main)
git checkout <commit-bom>

# 3. Rebuild + deploy
npm ci && npm run build && npm run deploy

# 4. Volte para a main
git checkout main
```

Validação pós-rollback: abrir o app em aba anônima e conferir o hash do bundle
(`view-source` → `assets/index-*.js`) contra o build local.

> Melhoria pendente: manter `${DIST_PRIMARY}.old` por 24h em vez de apagar,
> permitindo rollback instantâneo com `mv`.

## 2. Rollback de migration (Supabase)

Migrations não têm `down` automático. Para reverter:

1. Escreva uma migration inversa (novo arquivo em `supabase/migrations/`) que
   desfaça o DDL — nunca edite uma migration já aplicada.
2. Aplique via `supabase db push` ou MCP `apply_migration`.
3. Rode os advisors (`get_advisors`) após aplicar.

## 3. Restore de dados (Supabase)

- **Backups automáticos:** o plano Pro do Supabase faz backup diário com
  retenção de 7 dias. Restore via Dashboard → Database → Backups.
- **PITR (point-in-time recovery):** disponível como add-on — recomendado
  para produção (RPO de minutos em vez de 24h).
- **Teste de restore:** agendar teste mensal restaurando o backup em um
  branch/projeto de staging e validando contagens das tabelas principais
  (`leads`, `conversations`, `messages`, `profiles`).

## 4. Outage do Supabase (plano B)

- Status: https://status.supabase.com
- O frontend continua serviável (estático no VPS), mas sem dados/auth.
- Não há réplica multi-região; aceitar o RTO do Supabase ou avaliar
  read-replica quando o volume justificar.

## 5. Contatos / acessos críticos

| Recurso | Onde |
|---|---|
| Projeto Supabase | `Upixel` (us-east-1) |
| VPS deploy | `deploy/deploy-local.sh` → SSH (`$UPIXEL_SSH_KEY`) |
| DNS / domínio | upixel.app |
| Meta App (WhatsApp/IG/FB) | developers.facebook.com |
