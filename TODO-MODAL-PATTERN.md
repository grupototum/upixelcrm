# TODO-MODAL-PATTERN.md — backlog do padrão de modais

Regra em [docs/UI-PATTERNS.md](docs/UI-PATTERNS.md). Este arquivo lista o que **ainda
não** segue. Retro-fit da base inteira ficou fora do batch `[crm-B4]` de propósito —
seriam 54 arquivos com `DialogContent`.

## Já no padrão (batch `[crm-B4]`, 2026-08-21)

| Modal | O que foi corrigido |
|---|---|
| `LeadFormModal` | `submitting` nunca voltava em erro: botão travava e o modal ficava aberto para sempre. Agora `onSave` devolve boolean. |
| `TagsManager` (sub-dialog Nova/Editar Tag) | `setOpen(false)` incondicional — em erro o usuário perdia o formulário. |
| `ColumnConfigModal` | "Salvar Alterações" não fechava nem no sucesso; "Excluir Coluna" fechava mesmo quando o delete falhava. |
| `KanbanColumn` (Transferir leads) | Disparava N moves sem `await` e anunciava sucesso antes de qualquer resposta. |

## Já estavam corretos (auditados, sem mudança)

`AddTagModal`, `CreateTaskModal`, `MergeLeadsModal`.

## Fora do padrão — backlog

Ordenado por quanto o usuário perde quando dá erro.

| # | Modal | Problema | Peso |
|---|---|---|---|
| 1 | `ApiSettingsModal` | **Não auditado** — arquivo pertence ao ciclo `api_keys`, em andamento em sessão paralela. Auditar depois que aquele ciclo fechar. | ⚠️ |
| 2 | `CreateTagModal` | Sem estado de loading e sem `disabled` no botão Criar. Bloqueado pelo bug de fundo: `addGlobalTag` não persiste nada (ver `RELATORIO-CRM-BATCH-20260821.md`). | alto |
| 3 | `CustomFieldsManager` | Sub-dialog de criar campo — mesmo desenho do `TagsManager` antes do fix. | alto |
| 4 | `GoalFormDialog` | Formulário longo; fechar em erro custa caro. | alto |
| 5 | `ImportLeadsDialog` | Wizard multi-passo — precisa de regra própria para "erro no passo N". | alto |
| 6 | `BroadcastConfigModal`, `BroadcastModal`, `TemplateCreateModal`, `RechargeModal` | Módulo de disparo, não auditado. | médio |
| 7 | `AutomationEditModal`, `BotImportExportModal`, `SequencesTab`, `InstagramFunnelsTab` | Módulo de automações, não auditado. | médio |
| 8 | `CloudConnectModal`, `QuickConnectWizard` | Fluxo de conexão WhatsApp, não auditado. | médio |
| 9 | `WebhookSettingsModal`, `TemplatesManagerModal`, `AgentsTab`, `OrganizationSection`, `GmailTab`, `TagRulesConfig` | Não auditados. | baixo |
| 10 | Dialogs inline em páginas (`CRMPage`, `LeadProfilePage`, `UsersPage`, `TasksPage`, `InboxPage`, `GoalsConfigPage`, `ImportPage`, `DuplicatesPage`, `SavedMessagesPage`, `InstagramPage`, `GooglePage`, `AutomationsPage`, `ImportHistoryPage`) | Não auditados. | baixo |

## Outros débitos de UI levantados na auditoria

| Item | Onde |
|---|---|
| `window.confirm` em vez de `AlertDialog` | `TagsManager.tsx` (excluir tag), `ColumnConfigModal.tsx` (excluir coluna) |
| Ação só-no-hover, inalcançável em touch | `SortableLeadCard.tsx:142` (WhatsApp/Ações de Tempo), `TagsManager.tsx:153` (editar/excluir tag), `CRMPage.tsx:522,529` (editar/excluir funil), `CreateTagModal.tsx:77` (remover tag) |
| Board sem breakpoint responsivo | `CRMPage.tsx:637` — `w-72 shrink-0` sem caminho `md:` |
| Densidade visual inconsistente | `LeadProfilePage` — "Campos Personalizados" (`DynamicFieldRenderer`) vs "Informações de contato" (`EditableDataRow`) |

## Mutations que ainda devolvem `void`

Aplicar o padrão nelas exige devolver sucesso primeiro. Já convertidas: `updateLead`,
`updateColumn`, `deleteColumn`, `moveLead`. Faltam, no `AppContext`:

`addPipeline`, `deleteLead`, `moveLeadToPipeline`, `mergeLeads`, `updateTask`,
`deleteTask`, `toggleTaskStatus`, `addColumn`, `reorderColumns`, `addTimelineEvent`.

---

*Criado em 2026-08-21 no batch `[crm-B4]`.*
