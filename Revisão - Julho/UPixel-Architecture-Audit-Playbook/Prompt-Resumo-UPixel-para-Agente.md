# PROMPT DE CONTEXTO PARA O AGENTE DE IA

Você vai assumir uma auditoria arquitetural completa do projeto **UPixel CRM**.

## Contexto resumido

O UPixel CRM é um sistema em produção do Grupo Totum. Ele foi construído de forma evolutiva e parte da implementação começou em Supabase Cloud, sendo posteriormente migrada para Supabase Self-Hosted em VPS. Existe a possibilidade de haver arquitetura híbrida, configurações antigas, documentação divergente, acoplamento entre camadas, regras de negócio espalhadas e decisões provisórias que se tornaram permanentes.

Repositório:
`https://github.com/grupototum/upixelcrm`

Referência de qualidade e refatoração:
`https://github.com/DietrichGebert/ponytail`

Agente recomendado:
Claude Opus.

## Objetivo

Executar uma auditoria completa, em etapas, para entender o estado atual, identificar riscos, propor a arquitetura mínima aceitável, definir a arquitetura recomendada e produzir um plano de implementação realista.

## Método

A auditoria será executada em 17 prompts, nesta ordem:

1. Auditoria Geral
2. API e Regras de Negócio
3. Banco de Dados e Storage
4. Autenticação e Permissões
5. Multi-Tenancy
6. Hosting e Deploy
7. Cloud e Compute
8. CI/CD e Versionamento
9. Segurança, TLS e Proteções de Borda
10. Rate Limiting
11. Cache e CDN
12. Load Balancing e Escalabilidade
13. Monitoramento, Logs e Observabilidade
14. Alta Disponibilidade e Disaster Recovery
15. Revisão Final de Banco de Dados
16. Frontend, UX e Design System
17. Revisão Página por Página

## Regras obrigatórias

- Leia integralmente o repositório.
- Leia toda a documentação anexada.
- Compare documentação com implementação.
- Identifique se o sistema usa Supabase Cloud, Self-Hosted ou ambos.
- Procure Skills, ferramentas, MCPs ou metodologias que possam melhorar cada auditoria.
- Pesquise práticas atuais de 2025–2026.
- Use fontes primárias e documentação oficial.
- Use Ponytail como referência de clareza, organização e refatoração.
- Não proponha complexidade sem necessidade.
- Justifique cada recomendação.
- Diferencie problema confirmado, risco provável, hipótese e oportunidade.
- Classifique cada recomendação por impacto, complexidade, risco e prioridade.
- Produza resumo executivo, gaps, riscos, arquitetura mínima, arquitetura recomendada, quick wins, roadmap, critérios de aceite e backlog.

## Forma de trabalho

Você receberá um playbook em arquivos Markdown. Execute um arquivo por vez. Não avance para a próxima etapa sem concluir o relatório da etapa atual. Salve cada relatório para ser anexado ao próximo prompt.

Comece pelo arquivo:

`02 - Prompt 0 - Auditoria Geral.md`
