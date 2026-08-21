# UI-PATTERNS.md — padrões de interface do uPixel CRM

Regras de comportamento de UI que valem para o sistema todo. Não é guia de estilo
visual (cores, espaçamento) — é contrato de comportamento.

---

## 1. Modais de salvar / editar / excluir

**Regra:** o modal só fecha quando a operação deu certo.

1. Ação dispara (clique em Salvar / Confirmar / Excluir).
2. Handler chama o repo/hook e **aguarda** a resposta.
3. **Sucesso** → `toast.success` com mensagem clara **+ fecha o modal**.
4. **Erro** → `toast.error` com o `error.message` real **+ modal permanece aberto**,
   com os dados digitados intactos, para o usuário corrigir.
5. O botão de ação fica `disabled` com rótulo de progresso ("Salvando…") enquanto a
   requisição está em voo, evitando duplo-clique.

### Por quê

Fechar o modal no erro joga fora o que o usuário digitou. O toast vermelho aparece,
o formulário some, e não há como corrigir sem refazer tudo. É a diferença entre um
erro recuperável e uma tarefa perdida.

### Como a camada de dados coopera

Uma mutation que engole o erro e devolve `void` torna a regra impossível de aplicar —
o modal não tem como saber se deu certo. Por isso mutations do `AppContext` e dos
hooks devolvem sucesso:

- `Promise<boolean>` — `false` em erro (`updateLead`, `updateColumn`, `deleteColumn`,
  `moveLead`, `completeTask`, `updateTaskResult`, `updateTag`, `deleteTag`).
- `Promise<T | null>` — `null` em erro, quando o chamador também precisa do registro
  criado (`addLead`, `addTask`, `createTag`).

Quem mostra o toast é a camada que conhece o erro (context/hook). O modal só decide
se fecha.

### Exemplo

```tsx
const [saving, setSaving] = useState(false);

// UI-PATTERNS: erro mantém o modal aberto com o que foi digitado.
const handleSave = async () => {
  if (!name.trim() || saving) return;
  setSaving(true);
  const ok = await updateThing(id, { name: name.trim() });  // toast vive aqui dentro
  setSaving(false);
  if (!ok) return;          // erro: fica aberto
  onClose();                // sucesso: fecha
};

<DialogFooter>
  <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
  <Button onClick={handleSave} disabled={!name.trim() || saving}>
    {saving ? "Salvando..." : "Salvar"}
  </Button>
</DialogFooter>
```

### Operações em lote

Espera **todas** antes de anunciar, e conta o que de fato passou. Nunca dispare N
mutations sem `await` e anuncie sucesso em seguida — com falha parcial o número é
mentira. Em falha parcial, relate quantos passaram e **mantenha o modal aberto**
(ver `KanbanColumn.handleTransfer`).

### O que a regra NÃO cobre

- **Modais gerenciadores** (uma lista + um sub-modal de criar/editar: `TagsManager`,
  `CustomFieldsManager`, `CreateTagModal`). O painel principal fica aberto de
  propósito — quem segue a regra é o **sub-modal**.
- **Botões que navegam** para outra rota. Fechar o modal ali é correto e não depende
  de sucesso de escrita (ver as abas de atalho do `ColumnConfigModal`).

---

## 2. Ações destrutivas

Use `AlertDialog` do shadcn, não `window.confirm`. O `confirm` nativo bloqueia a
thread, ignora o tema e não é estilizável.

> Débito conhecido: `TagsManager` ainda usa `confirm()` para excluir tag.
> Ver `TODO-MODAL-PATTERN.md`.

---

## 3. Ações só-no-hover

Ação que só aparece em `group-hover:opacity-100` fica **inalcançável em touch** —
tablet não tem hover. Para ações destrutivas ou principais, mantenha visível (ou com
opacidade reduzida, não zero). Aceitável apenas para atalhos que têm outro caminho.

> Débito conhecido: ações do card do lead, editar/excluir tag, editar/excluir funil.
> Ver `TODO-MODAL-PATTERN.md`.

---

## 4. Escopo por tenant

Query ou insert em tabela multi-tenant usa **sempre** `resolveClientId()` de
`src/lib/tenant-utils.ts`, nunca `tenant?.id ?? user?.client_id` cru. No subdomínio
master o `TenantContext` seta a sentinela `tenant.id = "master"`, que não é UUID:
o padrão cru gera registro órfão ou erro 400 de cast.

Para colunas `uuid NOT NULL`, valide com `isValidUuid()` antes de consultar.

---

*Criado em 2026-08-21 no batch `[crm-B4]`.*
