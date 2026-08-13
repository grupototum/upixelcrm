# CHANGELOG — uPixel CRM

**Sistema:** Vibe Coding Totum v3.0
Formato: `[tipo] descrição — arquivo(s) afetado(s)`
Tipos: `feat` | `fix` | `refactor` | `docs` | `chore` | `perf` | `security`

---

## [Unreleased] — Branch: main

---

## 📅 2026-08-13 — Sessão: Auditoria de testes e correções (F1–F11)

Depois de lançar as features acima, rodamos uma auditoria de 181 casos de teste
no sistema já em produção, com 11 revisores automáticos lendo o código real e
testando ao vivo. Esta sessão corrige o que foi encontrado e é seguro de
corrigir sem mexer em permissões de acesso ou na estrutura do banco.

### ✅ Consertado
- `fix` Resultado de tarefa concluída sumia da tela depois de recarregar a página — o dado ficava salvo no banco, só não aparecia
- `fix` Registro de atividade do lead (timeline) podia falhar silenciosamente em qualquer tenant — corrigido o envio da identificação da empresa junto com o registro
- `fix` Concluir tarefa ou salvar resultado agora avisa quando algo dá errado, em vez de fechar a tela como se tivesse funcionado
- `fix` Limpar a descrição de uma etapa do funil, um telefone ou uma nota de contato não estava realmente apagando o valor no banco
- `fix` Link do WhatsApp duplicava o código do país (55) quando o número já vinha com ele — abria número errado
- `fix` Nome da empresa sumia do card do lead durante o arraste; leads sem responsável não mostravam mais o ícone de "sem responsável"
- `fix` Cancelar o arraste de um card (tecla Esc) deixava uma cópia fantasma grudada na tela
- `fix` Reordenar cards em colunas com muitos leads trocava o conteúdo do card em vez de mover ele (efeito visual errado)
- `fix` Clique duplo em "Criar Lead" podia criar o mesmo lead duas vezes
- `fix` Painel principal (Dashboard) não tinha como concluir uma tarefa direto por lá
- `fix` Meta individual de outro vendedor aparecia pra todo mundo no Dashboard
- `fix` Painel sem nenhuma meta configurada não mostrava um jeito fácil de criar uma

### 🧭 Pendências reportadas (viraram as próximas sessões)
- Qualquer usuário do time podia editar ou excluir etapas do funil, e editar tarefas de qualquer colega
- Botão de WhatsApp do card não usava os números extras cadastrados no lead
- Editar nota do lead direto na tela ("nota inline") nunca tinha sido implementada de verdade
- Carregar muitos leads em segundo plano podia desfazer uma ação que o usuário acabou de fazer

---

## 📅 2026-08-13 — Sessão: Contatos, telefones, campos e metas

### 🆕 Criado
- `feat` Cada lead agora pode ter vários contatos associados (decisor e atendente), com telefone e e-mail próprios
- `feat` Cada lead pode ter vários números de telefone, cada um com uma categoria (celular, fixo, WhatsApp, comercial)
- `feat` Novos campos de endereço no cadastro do lead: estado, bairro, endereço completo e CEP
- `feat` Painel de metas de vendas com acompanhamento no Dashboard
- `feat` Card do lead no funil redesenhado — mais informação visível de relance (empresa, responsável, última atividade)
- `feat` Tarefa concluída agora pode registrar um resultado (o que foi feito, resposta do cliente etc.)
- `feat` Etapas do funil podem ter uma descrição explicando o que significam, visível ao passar o mouse
- `feat` Arrastar um card até a borda do funil agora rola a tela automaticamente
- `perf` Funis com muitos leads carregam mais rápido — as colunas paginam em vez de carregar tudo de uma vez

---

## 📅 2026-06-10 — Sessão: Preparação para produção

### 🔒 Segurança
- `security` Arquivo com senhas de produção parou de ser rastreado pelo controle de versão
- `security` Fechada uma brecha que deixava qualquer pessoa não-logada ler segredos internos do sistema
- `security` Corrigidas 11 funções internas do banco que estavam mais abertas do que deveriam
- `security` Arquivos de mídia do WhatsApp deixaram de poder ser listados publicamente, e ganharam limite de tamanho
- `security` Ações de convidar/promover usuário em uma empresa agora conferem se a pessoa pertence mesmo àquela empresa
- `security` Atualizada uma biblioteca do sistema de rotas por causa de uma falha de segurança conhecida

### ✅ Consertado
- `fix` Verificação de tipos do código ativada por completo — 57 inconsistências corrigidas
- `fix` Erros que antes falhavam em silêncio agora avisam o usuário na tela
- `fix` Ações em massa (adicionar tag a vários leads) agora contam certo quantas falharam
- `fix` Filtro por campo personalizado do tipo "seleção" mostrava o valor bruto em vez do nome

### ⚡ Performance
- `perf` Regras de acesso ao banco otimizadas — consultas ficaram mais rápidas em telas com muitos registros
- `perf` Índices novos no banco para tarefas, histórico de atividade e etapas do funil

### 🧹 Organização
- `chore` Arquivos de marketing e documentação interna reorganizados fora da raiz do projeto
- `docs` Relatório de limpeza e manual de recuperação de desastre documentados
- `test` Testes automáticos cobrindo o isolamento de dados entre empresas (multi-tenant)

---

## 📅 2026-05-22 — Sessão: Funcionalidades do CRM e correções

### ✅ Consertado
- `fix` Botão "Enviar mensagem" no perfil do lead abria o inbox geral em vez da conversa certa
- `fix` Algumas integrações (WhatsApp, Facebook, Instagram) podiam criar registros perdidos quando o usuário master operava — corrigido em 5 pontos
- `fix` Um erro no banco bloqueava a criação de leads em certas automações
- `fix` Contador de mensagens não lidas usava a empresa errada em alguns casos
- `fix` Seletor de funil voltava sozinho pro funil principal, atrapalhando quem queria ficar em outro
- `fix` Corrigida uma tela que travava (erro de "funil não definido") no CRM
- `fix` Corrigida uma falha na identificação de telefones duplicados durante a importação

### 🔄 Alterado
- Grande limpeza de dados: leads, conversas e mensagens que estavam sem empresa definida foram realocados para a empresa certa
- Papel de acesso de um usuário corrigido; usuário que não trabalha mais no time foi removido
- Nome "Pipeline" trocado por "Funil de Vendas" em todo o sistema
- `perf` Removida uma verificação repetitiva a cada 60 segundos que não era mais necessária
- `perf` Trocar de funil não recarrega mais milhares de leads à toa
- `security` Cabeçalhos de segurança adicionados ao servidor
- `security` Sessão expira automaticamente após 30 minutos sem uso

### 🆕 Criado
- `feat` Seleção de vários leads ao mesmo tempo, com ações em massa (mover, excluir, marcar)
- `feat` Reordenar as etapas do funil arrastando pelo cabeçalho
- `feat` Painel exclusivo pra administradores verem todas as integrações de todas as empresas
- `feat` Botão para pausar/reativar o WhatsApp sem perder a configuração
- `feat` Trilha de navegação (breadcrumbs) em todas as páginas
- `feat` Importação de planilhas .xlsx, com sugestão automática do tipo de campo

---

## 📅 2026-05-10 — Sessão: Padronização do processo de desenvolvimento

### 🧹 Organização
- `docs` Documento de regras do projeto (CLAUDE.md) atualizado com checklist de saúde técnica e regras de segurança
- `docs` Relatório de auditoria de código morto, duplicação e complexidade documentado
- `docs` Lista de próximas melhorias priorizada por gravidade

---

## 📅 2026-05-07 — Sessão: Correção de isolamento entre empresas

### ✅ Consertado
- `fix` Identificação da empresa do usuário passou a vir da fonte correta (perfil salvo no banco, não de um dado que podia ser alterado no navegador) — corrige uma falha de isolamento entre empresas diferentes

---

*CHANGELOG.md — uPixel CRM — Vibe Coding Totum v3.0*
