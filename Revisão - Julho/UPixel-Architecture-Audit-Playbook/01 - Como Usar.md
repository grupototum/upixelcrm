# Como usar este playbook

Este pacote organiza a auditoria técnica do UPixel CRM em uma sequência controlada. Execute um prompt por vez com o mesmo agente, preferencialmente Claude Opus, mantendo o repositório, a documentação e os relatórios anteriores disponíveis no contexto.

## Fluxo recomendado

1. Comece pelo Prompt 0 para mapear o sistema inteiro.
2. Execute os prompts de backend, dados, segurança e infraestrutura.
3. Só depois revise frontend e páginas.
4. Ao terminar cada auditoria, salve o relatório em Markdown.
5. Anexe o relatório anterior ao prompt seguinte.
6. Não implemente tudo de uma vez. Converta cada relatório em backlog priorizado.
7. Faça mudanças em branches separadas.
8. Exija testes, rollback e critérios de aceite antes de produção.

## Convenção de execução

Para cada prompt, forneça:

- acesso ao repositório
- documentação existente
- PDRs e diagramas
- variáveis de ambiente apenas em formato seguro e sem segredos
- relatório da etapa anterior
- descrição do ambiente atual
- limitações conhecidas

## Resultado esperado

Ao final, você terá:

- diagnóstico completo
- arquitetura alvo
- backlog priorizado
- roteiro de refatoração
- critérios de segurança
- plano de deploy
- revisão visual e funcional
- plano final página por página
